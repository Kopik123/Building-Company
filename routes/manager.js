const express = require('express');
const { Op } = require('sequelize');
const { body, param, query, validationResult } = require('express-validator');
const { Quote, User, GroupThread, GroupMember, Notification } = require('../models');
const { auth, roleCheck } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const managerGuard = [auth, roleCheck('manager', 'admin')];

router.post(
  '/staff',
  [
    ...managerGuard,
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().notEmpty(),
    body('role').isIn(['employee', 'manager']),
    body('phone').optional().trim()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, phone, role } = req.body;

    // Only admins can create managers
    if (role === 'manager' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create manager accounts' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = await User.create({ email, password, name, phone: phone || null, role });
    return res.status(201).json({ user });
  })
);

router.post(
  '/quotes/:id/accept',
  [...managerGuard, param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const quote = await Quote.findByPk(req.params.id, {
      include: [{ model: User, as: 'client', attributes: ['id', 'name', 'email'] }]
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (quote.assignedManagerId) {
      return res.status(409).json({ error: 'Quote is already assigned to a manager' });
    }

    await quote.update({
      assignedManagerId: req.user.id,
      status: 'in_progress'
    });

    // Create a group chat for this project
    const projectName = `${quote.projectType} – ${quote.guestName || (quote.client && quote.client.name) || 'Project'} (${quote.postcode || quote.location})`;

    const groupThread = await GroupThread.create({
      name: projectName,
      quoteId: quote.id,
      createdBy: req.user.id
    });

    // Add the manager to the group
    await GroupMember.create({
      groupThreadId: groupThread.id,
      userId: req.user.id,
      role: 'admin'
    });

    // Add the client to the group (if they have an account)
    if (quote.clientId) {
      await GroupMember.create({
        groupThreadId: groupThread.id,
        userId: quote.clientId,
        role: 'member'
      });
    }

    // Notify managers that this quote was accepted
    const otherManagers = await User.findAll({
      where: { role: ['manager', 'admin'], isActive: true, id: { [Op.ne]: req.user.id } }
    });

    await Promise.all(
      otherManagers.map((m) =>
        Notification.create({
          userId: m.id,
          type: 'quote_accepted',
          title: `Quote accepted by ${req.user.name}`,
          body: `Manager ${req.user.name} accepted the quote for "${projectName}".`,
          quoteId: quote.id,
          data: { quoteId: quote.id, managerId: req.user.id, groupThreadId: groupThread.id }
        })
      )
    );

    return res.status(201).json({ quote, groupThread });
  })
);

router.get(
  '/quotes',
  [
    ...managerGuard,
    query('status').optional().isIn(['pending', 'in_progress', 'responded', 'closed']),
    query('priority').optional().isIn(['low', 'medium', 'high']),
    query('projectType').optional().isIn(['bathroom', 'kitchen', 'interior', 'tiling', 'extension', 'joinery', 'rendering', 'decorating', 'other'])
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.priority) where.priority = req.query.priority;
    if (req.query.projectType) where.projectType = req.query.projectType;

    const quotes = await Quote.findAll({
      where,
      include: [
        { model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone'] },
        { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.json({ quotes });
  })
);

router.get(
  '/quotes/:id',
  [...managerGuard, param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const quote = await Quote.findByPk(req.params.id, {
      include: [
        { model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone'] },
        { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    return res.json({ quote });
  })
);

router.patch(
  '/quotes/:id',
  [
    ...managerGuard,
    param('id').isUUID(),
    body('status').optional().isIn(['pending', 'in_progress', 'responded', 'closed']),
    body('priority').optional().isIn(['low', 'medium', 'high'])
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const quote = await Quote.findByPk(req.params.id);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const payload = {};
    if (req.body.status) payload.status = req.body.status;
    if (req.body.priority) payload.priority = req.body.priority;

    if (!Object.keys(payload).length) {
      return res.status(400).json({ error: 'No changes provided' });
    }

    await quote.update(payload);
    return res.json({ quote });
  })
);

module.exports = router;
