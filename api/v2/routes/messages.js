const express = require('express');
const { Op } = require('sequelize');
const { body, param, query, validationResult } = require('express-validator');
const { GroupMember, GroupMessage, GroupThread, Project, Quote, User } = require('../../../models');
const { upload, DEFAULT_ATTACHMENT_BODY } = require('../../../utils/upload');
const asyncHandler = require('../../../utils/asyncHandler');
const { authV2 } = require('../middleware/auth');
const { ok, fail } = require('../utils/response');
const { attachGroupThreadSummaries } = require('../../../utils/threadSummaries');

const router = express.Router();
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const senderAttributes = ['id', 'name', 'email', 'role'];
const threadUserAttributes = ['id', 'name', 'email', 'role'];
const projectThreadAttributes = ['id', 'title', 'location', 'status', 'quoteId', 'clientId', 'assignedManagerId'];
const quoteThreadAttributes = ['id', 'projectType', 'location', 'status', 'clientId', 'assignedManagerId'];

const threadIncludes = [
  { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
  { model: Quote, as: 'quote', attributes: quoteThreadAttributes, required: false },
  { model: Project, as: 'project', attributes: projectThreadAttributes, required: false },
  {
    model: GroupMember,
    as: 'members',
    required: false,
    include: [{ model: User, as: 'user', attributes: threadUserAttributes }]
  }
];

const getPagination = (req) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE));
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize
  };
};

const encodeCursor = (message) =>
  Buffer.from(`${new Date(message.createdAt).toISOString()}|${message.id}`, 'utf8').toString('base64url');

const decodeCursor = (rawCursor) => {
  if (!rawCursor) return null;

  try {
    const decoded = Buffer.from(String(rawCursor), 'base64url').toString('utf8');
    const [createdAtRaw, id] = decoded.split('|');
    const createdAt = new Date(createdAtRaw);
    if (!id || Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id };
  } catch (_error) {
    return null;
  }
};

const getCursorPagination = (req) => {
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE));
  const cursor = decodeCursor(req.query.cursor);
  if (req.query.cursor && !cursor) {
    return { error: 'Invalid cursor' };
  }

  return {
    mode: req.query.cursor || typeof req.query.limit !== 'undefined' ? 'cursor' : 'legacy',
    limit,
    cursor
  };
};

const getCurrentMembershipRole = (thread, userId) =>
  thread?.members?.find((member) => member.userId === userId)?.role || null;

const serializeThread = (thread, userId) => {
  const payload = thread?.toJSON ? thread.toJSON() : thread;
  return {
    ...payload,
    memberCount: Array.isArray(payload?.members) ? payload.members.length : 0,
    currentUserMembershipRole: getCurrentMembershipRole(payload, userId)
  };
};

const formatMessageWithSender = (message, user) => ({
  ...(message?.toJSON ? message.toJSON() : message),
  sender: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  }
});

router.get(
  '/threads',
  [
    authV2,
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());

    const { page, pageSize, offset } = getPagination(req);
    const [memberships, total] = await Promise.all([
      GroupMember.findAll({
        where: { userId: req.v2User.id },
        include: [{ model: GroupThread, as: 'thread', include: threadIncludes }],
        order: [[{ model: GroupThread, as: 'thread' }, 'updatedAt', 'DESC']],
        limit: pageSize,
        offset
      }),
      GroupMember.count({ where: { userId: req.v2User.id } })
    ]);

    const threads = memberships
      .map((membership) => (membership.thread ? serializeThread(membership.thread, req.v2User.id) : null))
      .filter(Boolean);
    const summarizedThreads = await attachGroupThreadSummaries({
      threads,
      GroupMessage,
      User,
      senderAttributes
    });
    return ok(res, { threads: summarizedThreads }, { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  })
);

router.get(
  '/threads/:id/messages',
  [
    authV2,
    param('id').isUUID(),
    query('cursor').optional().isString().isLength({ min: 8, max: 400 }),
    query('limit').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());

    const membership = await GroupMember.findOne({
      where: { groupThreadId: req.params.id, userId: req.v2User.id }
    });
    if (!membership) return fail(res, 403, 'access_denied', 'Access denied');

    const thread = await GroupThread.findByPk(req.params.id, {
      include: threadIncludes
    });
    if (!thread) return fail(res, 404, 'thread_not_found', 'Thread not found');

    const serializedThread = serializeThread(thread, req.v2User.id);

    const cursorPaging = getCursorPagination(req);
    if (cursorPaging.error) {
      return fail(res, 400, 'validation_failed', cursorPaging.error);
    }

    const where = { groupThreadId: req.params.id };
    if (cursorPaging.mode === 'cursor') {
      if (cursorPaging.cursor) {
        where[Op.or] = [
          { createdAt: { [Op.lt]: cursorPaging.cursor.createdAt } },
          {
            createdAt: cursorPaging.cursor.createdAt,
            id: { [Op.lt]: cursorPaging.cursor.id }
          }
        ];
      }

      const rows = await GroupMessage.findAll({
        where,
        include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email', 'role'] }],
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
        limit: cursorPaging.limit + 1
      });

      const hasMore = rows.length > cursorPaging.limit;
      const messages = hasMore ? rows.slice(0, cursorPaging.limit) : rows;
      const nextCursor = hasMore && messages.length ? encodeCursor(messages[messages.length - 1]) : null;

      return ok(res, { thread: serializedThread, messages }, { mode: 'cursor', limit: cursorPaging.limit, nextCursor });
    }

    const { page, pageSize, offset } = getPagination(req);
    const [messages, total] = await Promise.all([
      GroupMessage.findAll({
        where,
        include: [{ model: User, as: 'sender', attributes: senderAttributes }],
        order: [['createdAt', 'ASC']],
        limit: pageSize,
        offset
      }),
      GroupMessage.count({ where: { groupThreadId: req.params.id } })
    ]);

    return ok(res, { thread: serializedThread, messages }, { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  })
);

router.post(
  '/threads/:id/messages',
  [authV2, param('id').isUUID(), body('body').trim().notEmpty()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());

    const membership = await GroupMember.findOne({
      where: { groupThreadId: req.params.id, userId: req.v2User.id }
    });
    if (!membership) return fail(res, 403, 'access_denied', 'Access denied');

    const message = await GroupMessage.create({
      groupThreadId: req.params.id,
      senderId: req.v2User.id,
      body: String(req.body.body || '').trim(),
      attachments: []
    });

    return ok(res, { message: formatMessageWithSender(message, req.v2User) }, {}, 201);
  })
);

router.post(
  '/threads/:id/messages/upload',
  [authV2, param('id').isUUID(), upload.array('files', 5)],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());

    const membership = await GroupMember.findOne({
      where: { groupThreadId: req.params.id, userId: req.v2User.id }
    });
    if (!membership) return fail(res, 403, 'access_denied', 'Access denied');

    const files = req.files || [];
    const bodyText = String(req.body.body || '').trim() || (files.length ? DEFAULT_ATTACHMENT_BODY(files.length) : '');
    if (!bodyText && !files.length) {
      return fail(res, 400, 'empty_message', 'Provide a message body or at least one file');
    }

    const attachments = files.map((file) => ({
      name: file.originalname,
      url: `/uploads/${file.filename}`,
      size: file.size,
      mimeType: file.mimetype
    }));

    const message = await GroupMessage.create({
      groupThreadId: req.params.id,
      senderId: req.v2User.id,
      body: bodyText,
      attachments
    });

    return ok(res, { message: formatMessageWithSender(message, req.v2User) }, {}, 201);
  })
);

module.exports = router;
