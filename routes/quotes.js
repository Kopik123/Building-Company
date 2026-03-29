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
  ActivityEvent,
  User,
  Notification,
  QuoteEvent
} = require('../models');
const { auth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { deriveLegacyQuoteStatus } = require('../utils/quoteWorkflow');
const { advanceClientLifecycle } = require('../utils/crmLifecycle');
const { createActivityEvent } = require('../utils/activityFeed');
const { parseQuoteProposalDetails, buildQuoteDescriptionFromProposal } = require('../utils/quoteProposal');
const { resolveQuoteReferenceCode } = require('../utils/quoteReference');

const router = express.Router();

const createPublicToken = () => crypto.randomBytes(16).toString('hex');
const createClaimToken = () => crypto.randomBytes(24).toString('hex');
const createClaimCode = () => String(Math.floor(100000 + Math.random() * 900000));
const createClaimCodeHash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const CLAIM_MAX_ATTEMPTS = 5;
let cachedClaimEmailTransporter;
const GUEST_QUOTE_PREVIEW_ATTRIBUTES = [
  'id',
  'guestName',
  'guestEmail',
  'guestPhone',
  'projectType',
  'location',
  'postcode',
  'budgetRange',
  'description',
  'proposalDetails',
  'status',
  'workflowStatus',
  'priority',
  'createdAt',
  'updatedAt',
  'submittedAt',
  'assignedAt',
  'convertedAt',
  'closedAt'
];
const GUEST_QUOTE_ATTACHMENT_ATTRIBUTES = ['id', 'filename', 'url', 'mimeType', 'sizeBytes', 'createdAt', 'updatedAt'];

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizePhone = (value) => String(value || '').trim();
const maskEmailForPreview = (value) => {
  const normalized = normalizeEmail(value);
  if (!normalized.includes('@')) return '';
  const [localPart, domainPart] = normalized.split('@');
  const [domainLabel = '', ...domainRest] = domainPart.split('.');
  const maskedLocal = localPart.length <= 2
    ? `${localPart[0] || ''}*`
    : `${localPart.slice(0, 2)}***`;
  const maskedDomainLabel = domainLabel.length <= 1
    ? `${domainLabel || ''}*`
    : `${domainLabel[0]}***`;
  return `${maskedLocal}@${maskedDomainLabel}${domainRest.length ? `.${domainRest.join('.')}` : ''}`;
};
const maskPhoneForPreview = (value) => {
  const normalized = normalizePhone(value);
  if (!normalized) return '';
  const prefix = normalized.slice(0, Math.min(4, normalized.length));
  const suffix = normalized.length > 2 ? normalized.slice(-2) : '';
  return `${prefix}${normalized.length > prefix.length + suffix.length ? '***' : ''}${suffix}`;
};
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

const loadGuestQuotePreviewRecord = async (publicToken) =>
  Quote.findOne({
    where: {
      publicToken,
      isGuest: true
    },
    attributes: GUEST_QUOTE_PREVIEW_ATTRIBUTES,
    include: [{
      model: QuoteAttachment,
      as: 'attachments',
      attributes: GUEST_QUOTE_ATTACHMENT_ATTRIBUTES,
      required: false,
      separate: true,
      order: [['createdAt', 'ASC']]
    }]
  });

const buildGuestQuotePreviewPayload = async (quoteRecord) => {
  if (!quoteRecord) return null;

  const plainQuote = typeof quoteRecord.toJSON === 'function' ? quoteRecord.toJSON() : { ...(quoteRecord || {}) };
  const referenceCode = await resolveQuoteReferenceCode(Quote, plainQuote);
  const claimChannels = [
    plainQuote.guestEmail ? 'email' : null,
    plainQuote.guestPhone ? 'phone' : null
  ].filter(Boolean);
  const maskedGuestEmail = maskEmailForPreview(plainQuote.guestEmail);
  const maskedGuestPhone = maskPhoneForPreview(plainQuote.guestPhone);
  const attachments = sortQuoteAttachments(plainQuote.attachments || []).map(toQuoteAttachmentSummary);

  delete plainQuote.guestName;
  delete plainQuote.guestEmail;
  delete plainQuote.guestPhone;

  return {
    quote: {
      ...plainQuote,
      referenceCode,
      canClaim: Boolean(claimChannels.length),
      claimChannels,
      maskedGuestEmail: maskedGuestEmail || null,
      maskedGuestPhone: maskedGuestPhone || null,
      attachments,
      attachmentCount: attachments.length
    }
  };
};

const createGuestQuoteRecord = async (basePayload, options = {}) => {
  const workflowPayload = {
    workflowStatus: 'submitted',
    sourceChannel: 'public_web',
    submittedAt: new Date()
  };
  const proposalPayload = basePayload.proposalDetails ? { proposalDetails: basePayload.proposalDetails } : {};
  const { proposalDetails, ...legacySafePayload } = basePayload;

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
      quote = await Quote.create(legacySafePayload, options);
    } catch (fallbackError) {
      logBlockingQuoteFailure('guest_quote_create', fallbackError, {
        initialMessage: error?.message || String(error)
      });
      throw fallbackError;
    }

    if (typeof quote?.update === 'function') {
      try {
        await quote.update({
          ...workflowPayload,
          ...proposalPayload
        }, options);
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
    body('description').optional({ checkFalsy: true }).trim(),
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
    const rawDescription = String(req.body.description || '').trim();
    const guestName = String(req.body.guestName || '').trim();
    const guestEmail = normalizeEmail(req.body.guestEmail);
    const guestPhone = normalizePhone(req.body.guestPhone);
    let proposalDetails;

    try {
      proposalDetails = parseQuoteProposalDetails(req.body.proposalDetails, {
        source: 'public_quote_form_v2'
      });
    } catch (error) {
      await cleanupUploadedFiles(files);
      return res.status(error.statusCode || 400).json({
        error: error.message || 'Invalid quote proposal payload.',
        details: error.details || null
      });
    }

    const budgetRange = String(req.body.budgetRange || '').trim() || proposalDetails?.commercial?.budgetRange || null;
    const location = String(req.body.location || '').trim() || proposalDetails?.logistics?.location || 'Greater Manchester';
    const postcode = String(req.body.postcode || '').trim() || proposalDetails?.logistics?.postcode || null;
    const description = buildQuoteDescriptionFromProposal({
      description: rawDescription,
      proposalDetails,
      location,
      postcode,
      budgetRange
    });

    if (!guestEmail && !guestPhone) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({ error: 'Provide guestEmail or guestPhone' });
    }

    if (!description) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({ error: 'Provide a project brief before sending the quote.' });
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
          proposalDetails,
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

    await createActivityEvent(ActivityEvent, {
      actorUserId: null,
      entityType: 'quote',
      entityId: quote.id,
      quoteId: quote.id,
      clientId: null,
      visibility: 'public',
      eventType: 'quote_submitted',
      title: 'Guest quote submitted',
      message: attachments.length
        ? `Guest submitted a quote with ${attachments.length} photo(s).`
        : 'Guest submitted a quote.',
      data: {
        projectType,
        location,
        attachmentCount: attachments.length
      }
    }, 'legacy_guest_quote_submit_activity');

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
      proposalDetails?.projectScope?.propertyType ? `Property type: ${proposalDetails.projectScope.propertyType}` : null,
      proposalDetails?.projectScope?.targetStartWindow ? `Target start: ${proposalDetails.projectScope.targetStartWindow}` : null,
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

    const referenceCode = await resolveQuoteReferenceCode(Quote, quote);

    return res.status(201).json({
      quoteId: quote.id,
      referenceCode,
      publicToken: quote.publicToken,
      status: quote.status,
      workflowStatus: quote.workflowStatus,
      attachmentCount: attachments.length,
      attachments: attachments.map(toQuoteAttachmentSummary),
      proposalDetails: quote.proposalDetails || proposalDetails || null
    });
  })
);

router.get('/guest/:publicToken', [param('publicToken').isLength({ min: 16 })], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const quoteRecord = await loadGuestQuotePreviewRecord(req.params.publicToken);
  if (!quoteRecord) {
    return res.status(404).json({ error: 'Quote not found' });
  }

  return res.json(await buildGuestQuotePreviewPayload(quoteRecord));
}));

router.post(
  '/guest/:publicToken/attachments',
  upload.array('files', MAX_QUOTE_ATTACHMENT_FILES),
  [param('publicToken').isLength({ min: 16 })],
  asyncHandler(async (req, res) => {
    const files = Array.isArray(req.files) ? req.files : [];
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({ errors: errors.array() });
    }

    const attachmentValidationError = validateQuoteAttachmentFiles(files);
    if (attachmentValidationError) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({ error: attachmentValidationError });
    }

    if (!files.length) {
      return res.status(400).json({ error: 'Attach at least one photo before sending the update.' });
    }

    const quoteRecord = await loadGuestQuotePreviewRecord(req.params.publicToken);
    if (!quoteRecord) {
      await cleanupUploadedFiles(files);
      return res.status(404).json({ error: 'Quote not found' });
    }

    const previewPayload = await buildGuestQuotePreviewPayload(quoteRecord);
    const existingCount = Number(previewPayload?.quote?.attachmentCount || 0);
    const remainingSlots = Math.max(0, MAX_QUOTE_ATTACHMENT_FILES - existingCount);
    if (remainingSlots <= 0) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({ error: `This quote already has the maximum ${MAX_QUOTE_ATTACHMENT_FILES} photos.` });
    }

    if (files.length > remainingSlots) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({ error: `This quote can store up to ${MAX_QUOTE_ATTACHMENT_FILES} photos. You can add ${remainingSlots} more right now.` });
    }

    const plainQuote = typeof quoteRecord.toJSON === 'function' ? quoteRecord.toJSON() : { ...(quoteRecord || {}) };
    let attachments = [];

    try {
      attachments = await withQuoteTransaction(async (transaction) => {
        const createdAttachments = await persistQuoteAttachments({
          quoteId: plainQuote.id,
          files,
          uploadedByUserId: null,
          source: 'public_guest_quote_followup',
          transaction
        });
        return sortQuoteAttachments(createdAttachments);
      });
    } catch (error) {
      await cleanupUploadedFiles(files);
      throw error;
    }

    if (typeof QuoteEvent?.create === 'function') {
      try {
        await QuoteEvent.create({
          quoteId: plainQuote.id,
          actorUserId: null,
          eventType: 'quote_attachments_added',
          visibility: 'public',
          message: attachments.length === 1
            ? 'Guest added 1 more photo to the quote.'
            : `Guest added ${attachments.length} more photos to the quote.`,
          data: {
            sourceChannel: 'public_web_followup',
            attachmentCount: attachments.length,
            totalAttachmentCount: existingCount + attachments.length,
            attachments: attachments.map(toQuoteAttachmentSummary)
          }
        });
      } catch (error) {
        logNonBlockingQuoteFailure('quote_followup_attachment_event', error, { quoteId: plainQuote.id });
      }
    }

    await createActivityEvent(ActivityEvent, {
      actorUserId: null,
      entityType: 'quote',
      entityId: plainQuote.id,
      quoteId: plainQuote.id,
      clientId: null,
      visibility: 'public',
      eventType: 'quote_attachments_added',
      title: 'Guest quote photos added',
      message: attachments.length === 1
        ? 'Guest added 1 more photo to the quote.'
        : `Guest added ${attachments.length} more photos to the quote.`,
      data: {
        attachmentCount: attachments.length,
        totalAttachmentCount: existingCount + attachments.length
      }
    }, 'legacy_guest_quote_attachment_activity');

    try {
      const managers = await User.findAll({ where: { role: { [Op.in]: ['manager', 'admin'] }, isActive: true } });
      if (managers.length && typeof Notification?.bulkCreate === 'function') {
        await Notification.bulkCreate(
          managers.map((manager) => ({
            userId: manager.id,
            type: 'new_quote',
            title: `Additional quote photos from ${plainQuote.guestName || 'guest client'}`,
            body: [
              `Name: ${plainQuote.guestName || 'Guest client'}`,
              `Location: ${plainQuote.location || 'Greater Manchester'}`,
              `Project type: ${plainQuote.projectType || 'other'}`,
              `New photos attached: ${attachments.length}`,
              `Total photos now attached: ${existingCount + attachments.length}`
            ].join('\n'),
            quoteId: plainQuote.id,
            data: {
              quoteId: plainQuote.id,
              event: 'guest_quote_attachments_added',
              attachmentCount: attachments.length,
              totalAttachmentCount: existingCount + attachments.length
            }
          }))
        );
      }
    } catch (error) {
      logNonBlockingQuoteFailure('manager_notification_followup_attachments', error, { quoteId: plainQuote.id });
    }

    const refreshedQuoteRecord = await loadGuestQuotePreviewRecord(req.params.publicToken);
    if (!refreshedQuoteRecord) {
      return res.status(201).json({
        message: attachments.length === 1
          ? 'Added 1 photo to your quote.'
          : `Added ${attachments.length} photos to your quote.`
      });
    }

    return res.status(201).json({
      message: attachments.length === 1
        ? 'Added 1 photo to your quote.'
        : `Added ${attachments.length} photos to your quote.`,
      ...(await buildGuestQuotePreviewPayload(refreshedQuoteRecord))
    });
  })
);

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

    const referenceCode = await resolveQuoteReferenceCode(Quote, quote);

    return res.json({
      message: 'Claim verification code sent',
      quoteId: quote.id,
      referenceCode,
      claimToken: token,
      channel,
      maskedTarget: channel === 'email' ? maskEmailForPreview(target) : maskPhoneForPreview(target),
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
    await advanceClientLifecycle(req.user, 'quoted');

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

    await createActivityEvent(ActivityEvent, {
      actorUserId: req.user.id,
      entityType: 'quote',
      entityId: quote.id,
      quoteId: quote.id,
      clientId: req.user.id,
      visibility: 'client',
      eventType: 'quote_claimed',
      title: 'Guest quote claimed',
      message: 'Guest quote claimed into an authenticated account.',
      data: {
        clientId: req.user.id
      }
    }, 'legacy_guest_quote_claim_activity');

    const referenceCode = await resolveQuoteReferenceCode(Quote, quote);
    return res.json({ message: 'Quote claimed successfully', quoteId: quote.id, referenceCode, clientId: req.user.id });
  })
);

module.exports = router;
