const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Quote, QuoteMessage, User } = require('../models');
const { auth, checkRole } = require('../middleware/auth');
const nodemailer = require('nodemailer');

// Get my quotes (client)
router.get('/', auth, checkRole('client'), async (req, res) => {
  try {
    const quotes = await Quote.findAll({
      where: { clientId: req.user.id },
      include: [
        {
          model: QuoteMessage,
          as: 'messages',
          include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'role'] }]
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

// Get single quote details
router.get('/:id', auth, async (req, res) => {
  try {
    const quote = await Quote.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: QuoteMessage,
          as: 'messages',
          include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'role'] }],
          order: [['createdAt', 'ASC']]
        },
        {
          model: User,
          as: 'client',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Check permission
    if (req.user.role === 'client' && quote.clientId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ quote });
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// Create new quote
router.post('/', [
  auth,
  checkRole('client'),
  body('projectType').isIn(['bathroom', 'kitchen', 'tiling', 'extension', 'joinery', 'rendering', 'decorating', 'other']),
  body('location').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('contactEmail').isEmail(),
  body('contactPhone').optional().trim(),
  body('budgetRange').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectType, location, description, contactEmail, contactPhone, budgetRange } = req.body;

    const quote = await Quote.create({
      clientId: req.user.id,
      projectType,
      location,
      description,
      contactEmail,
      contactPhone,
      budgetRange
    });

    // Send email notification to managers
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.CONTACT_FROM || process.env.SMTP_USER,
        to: process.env.CONTACT_TO,
        subject: `New Quote Request - ${projectType}`,
        html: `
          <h2>New Quote Request</h2>
          <p><strong>From:</strong> ${req.user.name}</p>
          <p><strong>Email:</strong> ${contactEmail}</p>
          <p><strong>Phone:</strong> ${contactPhone || 'N/A'}</p>
          <p><strong>Project Type:</strong> ${projectType}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>Budget:</strong> ${budgetRange || 'N/A'}</p>
          <p><strong>Description:</strong></p>
          <p>${description}</p>
          <p><a href="${process.env.APP_URL || 'http://localhost:3000'}/manager/quotes/${quote.id}">View Quote</a></p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
    }

    res.status(201).json({ quote });
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

// Get messages for a quote
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const quote = await Quote.findByPk(req.params.id);
    
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Check permission
    if (req.user.role === 'client' && quote.clientId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await QuoteMessage.findAll({
      where: { quoteId: req.params.id },
      include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'role'] }],
      order: [['createdAt', 'ASC']]
    });

    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message to quote
router.post('/:id/messages', [
  auth,
  body('messageText').trim().notEmpty()
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

    // Check permission
    if (req.user.role === 'client' && quote.clientId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const message = await QuoteMessage.create({
      quoteId: req.params.id,
      senderId: req.user.id,
      messageText: req.body.messageText,
      attachments: req.body.attachments || []
    });

    const messageWithSender = await QuoteMessage.findByPk(message.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'role'] }]
    });

    res.status(201).json({ message: messageWithSender });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
