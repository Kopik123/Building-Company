const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { Quote, User } = require('../models');
const { auth, roleCheck } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const managerGuard = [auth, roleCheck('manager', 'admin')];

router.get(
  '/quotes',
  [
    ...managerGuard,
    query('status').optional().isIn(['pending', 'in_progress', 'responded', 'closed']),
    query('priority').optional().isIn(['low', 'medium', 'high']),
    query('projectType').optional().isIn(['bathroom', 'kitchen', 'tiling', 'extension', 'joinery', 'rendering', 'decorating', 'other'])
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
      include: [{ model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone'] }],
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
      include: [{ model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone'] }]
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
