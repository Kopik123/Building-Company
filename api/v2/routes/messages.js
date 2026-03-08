const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { GroupMember, GroupMessage, GroupThread, User } = require('../../../models');
const { upload, DEFAULT_ATTACHMENT_BODY } = require('../../../utils/upload');
const asyncHandler = require('../../../utils/asyncHandler');
const { authV2 } = require('../middleware/auth');
const { ok, fail } = require('../utils/response');

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
        include: [{ model: GroupThread, as: 'thread' }],
        order: [['createdAt', 'DESC']],
        limit: pageSize,
        offset
      }),
      GroupMember.count({ where: { userId: req.v2User.id } })
    ]);

    const threads = memberships.map((membership) => membership.thread).filter(Boolean);
    return ok(res, { threads }, { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  })
);

router.get(
  '/threads/:id/messages',
  [
    authV2,
    param('id').isUUID(),
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

    const { page, pageSize, offset } = getPagination(req);
    const [messages, total] = await Promise.all([
      GroupMessage.findAll({
        where: { groupThreadId: req.params.id },
        include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email', 'role'] }],
        order: [['createdAt', 'ASC']],
        limit: pageSize,
        offset
      }),
      GroupMessage.count({ where: { groupThreadId: req.params.id } })
    ]);

    return ok(res, { messages }, { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
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

    return ok(res, { message }, {}, 201);
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

    return ok(res, { message }, {}, 201);
  })
);

module.exports = router;
