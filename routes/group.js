const express = require('express');
const { Op } = require('sequelize');
const { body, param, query, validationResult } = require('express-validator');
const { GroupThread, GroupMember, GroupMessage, User } = require('../models');
const { auth } = require('../middleware/auth');
const { upload, DEFAULT_ATTACHMENT_BODY } = require('../utils/upload');
const asyncHandler = require('../utils/asyncHandler');
const { createPaginationHelpers } = require('../utils/pagination');

const router = express.Router();
const senderAttributes = ['id', 'name', 'email', 'role'];
const MAX_PAGE_SIZE = 100;
const { getPagination, encodeCursor, getCursorPagination } = createPaginationHelpers({
  defaultPageSize: 20,
  maxPageSize: MAX_PAGE_SIZE
});

const formatMessageWithSender = (message, user) => ({
  ...message.toJSON(),
  sender: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  }
});

// List group threads the current user is a member of
router.get(
  '/threads',
  [
    auth,
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const where = { userId: req.user.id };
    const { page, pageSize, offset } = getPagination(req);
    const [memberships, total] = await Promise.all([
      GroupMember.findAll({
        where,
        include: [
          {
            model: GroupThread,
            as: 'thread',
            include: [
              { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
              { model: GroupMember, as: 'members', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }] }
            ]
          }
        ],
        order: [[{ model: GroupThread, as: 'thread' }, 'updatedAt', 'DESC']],
        limit: pageSize,
        offset
      }),
      GroupMember.count({ where })
    ]);

    const threads = memberships.map((m) => m.thread).filter(Boolean);
    return res.json({
      threads,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  })
);

// Get messages in a group thread
router.get(
  '/threads/:id/messages',
  [
    auth,
    param('id').isUUID(),
    query('cursor').optional().isString().isLength({ min: 8, max: 400 }),
    query('limit').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const membership = await GroupMember.findOne({
      where: { groupThreadId: req.params.id, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const thread = await GroupThread.findByPk(req.params.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const cursorPaging = getCursorPagination(req);
    if (cursorPaging.error) {
      return res.status(400).json({ error: cursorPaging.error });
    }

    const where = { groupThreadId: thread.id };
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
        include: [{ model: User, as: 'sender', attributes: senderAttributes }],
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
        limit: cursorPaging.limit + 1
      });

      const hasMore = rows.length > cursorPaging.limit;
      const messages = hasMore ? rows.slice(0, cursorPaging.limit) : rows;
      const nextCursor = hasMore && messages.length ? encodeCursor(messages[messages.length - 1]) : null;

      return res.json({
        thread,
        messages,
        meta: {
          mode: 'cursor',
          limit: cursorPaging.limit,
          nextCursor
        }
      });
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
      GroupMessage.count({ where })
    ]);

    return res.json({
      thread,
      messages,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  })
);

// Send a text message to a group thread
router.post(
  '/threads/:id/messages',
  [auth, param('id').isUUID(), body('body').trim().notEmpty()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const membership = await GroupMember.findOne({
      where: { groupThreadId: req.params.id, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const message = await GroupMessage.create({
      groupThreadId: req.params.id,
      senderId: req.user.id,
      body: req.body.body,
      attachments: []
    });

    return res.status(201).json({ message: formatMessageWithSender(message, req.user) });
  })
);

// Send a message with file attachment(s) to a group thread
router.post(
  '/threads/:id/messages/upload',
  [auth, param('id').isUUID()],
  upload.array('files', 5),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const membership = await GroupMember.findOne({
      where: { groupThreadId: req.params.id, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const files = req.files || [];
    const bodyText = String(req.body.body || '').trim() || (files.length ? DEFAULT_ATTACHMENT_BODY(files.length) : '');

    if (!bodyText && !files.length) {
      return res.status(400).json({ error: 'Provide a message body or at least one file' });
    }

    const attachments = files.map((f) => ({
      name: f.originalname,
      url: `/uploads/${f.filename}`,
      size: f.size,
      mimeType: f.mimetype
    }));

    const message = await GroupMessage.create({
      groupThreadId: req.params.id,
      senderId: req.user.id,
      body: bodyText,
      attachments
    });

    return res.status(201).json({ message: formatMessageWithSender(message, req.user) });
  })
);

// Add a member to a group thread (manager/admin only)
router.post(
  '/threads/:id/members',
  [auth, param('id').isUUID(), body('userId').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const membership = await GroupMember.findOne({
      where: { groupThreadId: req.params.id, userId: req.user.id }
    });

    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only group admins can add members' });
    }

    const targetUser = await User.findByPk(req.body.userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existing = await GroupMember.findOne({
      where: { groupThreadId: req.params.id, userId: req.body.userId }
    });

    if (existing) {
      return res.status(409).json({ error: 'User is already a member' });
    }

    const member = await GroupMember.create({
      groupThreadId: req.params.id,
      userId: req.body.userId,
      role: 'member'
    });

    return res.status(201).json({ member });
  })
);

module.exports = router;
