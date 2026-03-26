const crypto = require('crypto');
const express = require('express');
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const { body, validationResult, param } = require('express-validator');
const { upload } = require('../utils/upload');
const {
  MAX_QUOTE_ATTACHMENT_FILES,
  cleanupUploadedFiles,
  createQuoteAttachmentRows,
  sortQuoteAttachments,
  toQuoteAttachmentSummary,
  validateQuoteAttachmentFiles
} = require('../utils/quoteAttachments');
const {
  sequelize,
  Quote,
  QuoteAttachment,
  QuoteClaimToken,
  User,
  Notification,
  QuoteEvent
} = require('../models');
const { auth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { deriveLegacyQuoteStatus } = require('../utils/quoteWorkflow');

const router = express.Router();

const createPublicToken = () => crypto.randomBytes(16).toString('hex');
const createClaimToken = () => crypto.randomBytes(24).toString('hex');
const createClaimCode = () => String(Math.floor(100000 + Math.random() * 900000));
const createClaimCodeHash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const CLAIM_MAX_ATTEMPTS = 5;
let cachedClaimEmailTransporter;

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizePhone = (value) => String(value || '').trim();
const logNonBlockingQuoteFailure = (scope, error, meta = {}) => {
  console.warn('Non-blocking quote guest side effect failed:', {
    scope,
    message: error?.message || String(error),
    ...meta
  });
};
const logBlockingQuoteFailure = (scope, error, meta = {}) => {
  console.error('Blocking quote guest failure:', {
    scope,
    message: error?.message || String(error),
    ...meta
  });
};

const withQuoteTransaction = async (handler) => {
  if (typeof sequelize?.transaction !== 'function') {
    return handler(null);
  }

  return sequelize.transaction(async (transaction) => handler(transaction));
};

const persistQuoteAttachments = async ({ quoteId, files, uploadedByUserId = null, source = null, transaction = null }) => {
  if (!quoteId || typeof QuoteAttachment?.bulkCreate !== 'function') return [];

  const rows = createQuoteAttachmentRows({
    quoteId,
    files,
    uploadedByUserId,
    source
  });

  if (!rows.length) return [];

  return QuoteAttachment.bulkCreate(rows, transaction ? { transaction } : undefined);
};

const createGuestQuoteRecord = async (basePayload, options = {}) => {
  const workflowPayload = {
    workflowStatus: 'submitted',
    sourceChannel: 'public_web',
    submittedAt: new Date()
  };

  try {
    return await Quote.create({
      ...basePayload,
      ...workflowPayload
    }, options);
  } catch (error) {
    console.warn('Guest quote compatibility fallback engaged.', {
      message: error?.message || String(error)
    });

    let quote;
    try {
      quote = await Quote.create(basePayload, options);
    } catch (fallbackError) {
      logBlockingQuoteFailure('guest_quote_create', fallbackError, {
        initialMessage: error?.message || String(error)
      });
      throw fallbackError;
    }

    if (typeof quote?.update === 'function') {
      try {
        await quote.update(workflowPayload, options);
      } catch (updateError) {
        logNonBlockingQuoteFailure('guest_quote_workflow_backfill', updateError, { quoteId: quote.id });
      }
    }

    return quote;
  }
};

const getClaimEmailTransporter = () => {
  if (!cachedClaimEmailTransporter) {
    const smtpUser = String(process.env.SMTP_USER || '').trim();
    const smtpPass = String(process.env.SMTP_PASS || '').trim();
    const transporterConfig = {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      pool: true
    };

    if (smtpUser && smtpPass) {
      transporterConfig.auth = {
        user: smtpUser,
        pass: smtpPass
      };
    }

    cachedClaimEmailTransporter = nodemailer.createTransport(transporterConfig);
  }

  return cachedClaimEmailTransporter;
};

const sendClaimCodeByEmail = async (email, code) => {
  const smtpUser = String(process.env.SMTP_USER || '').trim();
  const smtpPass = String(process.env.SMTP_PASS || '').trim();

  if (!process.env.SMTP_HOST || !process.env.CONTACT_FROM) {
    const err = new Error('Claim email service is not configured.');
    err.statusCode = 503;
    throw err;
  }

  if ((smtpUser && !smtpPass) || (!smtpUser && smtpPass)) {
    const err = new Error('SMTP auth config is incomplete. Set both SMTP_USER and SMTP_PASS.');
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
  upload.array('files', MAX_QUOTE_ATTACHMENT_FILES),
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
    const files = Array.isArray(req.files) ? req.files : [];
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({ errors: errors.array() });
    }

    const projectType = String(req.body.projectType || '').trim();
    const description = String(req.body.description || '').trim();
    const guestName = String(req.body.guestName || '').trim();
    const guestEmail = normalizeEmail(req.body.guestEmail);
    const guestPhone = normalizePhone(req.body.guestPhone);
    const budgetRange = String(req.body.budgetRange || '').trim() || null;
    const location = String(req.body.location || '').trim() || 'Greater Manchester';
    const postcode = String(req.body.postcode || '').trim() || null;

    if (!guestEmail && !guestPhone) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({ error: 'Provide guestEmail or guestPhone' });
    }

    const attachmentValidationError = validateQuoteAttachmentFiles(files);
    if (attachmentValidationError) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({ error: attachmentValidationError });
    }

    const contactMethod = guestEmail && guestPhone ? 'both' : guestEmail ? 'email' : 'phone';
    let quote;
    let attachments = [];

    try {
      const persisted = await withQuoteTransaction(async (transaction) => {
        const createdQuote = await createGuestQuoteRecord({
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
          contactPhone: guestPhone || null,
          status: deriveLegacyQuoteStatus('submitted')
        }, transaction ? { transaction } : undefined);

        const createdAttachments = await persistQuoteAttachments({
          quoteId: createdQuote.id,
          files,
          uploadedByUserId: null,
          source: 'public_guest_quote',
          transaction
        });

        return {
          quote: createdQuote,
          attachments: sortQuoteAttachments(createdAttachments)
        };
      });

      quote = persisted.quote;
      attachments = persisted.attachments;
    } catch (error) {
      await cleanupUploadedFiles(files);
      throw error;
    }

    if (typeof QuoteEvent?.create === 'function') {
      try {
        await QuoteEvent.create({
          quoteId: quote.id,
          actorUserId: null,
          eventType: 'quote_submitted',
          visibility: 'public',
          message: attachments.length
            ? `Guest submitted a new quote request with ${attachments.length} attached photo(s).`
            : 'Guest submitted a new quote request.',
          data: {
            sourceChannel: 'public_web',
            attachmentCount: attachments.length,
            attachments: attachments.map(toQuoteAttachmentSummary)
          }
        });
      } catch (error) {
        logNonBlockingQuoteFailure('quote_event_create', error, { quoteId: quote.id });
      }
    }

    // Notify all managers via internal notification
    const notificationTitle = `New quote request from ${guestName}`;
    const notificationBody = [
      `Name: ${guestName}`,
      postcode ? `Postcode: ${postcode}` : null,
      `Location: ${location}`,
      `Project type: ${projectType}`,
      guestEmail ? `Email: ${guestEmail}` : null,
      guestPhone ? `Phone: ${guestPhone}` : null,
      budgetRange ? `Budget: ${budgetRange}` : null,
      attachments.length ? `Photos attached: ${attachments.length}` : null,
      `Description: ${description}`
    ].filter(Boolean).join('\n');

    try {
      const managers = await User.findAll({ where: { role: { [Op.in]: ['manager', 'admin'] }, isActive: true } });

      if (managers.length && typeof Notification?.bulkCreate === 'function') {
        await Notification.bulkCreate(
          managers.map((manager) => ({
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
              projectType,
              attachmentCount: attachments.length
            }
          }))
        );
      }
    } catch (error) {
      logNonBlockingQuoteFailure('manager_notification_create', error, { quoteId: quote.id });
    }

    return res.status(201).json({
      quoteId: quote.id,
      publicToken: quote.publicToken,
      status: quote.status,
      attachmentCount: attachments.length,
      attachments: attachments.map(toQuoteAttachmentSummary)
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
    attributes: ['id', 'projectType', 'location', 'status', 'workflowStatus', 'priority', 'createdAt', 'updatedAt', 'submittedAt', 'assignedAt', 'convertedAt', 'closedAt'],
    include: [{
      model: QuoteAttachment,
      as: 'attachments',
      attributes: ['id', 'filename', 'url', 'mimeType', 'sizeBytes', 'createdAt', 'updatedAt'],
      required: false,
      separate: true,
      order: [['createdAt', 'ASC']]
    }]
  });

  if (!quote) {
    return res.status(404).json({ error: 'Quote not found' });
  }

  const plainQuote = typeof quote.toJSON === 'function' ? quote.toJSON() : { ...(quote || {}) };
  const attachments = sortQuoteAttachments(plainQuote.attachments || []).map(toQuoteAttachmentSummary);

  return res.json({
    quote: {
      ...plainQuote,
      attachments,
      attachmentCount: attachments.length
    }
  });
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

    if (typeof QuoteEvent?.create === 'function') {
      await QuoteEvent.create({
        quoteId: quote.id,
        actorUserId: req.user.id,
        eventType: 'quote_claimed',
        visibility: 'client',
        message: 'Guest quote claimed into an authenticated account.',
        data: {
          clientId: req.user.id
        }
      });
    }

    return res.json({ message: 'Quote claimed successfully', quoteId: quote.id, clientId: req.user.id });
  })
);

module.exports = router;
