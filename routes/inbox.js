const express = require('express');
const { Op } = require('sequelize');
const { body, query, validationResult, param } = require('express-validator');
const { InboxThread, InboxMessage, User } = require('../models');
const { auth } = require('../middleware/auth');
const { upload, DEFAULT_ATTACHMENT_BODY } = require('../utils/upload');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

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

    const where = {
      [Op.or]: [{ participantAId: req.user.id }, { participantBId: req.user.id }]
    };
    const { page, pageSize, offset } = getPagination(req);
    const [threads, total] = await Promise.all([
      InboxThread.findAll({
        where,
        include: [
          { model: User, as: 'participantA', attributes: ['id', 'name', 'email'] },
          { model: User, as: 'participantB', attributes: ['id', 'name', 'email'] }
        ],
        order: [['updatedAt', 'DESC']],
        limit: pageSize,
        offset
      }),
      InboxThread.count({ where })
    ]);

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

router.post(
  '/threads',
  [auth, body('recipientUserId').isUUID(), body('subject').trim().notEmpty(), body('body').trim().notEmpty()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { recipientUserId, subject, body: messageBody, quoteId } = req.body;

    if (recipientUserId === req.user.id) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }

    const recipient = await User.findByPk(recipientUserId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const [participantAId, participantBId] = [req.user.id, recipientUserId].sort();

    const [thread] = await InboxThread.findOrCreate({
      where: {
        participantAId,
        participantBId,
        ...(quoteId ? { quoteId } : {})
      },
      defaults: {
        participantAId,
        participantBId,
        subject,
        quoteId: quoteId || null
      }
    });

    const message = await InboxMessage.create({
      threadId: thread.id,
      senderId: req.user.id,
      recipientId: recipientUserId,
      body: messageBody
    });

    return res.status(201).json({ thread, message });
  })
);

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

    const thread = await InboxThread.findByPk(req.params.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    if (thread.participantAId !== req.user.id && thread.participantBId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const cursorPaging = getCursorPagination(req);
    if (cursorPaging.error) {
      return res.status(400).json({ error: cursorPaging.error });
    }

    const where = { threadId: thread.id };
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

      const rows = await InboxMessage.findAll({
        where,
        include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email'] }],
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
      InboxMessage.findAll({
        where,
        include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email'] }],
        order: [['createdAt', 'ASC']],
        limit: pageSize,
        offset
      }),
      InboxMessage.count({ where })
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

router.post('/threads/:id/messages', [auth, param('id').isUUID(), body('body').trim().notEmpty()], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const thread = await InboxThread.findByPk(req.params.id);
  if (!thread) {
    return res.status(404).json({ error: 'Thread not found' });
  }

  if (thread.participantAId !== req.user.id && thread.participantBId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const recipientId = thread.participantAId === req.user.id ? thread.participantBId : thread.participantAId;

  const message = await InboxMessage.create({
    threadId: thread.id,
    senderId: req.user.id,
    recipientId,
    body: req.body.body
  });

  return res.status(201).json({ message });
}));

router.patch('/messages/:id/read', [auth, param('id').isUUID()], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const message = await InboxMessage.findByPk(req.params.id);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  if (message.recipientId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  await message.update({ isRead: true });
  return res.json({ message: 'Message marked as read' });
}));

router.post(
  '/threads/:id/messages/upload',
  [auth, param('id').isUUID()],
  upload.array('files', 5),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const thread = await InboxThread.findByPk(req.params.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    if (thread.participantAId !== req.user.id && thread.participantBId !== req.user.id) {
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

    const recipientId = thread.participantAId === req.user.id ? thread.participantBId : thread.participantAId;

    const message = await InboxMessage.create({
      threadId: thread.id,
      senderId: req.user.id,
      recipientId,
      body: bodyText,
      attachments
    });

    return res.status(201).json({ message });
  })
);

module.exports = router;
