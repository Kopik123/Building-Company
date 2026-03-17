const express = require('express');
const { param, query, validationResult } = require('express-validator');
const { Notification } = require('../models');
const { auth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { createPaginationHelpers } = require('../utils/pagination');

const router = express.Router();
const MAX_PAGE_SIZE = 100;
const { getPagination, paginationDto } = createPaginationHelpers({
  defaultPageSize: 25,
  maxPageSize: MAX_PAGE_SIZE
});

router.get(
  '/',
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

    const { page, pageSize, offset } = getPagination(req);
    const where = { userId: req.user.id };
    const [notifications, total] = await Promise.all([
      Notification.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: pageSize,
        offset
      }),
      Notification.count({ where })
    ]);

    return res.json({
      notifications,
      pagination: paginationDto(page, pageSize, total)
    });
  })
);

router.get('/unread-count', auth, asyncHandler(async (req, res) => {
  const count = await Notification.count({
    where: { userId: req.user.id, isRead: false }
  });

  return res.json({ count });
}));

router.patch(
  '/:id/read',
  [auth, param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const notification = await Notification.findByPk(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await notification.update({ isRead: true });
    return res.json({ message: 'Notification marked as read' });
  })
);

router.patch('/read-all', auth, asyncHandler(async (req, res) => {
  await Notification.update(
    { isRead: true },
    { where: { userId: req.user.id, isRead: false } }
  );

  return res.json({ message: 'All notifications marked as read' });
}));

module.exports = router;
