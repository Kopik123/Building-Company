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
  NewQuote,
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
  normalizeEstimateStatus,
  normalizeWorkflowStatus
} = require('../../../utils/quoteWorkflow');
const { advanceClientLifecycle } = require('../../../utils/crmLifecycle');
const { createActivityEvent } = require('../../../utils/activityFeed');
const { parseQuoteProposalDetails, buildQuoteDescriptionFromProposal } = require('../../../utils/quoteProposal');
const { appendNewQuoteAttachmentEntries, toNewQuoteSummary } = require('../../../utils/newQuoteShape');
const {
  canAccessStagedNewQuote,
  getNewQuoteIncludeClient,
  hasNewQuoteStore: hasNewQuoteStoreForModel,
  loadStagedNewQuote: loadStagedNewQuoteForModel,
  matchesStagedQuoteFilters
} = require('../../../utils/quoteReviewData');
const {
  buildMergedQuoteReviewCollection,
  paginateQuoteReviewCollection
} = require('../../../utils/quoteReviewCollection');
const { loadAccessibleQuoteReviewRecord } = require('../../../utils/quoteReviewLookup');
const { authV2 } = require('../middleware/auth');
const { roleCheckV2 } = require('../middleware/roles');
const { ok, fail } = require('../utils/response');
const { QUOTE_CONTACT_METHODS, QUOTE_PRIORITIES, QUOTE_PROJECT_TYPES, QUOTE_STATUSES } = require('@building-company/contracts-v2');

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
    attributes: ['id', 'quoteId', 'title', 'status', 'decisionStatus', 'versionNumber', 'isCurrentVersion', 'notes', 'clientMessage', 'decisionNote', 'subtotal', 'total', 'sentAt', 'viewedAt', 'respondedAt', 'approvedAt', 'declinedAt', 'supersededById', 'supersededAt', 'createdAt', 'updatedAt'],
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

const formatEstimateVersionLabel = (estimate) => `v${Number(estimate?.versionNumber || 1)}`;
const canSendEstimateVersion = (estimate) =>
  Boolean(estimate?.isCurrentVersion)
  && normalizeEstimateStatus(estimate?.status) === 'draft';
const canRespondToEstimateVersion = (estimate) =>
  Boolean(estimate?.isCurrentVersion)
  && normalizeEstimateStatus(estimate?.status) === 'sent'
  && ['pending', 'viewed', 'revision_requested'].includes(normalizeEstimateDecisionStatus(estimate?.decisionStatus));

const buildSupersededEstimateMessage = (supersededEstimates, replacementEstimate) => {
  const supersededLabels = supersededEstimates.map((estimate) => formatEstimateVersionLabel(estimate)).join(', ');
  return `${supersededLabels} superseded by ${formatEstimateVersionLabel(replacementEstimate)}.`;
};

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

const newQuoteIncludeClient = getNewQuoteIncludeClient(User);
const hasNewQuoteStore = (method = 'findAll') => hasNewQuoteStoreForModel(NewQuote, method);
const loadStagedNewQuote = async (id) => loadStagedNewQuoteForModel(NewQuote, newQuoteIncludeClient, id);
const canAccessNewQuote = (newQuote, user) => canAccessStagedNewQuote(newQuote, user);

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

const supersedePreviousEstimates = async ({ quote, replacementEstimate, previousEstimates, actorUserId }) => {
  const currentEstimates = (previousEstimates || []).filter((estimate) => estimate?.id && estimate.id !== replacementEstimate.id && estimate.isCurrentVersion);
  if (!currentEstimates.length) return [];

  const supersededAt = new Date();
  await Promise.all(currentEstimates.map((estimate) => {
    if (typeof estimate.update !== 'function') return null;
    return estimate.update({
      isCurrentVersion: false,
      status: normalizeEstimateStatus(estimate.status) === 'archived' ? 'archived' : 'superseded',
      supersededById: replacementEstimate.id,
      supersededAt
    });
  }));

  const message = buildSupersededEstimateMessage(currentEstimates, replacementEstimate);
  await createQuoteEvent({
    quoteId: quote.id,
    actorUserId,
    eventType: 'estimate_superseded',
    visibility: 'internal',
    message,
    data: {
      supersededEstimateIds: currentEstimates.map((estimate) => estimate.id),
      supersededVersionNumbers: currentEstimates.map((estimate) => Number(estimate.versionNumber || 1)),
      replacementEstimateId: replacementEstimate.id,
      replacementVersionNumber: Number(replacementEstimate.versionNumber || 1)
    }
  });

  await createActivityEvent(ActivityEvent, {
    actorUserId,
    entityType: 'estimate',
    entityId: replacementEstimate.id,
    quoteId: quote.id,
    clientId: quote.clientId || null,
    visibility: 'internal',
    eventType: 'estimate_superseded',
    title: 'Estimate version replaced',
    message,
    data: {
      supersededEstimateIds: currentEstimates.map((estimate) => estimate.id),
      supersededVersionNumbers: currentEstimates.map((estimate) => Number(estimate.versionNumber || 1)),
      replacementEstimateId: replacementEstimate.id,
      replacementVersionNumber: Number(replacementEstimate.versionNumber || 1)
    }
  }, 'estimate_superseded_activity');

  return currentEstimates;
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
    const isClientView = String(req.v2User.role || '').toLowerCase() === 'client';
    if (isClientView) where.clientId = req.v2User.id;
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

    if (isClientView && hasNewQuoteStore()) {
      const [legacyQuotes, stagedNewQuotes] = await Promise.all([
        Quote.findAll({
          where,
          include: quoteIncludes,
          order: [['updatedAt', 'DESC']],
          distinct: true
        }),
        typeof NewQuote?.findAll === 'function'
          ? NewQuote.findAll({
            where: { clientId: req.v2User.id },
            include: newQuoteIncludeClient,
            order: [['updatedAt', 'DESC'], ['createdAt', 'DESC']]
          })
          : Promise.resolve([])
      ]);

      const mergedQuotes = buildMergedQuoteReviewCollection({
        legacyRecords: legacyQuotes,
        stagedRecords: stagedNewQuotes,
        mapLegacyRecord: hydrateQuotePayload,
        mapStagedRecord: toNewQuoteSummary,
        includeStagedRecord: (summary) => matchesStagedQuoteFilters(summary, req.query)
      });
      const quotes = paginateQuoteReviewCollection(mergedQuotes, { offset, pageSize });
      const total = mergedQuotes.length;
      return ok(res, { quotes }, { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
    }

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

    const reviewRecord = await loadAccessibleQuoteReviewRecord({
      id: req.params.id,
      user: req.v2User,
      loadLegacyQuote: loadQuote,
      loadStagedQuote: loadStagedNewQuote,
      canAccessLegacyQuote: canAccessQuote,
      canAccessStagedQuote: canAccessNewQuote
    });

    if (!reviewRecord) {
      return fail(res, 404, 'quote_not_found', 'Quote not found');
    }

    return ok(res, { quote: reviewRecord.isStaged ? toNewQuoteSummary(reviewRecord.record) : reviewRecord.record });
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

    const reviewRecord = await loadAccessibleQuoteReviewRecord({
      id: req.params.id,
      user: req.v2User,
      loadLegacyQuote: (id) => Quote.findByPk(id, { include: quoteIncludes }),
      loadStagedQuote: hasNewQuoteStore() ? loadStagedNewQuote : async () => null,
      canAccessLegacyQuote: canAccessQuote,
      canAccessStagedQuote: canAccessNewQuote
    });

    if (!reviewRecord) {
      await cleanupUploadedFiles(files);
      return fail(res, 404, 'quote_not_found', 'Quote not found');
    }

    const quote = reviewRecord.isLegacy ? reviewRecord.record : null;
    const stagedNewQuote = reviewRecord.isStaged ? reviewRecord.record : null;

    const attachmentValidationError = validateQuoteAttachmentFiles(files);
    if (attachmentValidationError) {
      await cleanupUploadedFiles(files);
      return fail(res, 400, 'invalid_attachments', attachmentValidationError);
    }

    if (!files.length) {
      await cleanupUploadedFiles(files);
      return fail(res, 400, 'missing_attachments', 'Attach at least one photo');
    }

    const existingAttachments = Array.isArray((quote || stagedNewQuote)?.attachments) ? (quote || stagedNewQuote).attachments : [];
    const existingCount = existingAttachments.length;
    const remainingSlots = Math.max(0, MAX_QUOTE_ATTACHMENT_FILES - existingCount);
    if (remainingSlots <= 0) {
      await cleanupUploadedFiles(files);
      return fail(res, 400, 'attachment_limit_reached', `This quote already has the maximum ${MAX_QUOTE_ATTACHMENT_FILES} photos.`);
    }
    if (files.length > remainingSlots) {
      await cleanupUploadedFiles(files);
      return fail(res, 400, 'attachment_limit_reached', `This quote can store up to ${MAX_QUOTE_ATTACHMENT_FILES} photos. You can add ${remainingSlots} more right now.`);
    }

    if (stagedNewQuote) {
      await stagedNewQuote.update({
        attachments: appendNewQuoteAttachmentEntries(existingAttachments, files)
      });
      const refreshedNewQuote = await loadStagedNewQuote(stagedNewQuote.id);
      const stagedSummary = toNewQuoteSummary(refreshedNewQuote || stagedNewQuote);
      return ok(res, { quote: stagedSummary, attachments: stagedSummary.attachments }, {}, 201);
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
    body('location').optional({ checkFalsy: true }).trim(),
    body('description').optional({ checkFalsy: true }).trim(),
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
    let proposalDetails;

    try {
      proposalDetails = parseQuoteProposalDetails(req.body.proposalDetails, {
        source: isClientCreate ? 'client_portal_quote_v2' : isGuest ? 'manager_created_guest_quote_v2' : 'manager_created_quote_v2'
      });
    } catch (error) {
      return fail(res, error.statusCode || 400, error.code || 'invalid_quote_proposal', error.message || 'Invalid quote proposal payload', error.details || null);
    }

    if (!clientId && !guestName && !guestEmail && !contactEmail) {
      return fail(res, 400, 'quote_contact_required', 'Guest quotes require at least a guest name or email');
    }

    const sourceChannel = isClientCreate ? 'client_portal' : isGuest ? 'manager_created_guest' : 'manager_created';
    const location = String(req.body.location || '').trim() || proposalDetails?.logistics?.location || '';
    const postcode = toNullableString(req.body.postcode) || proposalDetails?.logistics?.postcode || null;
    const budgetRange = toNullableString(req.body.budgetRange) || proposalDetails?.commercial?.budgetRange || null;
    const description = buildQuoteDescriptionFromProposal({
      description: String(req.body.description || '').trim(),
      proposalDetails,
      location,
      postcode,
      budgetRange
    });

    if (!description) {
      return fail(res, 400, 'quote_description_required', 'Provide a project brief before creating the quote');
    }
    if (!location) {
      return fail(res, 400, 'quote_location_required', 'Provide the project location before creating the quote');
    }

    const quote = await Quote.create({
      clientId,
      isGuest,
      guestName,
      guestEmail,
      guestPhone,
      contactMethod: req.body.contactMethod || null,
      publicToken: isGuest ? crypto.randomBytes(16).toString('hex') : null,
      projectType: req.body.projectType,
      location,
      postcode,
      budgetRange,
      proposalDetails,
      description,
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

    const reviewRecord = await loadAccessibleQuoteReviewRecord({
      id: req.params.id,
      user: req.v2User,
      loadLegacyQuote: (id) => Quote.findByPk(id),
      loadStagedQuote: loadStagedNewQuote,
      canAccessLegacyQuote: canAccessQuote,
      canAccessStagedQuote: canAccessNewQuote
    });
    if (!reviewRecord) {
      return fail(res, 404, 'quote_not_found', 'Quote not found');
    }
    if (reviewRecord.isStaged) {
      return fail(res, 400, 'quote_update_not_supported', 'Staged new quotes cannot be edited. Accept or reject the request instead.');
    }
    const quote = reviewRecord.record;

    const payload = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'projectType')) payload.projectType = req.body.projectType;
    if (Object.prototype.hasOwnProperty.call(req.body, 'location')) payload.location = toNullableString(req.body.location) || '';
    if (Object.prototype.hasOwnProperty.call(req.body, 'priority')) payload.priority = req.body.priority;
    if (Object.prototype.hasOwnProperty.call(req.body, 'contactMethod')) payload.contactMethod = req.body.contactMethod || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'clientId')) payload.clientId = req.body.clientId || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'assignedManagerId')) payload.assignedManagerId = req.body.assignedManagerId || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'nextActionAt')) payload.nextActionAt = req.body.nextActionAt || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'responseDeadline')) payload.responseDeadline = req.body.responseDeadline || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'lossReason')) payload.lossReason = toNullableString(req.body.lossReason);

    if (Object.prototype.hasOwnProperty.call(req.body, 'proposalDetails')) {
      try {
        payload.proposalDetails = parseQuoteProposalDetails(req.body.proposalDetails, {
          source: quote.sourceChannel || 'manager_updated_quote_v2'
        });
      } catch (error) {
        return fail(res, error.statusCode || 400, error.code || 'invalid_quote_proposal', error.message || 'Invalid quote proposal payload', error.details || null);
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'postcode')) {
      payload.postcode = toNullableString(req.body.postcode);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'budgetRange')) {
      payload.budgetRange = toNullableString(req.body.budgetRange);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'description') || Object.prototype.hasOwnProperty.call(req.body, 'proposalDetails')) {
      const nextLocation = Object.prototype.hasOwnProperty.call(payload, 'location') ? payload.location : quote.location;
      const nextPostcode = Object.prototype.hasOwnProperty.call(payload, 'postcode') ? payload.postcode : quote.postcode;
      const nextBudgetRange = Object.prototype.hasOwnProperty.call(payload, 'budgetRange') ? payload.budgetRange : quote.budgetRange;
      const nextProposalDetails = Object.prototype.hasOwnProperty.call(payload, 'proposalDetails') ? payload.proposalDetails : quote.proposalDetails;
      const nextDescription = buildQuoteDescriptionFromProposal({
        description: Object.prototype.hasOwnProperty.call(req.body, 'description') ? String(req.body.description || '').trim() : quote.description,
        proposalDetails: nextProposalDetails,
        location: nextLocation,
        postcode: nextPostcode,
        budgetRange: nextBudgetRange
      });

      if (!nextDescription) {
        return fail(res, 400, 'quote_description_required', 'Provide a project brief before updating the quote');
      }

      payload.description = nextDescription;
    }

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

    const reviewRecord = await loadAccessibleQuoteReviewRecord({
      id: req.params.id,
      user: req.v2User,
      loadLegacyQuote: (id) => Quote.findByPk(id),
      loadStagedQuote: loadStagedNewQuote,
      canAccessLegacyQuote: canAccessQuote,
      canAccessStagedQuote: canAccessNewQuote
    });
    if (!reviewRecord) {
      return fail(res, 404, 'quote_not_found', 'Quote not found');
    }
    if (reviewRecord.isStaged) {
      return ok(res, { events: [] });
    }
    const quote = reviewRecord.record;

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

    const reviewRecord = await loadAccessibleQuoteReviewRecord({
      id: req.params.id,
      user: req.v2User,
      loadLegacyQuote: (id) => Quote.findByPk(id),
      loadStagedQuote: loadStagedNewQuote,
      canAccessLegacyQuote: canAccessQuote,
      canAccessStagedQuote: canAccessNewQuote
    });
    if (!reviewRecord) {
      return fail(res, 404, 'quote_not_found', 'Quote not found');
    }
    if (reviewRecord.isStaged) {
      return ok(res, { estimates: [] });
    }
    const quote = reviewRecord.record;

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
      decisionNote: null,
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

    const supersededEstimates = await supersedePreviousEstimates({
      quote,
      replacementEstimate: estimate,
      previousEstimates: estimates,
      actorUserId: req.v2User.id
    });

    await quote.update(resolveWorkflowPayload('estimate_in_progress', {
      currentEstimateId: estimate.id
    }));
    await createQuoteEvent({
      quoteId: quote.id,
      actorUserId: req.v2User.id,
      eventType: 'estimate_drafted',
      visibility: 'internal',
      message: supersededEstimates.length
        ? `Estimate v${versionNumber} drafted and moved the previous current version to history.`
        : `Estimate v${versionNumber} drafted.`,
      data: {
        estimateId: estimate.id,
        versionNumber,
        supersededEstimateIds: supersededEstimates.map((item) => item.id)
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
      message: supersededEstimates.length
        ? `Estimate v${versionNumber} drafted and moved the previous current version to history.`
        : `Estimate v${versionNumber} drafted.`,
      data: {
        estimateId: estimate.id,
        versionNumber,
        supersededEstimateIds: supersededEstimates.map((item) => item.id)
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
    if (!canSendEstimateVersion(estimate)) {
      return fail(res, 409, 'estimate_not_sendable', 'Only the current draft estimate can be sent to the client');
    }

    await estimate.update({
      status: 'sent',
      decisionStatus: 'pending',
      clientMessage: toNullableString(req.body.clientMessage),
      decisionNote: null,
      sentAt: new Date(),
      viewedAt: null,
      respondedAt: null,
      approvedAt: null,
      declinedAt: null,
      supersededById: null,
      supersededAt: null
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
    if (!canRespondToEstimateVersion(estimate)) {
      return fail(res, 409, 'estimate_not_actionable', 'Only the current sent estimate can receive a client decision');
    }

    const decision = req.body.decision;
    const decisionNote = toNullableString(req.body.note);
    const updatePayload = {
      decisionStatus: decision,
      decisionNote,
      respondedAt: new Date()
    };
    let workflowStatus = 'estimate_in_progress';

    if (decision === 'accepted') {
      updatePayload.status = 'approved';
      updatePayload.approvedAt = new Date();
      updatePayload.declinedAt = null;
      workflowStatus = 'approved_ready_for_project';
    } else if (decision === 'declined') {
      updatePayload.declinedAt = new Date();
      updatePayload.approvedAt = null;
      workflowStatus = 'closed_lost';
    } else {
      updatePayload.approvedAt = null;
      updatePayload.declinedAt = null;
    }

    await estimate.update(updatePayload);
    await quote.update(resolveWorkflowPayload(workflowStatus, {
      lossReason: decision === 'declined' ? decisionNote : null
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
        note: decisionNote
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
        note: decisionNote
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
    const refreshedEstimate = await Estimate.findByPk(estimate.id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false }]
    });
    return ok(res, { quote: refreshedQuote, estimate: refreshedEstimate || estimate });
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
