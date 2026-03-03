const crypto = require('crypto');
const express = require('express');
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const { body, validationResult, param } = require('express-validator');
const { Quote, QuoteClaimToken, User, Notification } = require('../models');
const { auth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const createPublicToken = () => crypto.randomBytes(16).toString('hex');
const createClaimToken = () => crypto.randomBytes(24).toString('hex');
const createClaimCode = () => String(Math.floor(100000 + Math.random() * 900000));
const createClaimCodeHash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const CLAIM_MAX_ATTEMPTS = 5;
let claimEmailTransporter;

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizePhone = (value) => String(value || '').trim();

const getClaimEmailTransporter = () => {
  if (!claimEmailTransporter) {
    claimEmailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      pool: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  return claimEmailTransporter;
};

const sendClaimCodeByEmail = async (email, code) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.CONTACT_FROM) {
    const err = new Error('Claim email service is not configured.');
    err.statusCode = 503;
    throw err;
  }

  const transporter = getClaimEmailTransporter();

  await transporter.sendMail({
    from: `Building Company <${process.env.CONTACT_FROM}>`,
    to: email,
    subject: 'Your quote claim code',
    text: `Your quote claim code is ${code}. It expires in 15 minutes.`
  });
};

const sendClaimCodeByPhone = async (phone, code) => {
  const webhookUrl = process.env.CLAIM_SMS_WEBHOOK_URL;
  if (!webhookUrl) {
    const err = new Error('Phone claim delivery is not configured.');
    err.statusCode = 503;
    throw err;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: phone,
      message: `Your quote claim code is ${code}. It expires in 15 minutes.`
    })
  });

  if (!response.ok) {
    const err = new Error('Failed to deliver phone claim code.');
    err.statusCode = 502;
    throw err;
  }
};

router.post(
  '/guest',
  [
    body('projectType').isIn(['bathroom', 'kitchen', 'tiling', 'extension', 'joinery', 'rendering', 'decorating', 'other']),
    body('location').trim().notEmpty(),
    body('postcode').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('guestName').trim().notEmpty(),
    body('guestEmail').optional().isEmail(),
    body('guestPhone').optional().trim().isLength({ min: 5 }),
    body('budgetRange').optional().trim()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectType, location, postcode, description, guestName, guestEmail, guestPhone, budgetRange } = req.body;

    if (!guestEmail && !guestPhone) {
      return res.status(400).json({ error: 'Provide guestEmail or guestPhone' });
    }

    const contactMethod = guestEmail && guestPhone ? 'both' : guestEmail ? 'email' : 'phone';

    const quote = await Quote.create({
      isGuest: true,
      guestName,
      guestEmail: guestEmail || null,
      guestPhone: guestPhone || null,
      contactMethod,
      publicToken: createPublicToken(),
      projectType,
      location,
      postcode,
      description,
      budgetRange: budgetRange || null,
      contactEmail: guestEmail || null,
      contactPhone: guestPhone || null
    });

    // Notify all managers via internal notification
    const managers = await User.findAll({ where: { role: ['manager', 'admin'], isActive: true } });

    const notificationTitle = `New quote request from ${guestName}`;
    const notificationBody = [
      `Name: ${guestName}`,
      `Postcode: ${postcode}`,
      `Location: ${location}`,
      `Project type: ${projectType}`,
      guestEmail ? `Email: ${guestEmail}` : null,
      guestPhone ? `Phone: ${guestPhone}` : null,
      budgetRange ? `Budget: ${budgetRange}` : null,
      `Description: ${description}`
    ].filter(Boolean).join('\n');

    await Promise.all(
      managers.map((manager) =>
        Notification.create({
          userId: manager.id,
          type: 'new_quote',
          title: notificationTitle,
          body: notificationBody,
          quoteId: quote.id,
          data: {
            quoteId: quote.id,
            guestName,
            guestEmail: guestEmail || null,
            guestPhone: guestPhone || null,
            postcode,
            location,
            projectType
          }
        })
      )
    );

    return res.status(201).json({
      quoteId: quote.id,
      publicToken: quote.publicToken,
      status: quote.status
    });
  })
);

router.get('/guest/:publicToken', [param('publicToken').isLength({ min: 16 })], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const quote = await Quote.findOne({
    where: {
      publicToken: req.params.publicToken,
      isGuest: true
    },
    attributes: ['id', 'projectType', 'location', 'status', 'priority', 'createdAt', 'updatedAt']
  });

  if (!quote) {
    return res.status(404).json({ error: 'Quote not found' });
  }

  return res.json({ quote });
}));

router.post(
  '/guest/:id/claim/request',
  [
    param('id').isUUID(),
    body('channel').isIn(['email', 'phone']),
    body('guestEmail').optional().isEmail(),
    body('guestPhone').optional().trim().isLength({ min: 5 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const channel = String(req.body.channel || '').trim();
    const inputEmail = normalizeEmail(req.body.guestEmail);
    const inputPhone = normalizePhone(req.body.guestPhone);

    if (channel === 'email' && !inputEmail) {
      return res.status(400).json({ error: 'guestEmail is required for email claim channel' });
    }

    if (channel === 'phone' && !inputPhone) {
      return res.status(400).json({ error: 'guestPhone is required for phone claim channel' });
    }

    const quote = await Quote.findOne({
      where: {
        id: req.params.id,
        isGuest: true
      }
    });

    if (!quote) {
      return res.status(404).json({ error: 'Guest quote not found' });
    }

    if (channel === 'email' && normalizeEmail(quote.guestEmail) !== inputEmail) {
      return res.status(404).json({ error: 'Guest quote not found' });
    }

    if (channel === 'phone' && normalizePhone(quote.guestPhone) !== inputPhone) {
      return res.status(404).json({ error: 'Guest quote not found' });
    }

    const token = createClaimToken();
    const code = createClaimCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const codeHash = createClaimCodeHash(code);
    const target = channel === 'email' ? inputEmail : inputPhone;

    await QuoteClaimToken.destroy({
      where: {
        quoteId: quote.id,
        usedAt: null
      }
    });

    await QuoteClaimToken.create({
      quoteId: quote.id,
      token,
      channel,
      target,
      codeHash,
      expiresAt,
      attempts: 0
    });

    if (channel === 'email') {
      await sendClaimCodeByEmail(target, code);
    } else {
      await sendClaimCodeByPhone(target, code);
    }

    return res.json({
      message: 'Claim verification code sent',
      claimToken: token,
      channel,
      expiresAt
    });
  })
);

router.post(
  '/guest/:id/claim/confirm',
  [auth, param('id').isUUID(), body('claimToken').isLength({ min: 16 }), body('claimCode').isLength({ min: 6, max: 6 })],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const quote = await Quote.findByPk(req.params.id);
    if (!quote || !quote.isGuest) {
      return res.status(404).json({ error: 'Guest quote not found' });
    }

    const claim = await QuoteClaimToken.findOne({
      where: {
        quoteId: quote.id,
        token: req.body.claimToken,
        usedAt: null,
        expiresAt: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!claim) {
      return res.status(400).json({ error: 'Invalid or expired claim code' });
    }

    if (claim.attempts >= CLAIM_MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many failed attempts. Request a new claim code.' });
    }

    const requestHash = createClaimCodeHash(String(req.body.claimCode).trim());
    const hashBufferA = Buffer.from(requestHash);
    const hashBufferB = Buffer.from(String(claim.codeHash || ''));
    const isMatch = hashBufferA.length === hashBufferB.length && crypto.timingSafeEqual(hashBufferA, hashBufferB);

    if (!isMatch) {
      const nextAttempts = claim.attempts + 1;
      await claim.update({ attempts: nextAttempts });

      if (nextAttempts >= CLAIM_MAX_ATTEMPTS) {
        await claim.update({ usedAt: new Date() });
      }

      return res.status(400).json({ error: 'Invalid or expired claim code' });
    }

    await claim.update({ usedAt: new Date() });
    await quote.update({
      isGuest: false,
      clientId: req.user.id,
      publicToken: null
    });

    return res.json({ message: 'Quote claimed successfully', quoteId: quote.id, clientId: req.user.id });
  })
);

module.exports = router;
