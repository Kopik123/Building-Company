const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Quote, QuoteMessage, QuoteAssignment, User } = require('../models');
const { auth, checkRole } = require('../middleware/auth');
const { Op } = require('sequelize');

// Get all quotes (manager/admin)
router.get('/quotes', auth, checkRole('manager', 'admin'), async (req, res) => {
  try {
    const { status, priority, search } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where[Op.or] = [
        { location: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const quotes = await Quote.findAll({
      where,
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: QuoteAssignment,
          as: 'assignments',
          include: [{ model: User, as: 'manager', attributes: ['id', 'name'] }]
        },
        {
          model: QuoteMessage,
          as: 'messages',
          limit: 1,
          order: [['createdAt', 'DESC']]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ quotes });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// Assign quote to manager
router.post('/quotes/:id/assign', [
  auth,
  checkRole('manager', 'admin'),
  body('managerId').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const quote = await Quote.findByPk(req.params.id);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const manager = await User.findOne({
      where: { 
        id: req.body.managerId,
        role: { [Op.in]: ['manager', 'admin'] }
      }
    });

    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    const assignment = await QuoteAssignment.create({
      quoteId: req.params.id,
      managerId: req.body.managerId,
      assignedBy: req.user.id
    });

    res.status(201).json({ assignment });
  } catch (error) {
    console.error('Error assigning quote:', error);
    res.status(500).json({ error: 'Failed to assign quote' });
  }
});

// Update quote status
router.patch('/quotes/:id/status', [
  auth,
  checkRole('manager', 'admin'),
  body('status').isIn(['pending', 'in_progress', 'responded', 'closed'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const quote = await Quote.findByPk(req.params.id);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    await quote.update({ status: req.body.status });

    res.json({ quote });
  } catch (error) {
    console.error('Error updating quote status:', error);
    res.status(500).json({ error: 'Failed to update quote status' });
  }
});

// Update quote priority
router.patch('/quotes/:id/priority', [
  auth,
  checkRole('manager', 'admin'),
  body('priority').isIn(['low', 'medium', 'high'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const quote = await Quote.findByPk(req.params.id);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    await quote.update({ priority: req.body.priority });

    res.json({ quote });
  } catch (error) {
    console.error('Error updating quote priority:', error);
    res.status(500).json({ error: 'Failed to update quote priority' });
  }
});

// Dashboard statistics
router.get('/dashboard', auth, checkRole('manager', 'admin'), async (req, res) => {
  try {
    const totalQuotes = await Quote.count();
    const pendingQuotes = await Quote.count({ where: { status: 'pending' } });
    const inProgressQuotes = await Quote.count({ where: { status: 'in_progress' } });
    const respondedQuotes = await Quote.count({ where: { status: 'responded' } });
    const closedQuotes = await Quote.count({ where: { status: 'closed' } });

    const recentQuotes = await Quote.findAll({
      limit: 5,
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      statistics: {
        total: totalQuotes,
        pending: pendingQuotes,
        inProgress: inProgressQuotes,
        responded: respondedQuotes,
        closed: closedQuotes
      },
      recentQuotes
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;
