const express = require('express');
const { Op } = require('sequelize');
const { body, param, query, validationResult } = require('express-validator');
const { GroupThread, GroupMember, GroupMessage, User, Project, Quote } = require('../models');
const { auth } = require('../middleware/auth');
const { upload, DEFAULT_ATTACHMENT_BODY } = require('../utils/upload');
const asyncHandler = require('../utils/asyncHandler');
const { createPaginationHelpers } = require('../utils/pagination');
const { attachGroupThreadSummaries } = require('../utils/threadSummaries');

const router = express.Router();
const senderAttributes = ['id', 'name', 'email', 'role'];
const threadUserAttributes = ['id', 'name', 'email', 'role'];
const projectThreadAttributes = ['id', 'title', 'location', 'status', 'quoteId', 'clientId', 'assignedManagerId'];
const quoteThreadAttributes = ['id', 'projectType', 'location', 'status', 'clientId', 'assignedManagerId'];
const MAX_PAGE_SIZE = 100;
const { getPagination, encodeCursor, getCursorPagination } = createPaginationHelpers({
  defaultPageSize: 20,
  maxPageSize: MAX_PAGE_SIZE
});

const threadIncludes = [
  { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
  { model: Quote, as: 'quote', attributes: quoteThreadAttributes },
  { model: Project, as: 'project', attributes: projectThreadAttributes },
  {
    model: GroupMember,
    as: 'members',
    include: [{ model: User, as: 'user', attributes: threadUserAttributes }]
  }
];

const formatMessageWithSender = (message, user) => ({
  ...message.toJSON(),
  sender: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  }
});

const STAFF_ROLES = new Set(['employee', 'manager', 'admin']);

const isStaffUser = (user) => STAFF_ROLES.has(String(user?.role || '').toLowerCase());

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
            include: threadIncludes
          }
        ],
        order: [[{ model: GroupThread, as: 'thread' }, 'updatedAt', 'DESC']],
        limit: pageSize,
        offset
      }),
      GroupMember.count({ where })
    ]);

    const threads = memberships
      .map((membership) => (membership.thread ? serializeThread(membership.thread, req.user.id) : null))
      .filter(Boolean);
    const summarizedThreads = await attachGroupThreadSummaries({
      threads,
      GroupMessage,
      User,
      senderAttributes
    });
    return res.json({
      threads: summarizedThreads,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  })
);

// Create a new project chat thread and optionally seed members
router.post(
  '/threads',
  [
    auth,
    body('projectId').isUUID(),
    body('name').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 160 }),
    body('participantUserIds').optional().isArray({ max: 12 }),
    body('participantUserIds.*').optional().isUUID(),
    body('includeProjectClient').optional().isBoolean(),
    body('includeAssignedStaff').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!isStaffUser(req.user)) {
      return res.status(403).json({ error: 'Only staff can create project chat threads' });
    }

    const project = await Project.findByPk(req.body.projectId, {
      include: [{ model: Quote, as: 'quote', attributes: quoteThreadAttributes }]
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const includeProjectClient = Object.hasOwn(req.body, 'includeProjectClient')
      ? Boolean(req.body.includeProjectClient)
      : true;
    const includeAssignedStaff = Object.hasOwn(req.body, 'includeAssignedStaff')
      ? Boolean(req.body.includeAssignedStaff)
      : true;

    const seedMemberIds = new Set();
    if (includeProjectClient && project.clientId) seedMemberIds.add(project.clientId);
    if (includeAssignedStaff && project.assignedManagerId) seedMemberIds.add(project.assignedManagerId);
    for (const userId of req.body.participantUserIds || []) {
      if (userId) seedMemberIds.add(userId);
    }
    seedMemberIds.delete(req.user.id);

    const memberCandidates = Array.from(seedMemberIds);
    let users = [];
    if (memberCandidates.length) {
      users = await User.findAll({
        where: {
          id: { [Op.in]: memberCandidates },
          isActive: true
        },
        attributes: threadUserAttributes
      });
      const foundIds = new Set(users.map((user) => user.id));
      const missingIds = memberCandidates.filter((userId) => !foundIds.has(userId));
      if (missingIds.length) {
        return res.status(404).json({ error: 'One or more invited users were not found' });
      }
    }

    const thread = await GroupThread.create({
      name: String(req.body.name || '').trim() || `${project.title} Project Chat`,
      quoteId: project.quoteId || null,
      projectId: project.id,
      createdBy: req.user.id
    });

    await GroupMember.create({
      groupThreadId: thread.id,
      userId: req.user.id,
      role: 'admin'
    });

    if (users.length) {
      await GroupMember.bulkCreate(
        users.map((user) => ({
          groupThreadId: thread.id,
          userId: user.id,
          role: 'member'
        }))
      );
    }

    const createdThread = await GroupThread.findByPk(thread.id, {
      include: threadIncludes
    });

    const [summarizedThread] = await attachGroupThreadSummaries({
      threads: [serializeThread(createdThread, req.user.id)],
      GroupMessage,
      User,
      senderAttributes
    });

    return res.status(201).json({ thread: summarizedThread });
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
      const nextCursor = hasMore && messages.length ? encodeCursor(messages.at(-1)) : null;

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

router.delete(
  '/threads/:id/members/:userId',
  [auth, param('id').isUUID(), param('userId').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const membership = await GroupMember.findOne({
      where: { groupThreadId: req.params.id, userId: req.user.id }
    });

    if (membership?.role !== 'admin') {
      return res.status(403).json({ error: 'Only group admins can remove members' });
    }

    const targetMembership = await GroupMember.findOne({
      where: { groupThreadId: req.params.id, userId: req.params.userId }
    });

    if (!targetMembership) {
      return res.status(404).json({ error: 'Member not found in this thread' });
    }

    if (targetMembership.role === 'admin') {
      const adminCount = await GroupMember.count({
        where: {
          groupThreadId: req.params.id,
          role: 'admin'
        }
      });

      if (adminCount <= 1) {
        return res.status(409).json({ error: 'Thread must keep at least one admin' });
      }
    }

    await targetMembership.destroy();
    return res.json({ message: 'Member removed' });
  })
);

module.exports = router;
