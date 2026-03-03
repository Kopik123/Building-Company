const express = require('express');
const { param, validationResult } = require('express-validator');
const { Notification } = require('../models');
const { auth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', auth, asyncHandler(async (req, res) => {
  const notifications = await Notification.findAll({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']],
    limit: 100
  });

  return res.json({ notifications });
}));

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
