const express = require('express');
const { param, query, validationResult } = require('express-validator');
const { Notification } = require('../../../models');
const asyncHandler = require('../../../utils/asyncHandler');
const { authV2 } = require('../middleware/auth');
const { ok, fail } = require('../utils/response');

const router = express.Router();
const DEFAULT_PAGE_SIZE = 25;
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
  '/',
  [
    authV2,
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());

    const { page, pageSize, offset } = getPagination(req);
    const where = { userId: req.v2User.id };
    const [notifications, total] = await Promise.all([
      Notification.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: pageSize,
        offset
      }),
      Notification.count({ where })
    ]);

    return ok(res, { notifications }, { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  })
);

router.get('/unread-count', authV2, asyncHandler(async (req, res) => {
  const count = await Notification.count({
    where: { userId: req.v2User.id, isRead: false }
  });
  return ok(res, { count });
}));

router.patch(
  '/:id/read',
  [authV2, param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());

    const notification = await Notification.findByPk(req.params.id);
    if (!notification || notification.userId !== req.v2User.id) {
      return fail(res, 404, 'notification_not_found', 'Notification not found');
    }

    await notification.update({ isRead: true });
    return ok(res, { notification });
  })
);

router.patch('/read-all', authV2, asyncHandler(async (req, res) => {
  const [updated] = await Notification.update(
    { isRead: true },
    { where: { userId: req.v2User.id, isRead: false } }
  );

  return ok(res, { updated });
}));

module.exports = router;
