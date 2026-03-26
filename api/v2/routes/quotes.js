const crypto = require('crypto');
const express = require('express');
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const { body, param, query, validationResult } = require('express-validator');
const { upload } = require('../../../utils/upload');
const {
  MAX_QUOTE_ATTACHMENT_FILES,
  cleanupUploadedFiles,
  createQuoteAttachmentRows,
  sortQuoteAttachments,
  toQuoteAttachmentSummary,
  validateQuoteAttachmentFiles
} = require('../../../utils/quoteAttachments');
const {
  Estimate,
  EstimateLine,
  GroupMember,
  GroupThread,
  ActivityEvent,
  Notification,
  Project,
  Quote,
  QuoteAttachment,
  QuoteEvent,
  User
} = require('../../../models');
const asyncHandler = require('../../../utils/asyncHandler');
const {
  QUOTE_WORKFLOW_STATUSES,
  buildQuoteProjectTitle,
  buildQuoteThreadName,
  deriveLegacyQuoteStatus,
  normalizeEstimateDecisionStatus,
  normalizeWorkflowStatus
} = require('../../../utils/quoteWorkflow');
const { advanceClientLifecycle } = require('../../../utils/crmLifecycle');
const { createActivityEvent } = require('../../../utils/activityFeed');
const { authV2 } = require('../middleware/auth');
const { roleCheckV2 } = require('../middleware/roles');
const { ok, fail } = require('../utils/response');
const { QUOTE_CONTACT_METHODS, QUOTE_PRIORITIES, QUOTE_PROJECT_TYPES, QUOTE_STATUSES } = require('../../../shared/contracts/v2');

const router = express.Router();
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const getPagination = (req) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE));
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize
  };
};

const escapeLike = (value) => String(value || '').replace(/[\\%_]/g, '\\$&');
const toNullableString = (value) => {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : null;
};
const toNullableNumber = (value) => {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
};
const toMoneyString = (value) => {
  const parsed = toNullableNumber(value);
  return parsed == null ? null : `GBP ${parsed.toFixed(2)}`;
};

const quoteIncludes = [
  { model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone', 'companyName'], required: false },
  { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email', 'phone', 'role'], required: false },
  {
    model: Estimate,
    as: 'currentEstimate',
    attributes: ['id', 'quoteId', 'title', 'status', 'decisionStatus', 'versionNumber', 'isCurrentVersion', 'notes', 'clientMessage', 'subtotal', 'total', 'sentAt', 'viewedAt', 'respondedAt', 'approvedAt', 'declinedAt', 'createdAt', 'updatedAt'],
    required: false,
    include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false }]
  },
  {
    model: QuoteAttachment,
    as: 'attachments',
    attributes: ['id', 'filename', 'url', 'mimeType', 'sizeBytes', 'createdAt', 'updatedAt'],
    required: false,
    separate: true,
    order: [['createdAt', 'ASC']]
  }
];

const eventIncludes = [
  { model: User, as: 'actor', attributes: ['id', 'name', 'email', 'role'], required: false }
];

const resolveWorkflowPayload = (workflowStatus, patch = {}) => {
  const normalized = normalizeWorkflowStatus(workflowStatus);
  const now = new Date();
  const payload = {
    ...patch,
    workflowStatus: normalized,
    status: deriveLegacyQuoteStatus(normalized)
  };

  if (normalized === 'submitted' && !payload.submittedAt) payload.submittedAt = now;
  if (normalized === 'assigned') payload.assignedAt = patch.assignedAt || now;
  if (normalized === 'converted_to_project') payload.convertedAt = patch.convertedAt || now;
  if (normalized === 'closed_lost') payload.closedAt = patch.closedAt || now;

  return payload;
};

const createQuoteEvent = async ({ quoteId, actorUserId = null, eventType, visibility = 'internal', message = null, data = null }) => {
  if (typeof QuoteEvent?.create !== 'function') return null;
  return QuoteEvent.create({
    quoteId,
    actorUserId,
    eventType,
    visibility,
    message,
    data
  });
};

const normalizedCanConvert = ({ workflowStatus, currentEstimate, convertedProjectId }) =>
  !convertedProjectId
  && normalizeWorkflowStatus(workflowStatus) === 'approved_ready_for_project'
  && normalizeEstimateDecisionStatus(currentEstimate?.decisionStatus) === 'accepted';

const normalizeAttachmentList = (attachments) =>
  sortQuoteAttachments(attachments).map(toQuoteAttachmentSummary);

const hydrateQuotePayload = (quote) => {
  const plain = typeof quote?.toJSON === 'function' ? quote.toJSON() : { ...(quote || {}) };
  const latestEstimate = plain.currentEstimate || null;
  const attachments = normalizeAttachmentList(plain.attachments);

  return {
    ...plain,
    attachments,
    attachmentCount: attachments.length,
    latestEstimate,
    estimateCount: Number(plain.estimateCount || (latestEstimate ? 1 : 0)),
    canConvertToProject: normalizedCanConvert({
      workflowStatus: plain.workflowStatus,
      currentEstimate: latestEstimate,
      convertedProjectId: plain.convertedProjectId
    })
  };
};

const persistQuoteAttachments = async ({ quoteId, files, uploadedByUserId = null, source = null }) => {
  if (!quoteId || typeof QuoteAttachment?.bulkCreate !== 'function') return [];

  const rows = createQuoteAttachmentRows({
    quoteId,
    files,
    uploadedByUserId,
    source
  });

  if (!rows.length) return [];
  return QuoteAttachment.bulkCreate(rows);
};

const canAccessQuote = (quote, user) => {
  if (!quote || !user) return false;
  if (user.role === 'client') return quote.clientId === user.id;
  return ['employee', 'manager', 'admin'].includes(String(user.role || '').toLowerCase());
};

const loadQuote = async (id) => {
  const quote = await Quote.findByPk(id, {
    include: quoteIncludes
  });
  if (!quote) return null;
  return hydrateQuotePayload(quote);
};

const loadQuoteEvents = async (quoteId, visibility) => {
  if (typeof QuoteEvent?.findAll !== 'function') return [];
  const where = { quoteId };
  if (Array.isArray(visibility) && visibility.length) where.visibility = { [Op.in]: visibility };
  return QuoteEvent.findAll({
    where,
    include: eventIncludes,
    order: [['createdAt', 'ASC']]
  });
};

const loadQuoteEstimates = async (quoteId, options = {}) => {
  if (typeof Estimate?.findAll !== 'function') return [];
  const where = { quoteId };
  if (options.excludeDraft) where.status = { [Op.ne]: 'draft' };
  return Estimate.findAll({
    where,
    include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false }],
    order: [['versionNumber', 'DESC'], ['createdAt', 'DESC']]
  });
};

const ensureQuoteThread = async ({ quote, currentUserId }) => {
  if (typeof GroupThread?.findOne !== 'function' || typeof GroupThread?.create !== 'function') return null;

  const existing = await GroupThread.findOne({
    where: {
      quoteId: quote.id,
      projectId: null
    }
  });
  if (existing) return existing;

  const thread = await GroupThread.create({
    name: buildQuoteThreadName(quote),
    quoteId: quote.id,
    createdBy: currentUserId
  });

  if (typeof GroupMember?.findOrCreate === 'function') {
    await GroupMember.findOrCreate({
      where: { groupThreadId: thread.id, userId: currentUserId },
      defaults: { groupThreadId: thread.id, userId: currentUserId, role: 'admin' }
    });

    if (quote.clientId) {
      await GroupMember.findOrCreate({
        where: { groupThreadId: thread.id, userId: quote.clientId },
        defaults: { groupThreadId: thread.id, userId: quote.clientId, role: 'member' }
      });
    }
  }

  return thread;
};

const notifyUsers = async (users, payloadBuilder) => {
  if (!Array.isArray(users) || !users.length || typeof Notification?.bulkCreate !== 'function') return;
  const rows = users.map((user) => payloadBuilder(user)).filter(Boolean);
  if (!rows.length) return;
  await Notification.bulkCreate(rows);
};

const loadClientRecord = async (clientId) => {
  if (!clientId || typeof User?.findByPk !== 'function') return null;
  return User.findByPk(clientId);
};

const findManagerRecipients = async (excludeUserId) => {
  if (typeof User?.findAll !== 'function') return [];
  return User.findAll({
    where: {
      role: { [Op.in]: ['manager', 'admin'] },
      isActive: true,
      ...(excludeUserId ? { id: { [Op.ne]: excludeUserId } } : {})
    }
  });
};

const attachEstimateMeta = async (quote) => {
  const hydrated = await loadQuote(quote.id);
  return hydrated || quote;
};

router.get(
  '/',
  [
    authV2,
    roleCheckV2('client', 'employee', 'manager', 'admin'),
    query('status').optional().isIn(QUOTE_STATUSES),
    query('workflowStatus').optional().isIn(QUOTE_WORKFLOW_STATUSES),
    query('priority').optional().isIn(QUOTE_PRIORITIES),
    query('q').optional().trim().isLength({ min: 1, max: 255 }),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const where = {};
    if (req.v2User.role === 'client') where.clientId = req.v2User.id;
    if (req.query.status) where.status = req.query.status;
    if (req.query.workflowStatus) where.workflowStatus = req.query.workflowStatus;
    if (req.query.priority) where.priority = req.query.priority;
    if (req.query.q) {
      const needle = `%${escapeLike(String(req.query.q).trim().toLowerCase())}%`;
      where[Op.or] = [
        sqlWhere(fn('LOWER', col('Quote.guestName')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('Quote.guestEmail')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('Quote.location')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('client.email')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('client.name')), { [Op.like]: needle })
      ];
    }

    const { page, pageSize, offset } = getPagination(req);
    const { rows, count } = await Quote.findAndCountAll({
      where,
      include: quoteIncludes,
      order: [['updatedAt', 'DESC']],
      distinct: true,
      limit: pageSize,
      offset
    });

    const quotes = rows.map(hydrateQuotePayload);

    return ok(res, { quotes }, { page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) });
  })
);

router.get(
  '/:id',
  [authV2, roleCheckV2('client', 'employee', 'manager', 'admin'), param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const quote = await loadQuote(req.params.id);
    if (!quote) return fail(res, 404, 'quote_not_found', 'Quote not found');
    if (req.v2User.role === 'client' && quote.clientId !== req.v2User.id) {
      return fail(res, 404, 'quote_not_found', 'Quote not found');
    }

    return ok(res, { quote });
  })
);

router.post(
  '/:id/attachments',
  [
    authV2,
    roleCheckV2('client', 'manager', 'admin'),
    param('id').isUUID(),
    upload.array('files', MAX_QUOTE_ATTACHMENT_FILES)
  ],
  asyncHandler(async (req, res) => {
    const files = Array.isArray(req.files) ? req.files : [];
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await cleanupUploadedFiles(files);
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const quote = await Quote.findByPk(req.params.id, { include: quoteIncludes });
    if (!quote) {
      await cleanupUploadedFiles(files);
      return fail(res, 404, 'quote_not_found', 'Quote not found');
    }
    if (!canAccessQuote(quote, req.v2User)) {
      await cleanupUploadedFiles(files);
      return fail(res, 404, 'quote_not_found', 'Quote not found');
    }

    const attachmentValidationError = validateQuoteAttachmentFiles(files);
    if (attachmentValidationError) {
      await cleanupUploadedFiles(files);
      return fail(res, 400, 'invalid_attachments', attachmentValidationError);
    }

    if (!files.length) {
      await cleanupUploadedFiles(files);
      return fail(res, 400, 'missing_attachments', 'Attach at least one photo');
    }

    const existingCount = Array.isArray(quote.attachments) ? quote.attachments.length : 0;
    const remainingSlots = Math.max(0, MAX_QUOTE_ATTACHMENT_FILES - existingCount);
    if (remainingSlots <= 0) {
      await cleanupUploadedFiles(files);
      return fail(res, 400, 'attachment_limit_reached', `This quote already has the maximum ${MAX_QUOTE_ATTACHMENT_FILES} photos.`);
    }
    if (files.length > remainingSlots) {
      await cleanupUploadedFiles(files);
      return fail(res, 400, 'attachment_limit_reached', `This quote can store up to ${MAX_QUOTE_ATTACHMENT_FILES} photos. You can add ${remainingSlots} more right now.`);
    }

    let attachments = [];
    try {
      attachments = await persistQuoteAttachments({
        quoteId: quote.id,
        files,
        uploadedByUserId: req.v2User.id,
        source: req.v2User.role === 'client' ? 'client_portal_quote' : 'staff_quote'
      });
    } catch (error) {
      await cleanupUploadedFiles(files);
      throw error;
    }

    try {
      await createQuoteEvent({
        quoteId: quote.id,
        actorUserId: req.v2User.id,
        eventType: 'quote_attachments_added',
        visibility: 'client',
        message: `${attachments.length} quote attachment(s) added.`,
        data: {
          attachmentCount: attachments.length,
          totalAttachmentCount: existingCount + attachments.length,
          attachments: attachments.map(toQuoteAttachmentSummary)
        }
      });
    } catch (error) {
      console.warn('Non-blocking quote attachment event failure:', {
        quoteId: quote.id,
        message: error?.message || String(error)
      });
    }

    await createActivityEvent(ActivityEvent, {
      actorUserId: req.v2User.id,
      entityType: 'quote',
      entityId: quote.id,
      quoteId: quote.id,
      clientId: quote.clientId || null,
      visibility: req.v2User.role === 'client' ? 'client' : 'internal',
      eventType: 'quote_attachments_added',
      title: 'Quote photos added',
      message: attachments.length === 1 ? '1 quote photo added.' : `${attachments.length} quote photos added.`,
      data: {
        attachmentCount: attachments.length,
        totalAttachmentCount: existingCount + attachments.length
      }
    }, 'quote_attachment_activity');

    const hydratedQuote = await attachEstimateMeta(quote);
    return ok(res, { quote: hydratedQuote, attachments: normalizeAttachmentList(attachments) }, {}, 201);
  })
);

router.post(
  '/',
  [
    authV2,
    roleCheckV2('client', 'manager', 'admin'),
    body('projectType').isIn(QUOTE_PROJECT_TYPES),
    body('location').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('priority').optional().isIn(QUOTE_PRIORITIES),
    body('contactMethod').optional({ nullable: true }).isIn(QUOTE_CONTACT_METHODS),
    body('clientId').optional({ nullable: true }).isUUID(),
    body('assignedManagerId').optional({ nullable: true }).isUUID()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const isClientCreate = req.v2User.role === 'client';
    const clientId = isClientCreate ? req.v2User.id : req.body.clientId || null;
    const guestName = toNullableString(req.body.guestName);
    const guestEmail = toNullableString(req.body.guestEmail);
    const guestPhone = toNullableString(req.body.guestPhone);
    const contactEmail = toNullableString(req.body.contactEmail);
    const contactPhone = toNullableString(req.body.contactPhone);
    const isGuest = !clientId;

    if (!clientId && !guestName && !guestEmail && !contactEmail) {
      return fail(res, 400, 'quote_contact_required', 'Guest quotes require at least a guest name or email');
    }

    const sourceChannel = isClientCreate ? 'client_portal' : isGuest ? 'manager_created_guest' : 'manager_created';
    const quote = await Quote.create({
      clientId,
      isGuest,
      guestName,
      guestEmail,
      guestPhone,
      contactMethod: req.body.contactMethod || null,
      publicToken: isGuest ? crypto.randomBytes(16).toString('hex') : null,
      projectType: req.body.projectType,
      location: String(req.body.location || '').trim(),
      postcode: toNullableString(req.body.postcode),
      budgetRange: toNullableString(req.body.budgetRange),
      description: String(req.body.description || '').trim(),
      contactEmail,
      contactPhone,
      status: deriveLegacyQuoteStatus('submitted'),
      workflowStatus: 'submitted',
      assignedManagerId: isClientCreate ? null : (req.body.assignedManagerId || req.v2User.id || null),
      submittedAt: new Date(),
      sourceChannel,
      priority: req.body.priority || QUOTE_PRIORITIES[1]
    });

    const clientRecord = await loadClientRecord(clientId);
    await advanceClientLifecycle(clientRecord, 'quoted');

    await createQuoteEvent({
      quoteId: quote.id,
      actorUserId: req.v2User.id,
      eventType: 'quote_submitted',
      visibility: clientId ? 'client' : 'public',
      message: isClientCreate ? 'Client submitted a new quote request.' : 'Quote request created.',
      data: {
        sourceChannel
      }
    });

    await createActivityEvent(ActivityEvent, {
      actorUserId: req.v2User.id,
      entityType: 'quote',
      entityId: quote.id,
      quoteId: quote.id,
      clientId: clientId || null,
      visibility: clientId ? 'client' : 'public',
      eventType: 'quote_submitted',
      title: 'Quote submitted',
      message: isClientCreate ? 'Client submitted a new quote request.' : 'Quote request created.',
      data: {
        sourceChannel,
        projectType: quote.projectType,
        location: quote.location
      }
    }, 'quote_submit_activity');

    if (isClientCreate) {
      const managers = await findManagerRecipients();
      await notifyUsers(managers, (manager) => ({
        userId: manager.id,
        type: 'new_quote',
        title: 'New client quote submitted',
        body: `A new quote was submitted for ${quote.projectType} in ${quote.location}.`,
        quoteId: quote.id,
        data: {
          quoteId: quote.id,
          workflowStatus: 'submitted'
        }
      }));
    }

    const hydratedQuote = await attachEstimateMeta(quote);
    return ok(res, { quote: hydratedQuote }, {}, 201);
  })
);

router.patch(
  '/:id',
  [
    authV2,
    roleCheckV2('manager', 'admin'),
    param('id').isUUID(),
    body('projectType').optional().isIn(QUOTE_PROJECT_TYPES),
    body('status').optional().isIn(QUOTE_STATUSES),
    body('workflowStatus').optional().isIn(QUOTE_WORKFLOW_STATUSES),
    body('priority').optional().isIn(QUOTE_PRIORITIES),
    body('contactMethod').optional({ nullable: true }).isIn(QUOTE_CONTACT_METHODS),
    body('clientId').optional({ nullable: true }).isUUID(),
    body('assignedManagerId').optional({ nullable: true }).isUUID()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const quote = await Quote.findByPk(req.params.id);
    if (!quote) return fail(res, 404, 'quote_not_found', 'Quote not found');

    const payload = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'projectType')) payload.projectType = req.body.projectType;
    if (Object.prototype.hasOwnProperty.call(req.body, 'location')) payload.location = String(req.body.location || '').trim();
    if (Object.prototype.hasOwnProperty.call(req.body, 'description')) payload.description = String(req.body.description || '').trim();
    if (Object.prototype.hasOwnProperty.call(req.body, 'priority')) payload.priority = req.body.priority;
    if (Object.prototype.hasOwnProperty.call(req.body, 'clientId')) payload.clientId = req.body.clientId || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'assignedManagerId')) payload.assignedManagerId = req.body.assignedManagerId || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'guestName')) payload.guestName = toNullableString(req.body.guestName);
    if (Object.prototype.hasOwnProperty.call(req.body, 'guestEmail')) payload.guestEmail = toNullableString(req.body.guestEmail);
    if (Object.prototype.hasOwnProperty.call(req.body, 'guestPhone')) payload.guestPhone = toNullableString(req.body.guestPhone);
    if (Object.prototype.hasOwnProperty.call(req.body, 'contactMethod')) payload.contactMethod = req.body.contactMethod || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'postcode')) payload.postcode = toNullableString(req.body.postcode);
    if (Object.prototype.hasOwnProperty.call(req.body, 'budgetRange')) payload.budgetRange = toNullableString(req.body.budgetRange);
    if (Object.prototype.hasOwnProperty.call(req.body, 'contactEmail')) payload.contactEmail = toNullableString(req.body.contactEmail);
    if (Object.prototype.hasOwnProperty.call(req.body, 'contactPhone')) payload.contactPhone = toNullableString(req.body.contactPhone);

    const nextWorkflowStatus = req.body.workflowStatus || req.body.status || quote.workflowStatus || quote.status;
    Object.assign(payload, resolveWorkflowPayload(nextWorkflowStatus, payload));

    const nextClientId = Object.prototype.hasOwnProperty.call(payload, 'clientId') ? payload.clientId : quote.clientId;
    payload.isGuest = !nextClientId;

    if (!Object.keys(payload).length) return fail(res, 400, 'no_changes', 'No changes provided');

    await quote.update(payload);
    await createQuoteEvent({
      quoteId: quote.id,
      actorUserId: req.v2User.id,
      eventType: 'quote_updated',
      visibility: 'internal',
      message: `Quote updated to ${normalizeWorkflowStatus(nextWorkflowStatus)}.`,
      data: {
        workflowStatus: normalizeWorkflowStatus(nextWorkflowStatus)
      }
    });

    const hydratedQuote = await attachEstimateMeta(quote);
    return ok(res, { quote: hydratedQuote });
  })
);

router.post(
  '/:id/assign',
  [
    authV2,
    roleCheckV2('manager', 'admin'),
    param('id').isUUID(),
    body('assignedManagerId').optional({ nullable: true }).isUUID()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const quote = await Quote.findByPk(req.params.id, { include: quoteIncludes });
    if (!quote) return fail(res, 404, 'quote_not_found', 'Quote not found');

    const assignedManagerId = req.body.assignedManagerId || req.v2User.id;
    await quote.update(resolveWorkflowPayload('assigned', {
      assignedManagerId
    }));

    const thread = await ensureQuoteThread({ quote, currentUserId: req.v2User.id });
    await createQuoteEvent({
      quoteId: quote.id,
      actorUserId: req.v2User.id,
      eventType: 'quote_assigned',
      visibility: 'client',
      message: 'A manager took ownership of the quote request.',
      data: {
        assignedManagerId,
        groupThreadId: thread?.id || null
      }
    });

    await createActivityEvent(ActivityEvent, {
      actorUserId: req.v2User.id,
      entityType: 'quote',
      entityId: quote.id,
      quoteId: quote.id,
      clientId: quote.clientId || null,
      visibility: 'client',
      eventType: 'quote_assigned',
      title: 'Quote assigned',
      message: 'A manager took ownership of the quote request.',
      data: {
        assignedManagerId,
        groupThreadId: thread?.id || null
      }
    }, 'quote_assign_activity');

    const hydratedQuote = await attachEstimateMeta(quote);
    return ok(res, { quote: hydratedQuote, thread });
  })
);

router.get(
  '/:id/timeline',
  [
    authV2,
    roleCheckV2('client', 'employee', 'manager', 'admin'),
    param('id').isUUID()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const quote = await Quote.findByPk(req.params.id);
    if (!quote) return fail(res, 404, 'quote_not_found', 'Quote not found');
    if (req.v2User.role === 'client' && quote.clientId !== req.v2User.id) {
      return fail(res, 404, 'quote_not_found', 'Quote not found');
    }

    const visibility = req.v2User.role === 'client' ? ['client', 'public'] : ['internal', 'client', 'public'];
    const events = await loadQuoteEvents(quote.id, visibility);
    return ok(res, { events });
  })
);

router.get(
  '/:id/estimates',
  [
    authV2,
    roleCheckV2('client', 'employee', 'manager', 'admin'),
    param('id').isUUID()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const quote = await Quote.findByPk(req.params.id);
    if (!quote) return fail(res, 404, 'quote_not_found', 'Quote not found');
    if (req.v2User.role === 'client' && quote.clientId !== req.v2User.id) {
      return fail(res, 404, 'quote_not_found', 'Quote not found');
    }

    const estimates = await loadQuoteEstimates(quote.id, { excludeDraft: req.v2User.role === 'client' });
    if (req.v2User.role === 'client') {
      const currentEstimate = estimates.find((estimate) => estimate?.isCurrentVersion) || estimates[0];
      if (currentEstimate && currentEstimate.status === 'sent' && normalizeEstimateDecisionStatus(currentEstimate.decisionStatus) === 'pending') {
        await currentEstimate.update({
          decisionStatus: 'viewed',
          viewedAt: currentEstimate.viewedAt || new Date()
        });
        await quote.update(resolveWorkflowPayload('client_review'));
        await createQuoteEvent({
          quoteId: quote.id,
          actorUserId: req.v2User.id,
          eventType: 'estimate_viewed',
          visibility: 'client',
          message: 'Client viewed the current estimate.',
          data: {
            estimateId: currentEstimate.id
          }
        });
      }
    }

    return ok(res, { estimates: await loadQuoteEstimates(quote.id, { excludeDraft: req.v2User.role === 'client' }) });
  })
);

router.post(
  '/:id/estimates',
  [
    authV2,
    roleCheckV2('manager', 'admin'),
    param('id').isUUID(),
    body('title').trim().notEmpty(),
    body('notes').optional().trim(),
    body('description').optional().trim(),
    body('total').optional({ nullable: true }).isNumeric()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const quote = await Quote.findByPk(req.params.id);
    if (!quote) return fail(res, 404, 'quote_not_found', 'Quote not found');

    const estimates = await loadQuoteEstimates(quote.id);
    const versionNumber = estimates.reduce((max, estimate) => Math.max(max, Number(estimate.versionNumber || 0)), 0) + 1;

    if (typeof Estimate?.update === 'function') {
      await Estimate.update(
        { isCurrentVersion: false },
        { where: { quoteId: quote.id } }
      );
    } else {
      await Promise.all(estimates.map((estimate) => (typeof estimate.update === 'function' ? estimate.update({ isCurrentVersion: false }) : null)));
    }

    const estimate = await Estimate.create({
      quoteId: quote.id,
      projectId: null,
      createdById: req.v2User.id,
      title: String(req.body.title || '').trim(),
      status: 'draft',
      decisionStatus: 'pending',
      versionNumber,
      isCurrentVersion: true,
      notes: toNullableString(req.body.notes),
      subtotal: 0,
      total: 0,
      isActive: true
    });

    const total = toNullableNumber(req.body.total);
    const description = toNullableString(req.body.description) || String(req.body.title || '').trim();
    if (estimate?.id && typeof EstimateLine?.create === 'function' && (total != null || description)) {
      await EstimateLine.create({
        estimateId: estimate.id,
        lineType: 'custom',
        serviceId: null,
        materialId: null,
        description,
        unit: null,
        quantity: 1,
        unitCost: total,
        lineTotalOverride: total,
        lineTotal: total || 0,
        notes: null,
        sortOrder: 0
      });
      if (typeof estimate.update === 'function') {
        await estimate.update({
          subtotal: total || 0,
          total: total || 0
        });
      }
    }

    await quote.update(resolveWorkflowPayload('estimate_in_progress', {
      currentEstimateId: estimate.id
    }));
    await createQuoteEvent({
      quoteId: quote.id,
      actorUserId: req.v2User.id,
      eventType: 'estimate_drafted',
      visibility: 'internal',
      message: `Estimate v${versionNumber} drafted.`,
      data: {
        estimateId: estimate.id,
        versionNumber
      }
    });

    await createActivityEvent(ActivityEvent, {
      actorUserId: req.v2User.id,
      entityType: 'estimate',
      entityId: estimate.id,
      quoteId: quote.id,
      clientId: quote.clientId || null,
      visibility: 'internal',
      eventType: 'estimate_drafted',
      title: `Estimate v${versionNumber} drafted`,
      message: `Estimate v${versionNumber} drafted.`,
      data: {
        estimateId: estimate.id,
        versionNumber
      }
    }, 'estimate_draft_activity');

    const refreshed = await loadQuoteEstimates(quote.id);
    return ok(res, { estimates: refreshed, estimate: refreshed.find((item) => item.id === estimate.id) || estimate }, {}, 201);
  })
);

router.post(
  '/estimates/:id/send',
  [
    authV2,
    roleCheckV2('manager', 'admin'),
    param('id').isUUID(),
    body('clientMessage').optional().trim()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const estimate = await Estimate.findByPk(req.params.id);
    if (!estimate) return fail(res, 404, 'estimate_not_found', 'Estimate not found');
    const quote = await Quote.findByPk(estimate.quoteId, { include: quoteIncludes });
    if (!quote) return fail(res, 404, 'quote_not_found', 'Quote not found');

    await estimate.update({
      status: 'sent',
      decisionStatus: 'pending',
      clientMessage: toNullableString(req.body.clientMessage),
      sentAt: new Date(),
      viewedAt: null,
      respondedAt: null,
      approvedAt: null,
      declinedAt: null
    });

    await quote.update(resolveWorkflowPayload('estimate_sent', {
      currentEstimateId: estimate.id
    }));

    await createQuoteEvent({
      quoteId: quote.id,
      actorUserId: req.v2User.id,
      eventType: 'estimate_sent',
      visibility: 'client',
      message: `Estimate v${estimate.versionNumber || 1} sent to client.`,
      data: {
        estimateId: estimate.id
      }
    });

    await createActivityEvent(ActivityEvent, {
      actorUserId: req.v2User.id,
      entityType: 'estimate',
      entityId: estimate.id,
      quoteId: quote.id,
      clientId: quote.clientId || null,
      visibility: 'client',
      eventType: 'estimate_sent',
      title: 'Estimate sent',
      message: `Estimate v${estimate.versionNumber || 1} sent to client.`,
      data: {
        estimateId: estimate.id,
        versionNumber: estimate.versionNumber || 1
      }
    }, 'estimate_send_activity');

    if (quote.clientId && typeof Notification?.create === 'function') {
      await Notification.create({
        userId: quote.clientId,
        type: 'estimate_sent',
        title: 'New estimate ready to review',
        body: `A new estimate is ready for your ${quote.projectType} quote.`,
        quoteId: quote.id,
        data: {
          quoteId: quote.id,
          estimateId: estimate.id
        }
      });
    }

    const refreshedQuote = await attachEstimateMeta(quote);
    return ok(res, { quote: refreshedQuote, estimate: await Estimate.findByPk(estimate.id, { include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false }] }) });
  })
);

router.post(
  '/estimates/:id/respond',
  [
    authV2,
    roleCheckV2('client'),
    param('id').isUUID(),
    body('decision').isIn(['accepted', 'declined', 'revision_requested']),
    body('note').optional().trim()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const estimate = await Estimate.findByPk(req.params.id);
    if (!estimate) return fail(res, 404, 'estimate_not_found', 'Estimate not found');
    const quote = await Quote.findByPk(estimate.quoteId, { include: quoteIncludes });
    if (!quote || quote.clientId !== req.v2User.id) {
      return fail(res, 404, 'quote_not_found', 'Quote not found');
    }

    const decision = req.body.decision;
    const updatePayload = {
      decisionStatus: decision,
      clientMessage: toNullableString(req.body.note),
      respondedAt: new Date()
    };
    let workflowStatus = 'estimate_in_progress';

    if (decision === 'accepted') {
      updatePayload.status = 'approved';
      updatePayload.approvedAt = new Date();
      workflowStatus = 'approved_ready_for_project';
    } else if (decision === 'declined') {
      updatePayload.declinedAt = new Date();
      workflowStatus = 'closed_lost';
    }

    await estimate.update(updatePayload);
    await quote.update(resolveWorkflowPayload(workflowStatus, {
      lossReason: decision === 'declined' ? toNullableString(req.body.note) : quote.lossReason
    }));
    if (decision === 'accepted') {
      const clientRecord = await loadClientRecord(quote.clientId);
      await advanceClientLifecycle(clientRecord, 'approved');
    }

    await createQuoteEvent({
      quoteId: quote.id,
      actorUserId: req.v2User.id,
      eventType: `estimate_${decision}`,
      visibility: 'client',
      message: `Client ${decision.replaceAll('_', ' ')} the estimate.`,
      data: {
        estimateId: estimate.id,
        note: toNullableString(req.body.note)
      }
    });

    await createActivityEvent(ActivityEvent, {
      actorUserId: req.v2User.id,
      entityType: 'estimate',
      entityId: estimate.id,
      quoteId: quote.id,
      clientId: quote.clientId || null,
      visibility: 'client',
      eventType: `estimate_${decision}`,
      title: `Estimate ${decision.replaceAll('_', ' ')}`,
      message: `Client ${decision.replaceAll('_', ' ')} the estimate.`,
      data: {
        estimateId: estimate.id,
        decision,
        note: toNullableString(req.body.note)
      }
    }, 'estimate_response_activity');

    const managers = await findManagerRecipients();
    await notifyUsers(managers, (manager) => ({
      userId: manager.id,
      type: `estimate_${decision}`,
      title: `Estimate ${decision.replaceAll('_', ' ')}`,
      body: `Client response received for ${quote.projectType} in ${quote.location}.`,
      quoteId: quote.id,
      data: {
        quoteId: quote.id,
        estimateId: estimate.id,
        decision
      }
    }));

    const refreshedQuote = await attachEstimateMeta(quote);
    return ok(res, { quote: refreshedQuote, estimate });
  })
);

router.post(
  '/:id/convert-to-project',
  [
    authV2,
    roleCheckV2('manager', 'admin'),
    param('id').isUUID()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const quote = await Quote.findByPk(req.params.id, { include: quoteIncludes });
    if (!quote) return fail(res, 404, 'quote_not_found', 'Quote not found');
    if (quote.convertedProjectId) return fail(res, 409, 'quote_already_converted', 'Quote already converted to a project');

    const currentEstimate = quote.currentEstimateId
      ? await Estimate.findByPk(quote.currentEstimateId)
      : await Estimate.findOne({ where: { quoteId: quote.id, isCurrentVersion: true } });

    if (!normalizedCanConvert({
      workflowStatus: quote.workflowStatus,
      currentEstimate,
      convertedProjectId: quote.convertedProjectId
    })) {
      return fail(res, 409, 'quote_not_ready', 'Quote is not ready to convert into a project');
    }

    const project = await Project.create({
      title: buildQuoteProjectTitle(quote, currentEstimate),
      quoteId: quote.id,
      acceptedEstimateId: currentEstimate?.id || null,
      clientId: quote.clientId || null,
      assignedManagerId: quote.assignedManagerId || req.v2User.id,
      location: quote.location || null,
      description: quote.description || null,
      budgetEstimate: toMoneyString(currentEstimate?.total),
      status: 'planning',
      isActive: true
    });

    await quote.update(resolveWorkflowPayload('converted_to_project', {
      convertedProjectId: project.id
    }));

    let projectThread = null;
    if (typeof GroupThread?.create === 'function') {
      projectThread = await GroupThread.create({
        name: project.title,
        quoteId: quote.id,
        projectId: project.id,
        createdBy: req.v2User.id
      });

      if (typeof GroupMember?.findOrCreate === 'function') {
        await GroupMember.findOrCreate({
          where: { groupThreadId: projectThread.id, userId: req.v2User.id },
          defaults: { groupThreadId: projectThread.id, userId: req.v2User.id, role: 'admin' }
        });
        if (quote.clientId) {
          await GroupMember.findOrCreate({
            where: { groupThreadId: projectThread.id, userId: quote.clientId },
            defaults: { groupThreadId: projectThread.id, userId: quote.clientId, role: 'member' }
          });
        }
      }
    }

    await createQuoteEvent({
      quoteId: quote.id,
      actorUserId: req.v2User.id,
      eventType: 'project_created',
      visibility: 'client',
      message: 'Quote converted into a live project.',
      data: {
        projectId: project.id,
        acceptedEstimateId: currentEstimate?.id || null,
        groupThreadId: projectThread?.id || null
      }
    });

    const clientRecord = await loadClientRecord(quote.clientId);
    await advanceClientLifecycle(clientRecord, 'active_project');

    await createActivityEvent(ActivityEvent, {
      actorUserId: req.v2User.id,
      entityType: 'project',
      entityId: project.id,
      quoteId: quote.id,
      projectId: project.id,
      clientId: quote.clientId || null,
      visibility: 'client',
      eventType: 'project_created',
      title: 'Project created',
      message: 'Quote converted into a live project.',
      data: {
        acceptedEstimateId: currentEstimate?.id || null,
        groupThreadId: projectThread?.id || null
      }
    }, 'project_convert_activity');

    if (quote.clientId && typeof Notification?.create === 'function') {
      await Notification.create({
        userId: quote.clientId,
        type: 'project_created',
        title: 'New project created',
        body: `Your quote has been converted into project "${project.title}".`,
        quoteId: quote.id,
        data: {
          quoteId: quote.id,
          projectId: project.id
        }
      });
    }

    const refreshedQuote = await attachEstimateMeta(quote);
    return ok(res, { quote: refreshedQuote, project, thread: projectThread }, {}, 201);
  })
);

module.exports = router;
