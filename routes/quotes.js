const crypto = require('crypto');
const express = require('express');
const { Op } = require('sequelize');
const { body, validationResult, param } = require('express-validator');
const { Quote, QuoteClaimToken, User, Notification } = require('../models');
const { auth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const createPublicToken = () => crypto.randomBytes(16).toString('hex');
const createClaimToken = () => crypto.randomBytes(24).toString('hex');
const createClaimCode = () => String(crypto.randomInt(100000, 1000000));
const createClaimCodeHash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const CLAIM_MAX_ATTEMPTS = 5;
const CLAIM_CODE_TTL_MS = 15 * 60 * 1000;

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizePhone = (value) => String(value || '').trim();
const CLAIM_CODE_WARNING = 'This code is valid for 15 minutes. Save it now because it will only be shown once.';

const validateQuoteInput = (req) => {
  const projectType = String(req.body.projectType || '').trim();
  const description = String(req.body.description || '').trim();
  const guestName = String(req.body.guestName || '').trim();
  const guestEmail = normalizeEmail(req.body.guestEmail);
  const guestPhone = normalizePhone(req.body.guestPhone);
  const budgetRange = String(req.body.budgetRange || '').trim() || null;
  const location = String(req.body.location || '').trim() || 'Greater Manchester';
  const postcode = String(req.body.postcode || '').trim() || null;

  return {
    projectType,
    description,
    guestName,
    guestEmail,
    guestPhone,
    budgetRange,
    location,
    postcode
  };
};

const notifyManagersAboutQuote = async ({
  quote,
  guestName,
  guestEmail,
  guestPhone,
  postcode,
  location,
  projectType,
  budgetRange,
  description,
  origin
}) => {
  const managers = await User.findAll({ where: { role: { [Op.in]: ['manager', 'admin'] }, isActive: true } });

  const notificationTitle = `New quote request from ${guestName}`;
  const notificationBody = [
    `Origin: ${origin}`,
    `Name: ${guestName}`,
    postcode ? `Postcode: ${postcode}` : null,
    `Location: ${location}`,
    `Project type: ${projectType}`,
    guestEmail ? `Email: ${guestEmail}` : null,
    guestPhone ? `Phone: ${guestPhone}` : null,
    budgetRange ? `Budget: ${budgetRange}` : null,
    `Description: ${description}`
  ].filter(Boolean).join('\n');

  if (managers.length) {
    await Notification.bulkCreate(
      managers.map((manager) => ({
        userId: manager.id,
        type: origin === 'authenticated_quote' ? 'new_quote_authenticated' : 'new_quote',
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
          projectType,
          origin
        }
      }))
    );
  }
};

const issueClaimCode = async (quote, { channel, target }) => {
  const token = createClaimToken();
  const code = createClaimCode();
  const expiresAt = new Date(Date.now() + CLAIM_CODE_TTL_MS);
  const codeHash = createClaimCodeHash(code);

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
    code,
    codeHash,
    expiresAt,
    attempts: 0
  });

  return { token, code, expiresAt, channel, target };
};

router.post(
  '/guest',
  [
    body('projectType').isIn(['bathroom', 'kitchen', 'interior', 'tiling', 'extension', 'joinery', 'rendering', 'decorating', 'other']),
    body('location').optional({ checkFalsy: true }).trim(),
    body('postcode').optional({ checkFalsy: true }).trim(),
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

    const {
      projectType,
      description,
      guestName,
      guestEmail,
      guestPhone,
      budgetRange,
      location,
      postcode
    } = validateQuoteInput(req);

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
      postcode: postcode || null,
      description,
      budgetRange,
      contactEmail: guestEmail || null,
      contactPhone: guestPhone || null
    });

    await notifyManagersAboutQuote({
      quote,
      guestName,
      guestEmail,
      guestPhone,
      postcode,
      location,
      projectType,
      budgetRange,
      description,
      origin: 'guest_quote'
    });

    const preferredChannel = guestEmail ? 'email' : 'phone';
    const claim = await issueClaimCode(quote, {
      channel: preferredChannel,
      target: preferredChannel === 'email' ? guestEmail : guestPhone
    });

    return res.status(201).json({
      quoteId: quote.id,
      publicToken: quote.publicToken,
      status: quote.status,
      claimToken: claim.token,
      claimCode: claim.code,
      claimCodeExpiresAt: claim.expiresAt,
      claimCodeDeliveryMode: 'onscreen',
      claimCodeWarning: CLAIM_CODE_WARNING
    });
  })
);

router.post(
  '/',
  [
    auth,
    body('projectType').isIn(['bathroom', 'kitchen', 'interior', 'tiling', 'extension', 'joinery', 'rendering', 'decorating', 'other']),
    body('location').optional({ checkFalsy: true }).trim(),
    body('postcode').optional({ checkFalsy: true }).trim(),
    body('description').trim().notEmpty(),
    body('budgetRange').optional().trim()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const projectType = String(req.body.projectType || '').trim();
    const description = String(req.body.description || '').trim();
    const budgetRange = String(req.body.budgetRange || '').trim() || null;
    const location = String(req.body.location || '').trim() || 'Greater Manchester';
    const postcode = String(req.body.postcode || '').trim() || null;
    const guestName = String(req.user?.name || req.user?.email || 'Signed-in client').trim();
    const guestEmail = normalizeEmail(req.user?.email);
    const guestPhone = normalizePhone(req.user?.phone);
    const contactMethod = guestEmail && guestPhone ? 'both' : guestEmail ? 'email' : guestPhone ? 'phone' : null;

    const quote = await Quote.create({
      isGuest: false,
      clientId: req.user.id,
      guestName,
      guestEmail: guestEmail || null,
      guestPhone: guestPhone || null,
      contactMethod,
      publicToken: null,
      projectType,
      location,
      postcode: postcode || null,
      description,
      budgetRange,
      contactEmail: guestEmail || null,
      contactPhone: guestPhone || null
    });

    await notifyManagersAboutQuote({
      quote,
      guestName,
      guestEmail,
      guestPhone,
      postcode,
      location,
      projectType,
      budgetRange,
      description,
      origin: 'authenticated_quote'
    });

    return res.status(201).json({
      quoteId: quote.id,
      status: quote.status,
      clientId: req.user.id,
      message: 'Quote added to your account.'
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

    const claim = await issueClaimCode(quote, {
      channel,
      target: channel === 'email' ? inputEmail : inputPhone
    });

    return res.json({
      message: 'Claim verification code generated',
      claimToken: claim.token,
      claimCode: claim.code,
      claimCodeExpiresAt: claim.expiresAt,
      claimCodeDeliveryMode: 'onscreen',
      claimCodeWarning: CLAIM_CODE_WARNING
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

    await Notification.create({
      userId: req.user.id,
      type: 'quote_claimed',
      title: 'Quote added to your account',
      body: `Quote ${quote.id} was claimed successfully and is now visible in your account.`,
      quoteId: quote.id,
      data: { quoteId: quote.id }
    });

    return res.json({ message: 'Quote claimed successfully', quoteId: quote.id, clientId: req.user.id });
  })
);

module.exports = router;
