const express = require('express');
const { Op } = require('sequelize');
const { body, param, query, validationResult } = require('express-validator');
const { upload } = require('../../../utils/upload');
const {
  MAX_QUOTE_ATTACHMENT_FILES,
  cleanupUploadedFiles,
  validateQuoteAttachmentFiles
} = require('../../../utils/quoteAttachments');
const {
  ActivityEvent,
  GroupMember,
  GroupThread,
  NewQuote,
  Notification,
  Project,
  ProjectMedia,
  User,
  sequelize
} = require('../../../models');
const asyncHandler = require('../../../utils/asyncHandler');
const { authV2 } = require('../middleware/auth');
const { roleCheckV2 } = require('../middleware/roles');
const { ok, fail } = require('../utils/response');
const { parseQuoteProposalDetails, buildQuoteDescriptionFromProposal } = require('../../../utils/quoteProposal');
const { resolveQuoteReferenceCode } = require('../../../utils/quoteReference');
const { advanceClientLifecycle } = require('../../../utils/crmLifecycle');
const { createActivityEvent } = require('../../../utils/activityFeed');
const {
  appendNewQuoteAttachmentEntries,
  createNewQuoteAttachmentEntries,
  toNewQuoteSummary
} = require('../../../utils/newQuoteShape');
const { createStagedNewQuoteWorkflow } = require('../../../utils/stagedNewQuoteWorkflow');

const router = express.Router();
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const PROJECT_TYPES = ['bathroom', 'kitchen', 'interior', 'tiling', 'extension', 'joinery', 'rendering', 'decorating', 'other'];

const hasNewQuoteStore = () => typeof NewQuote?.create === 'function';
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizePhone = (value) => String(value || '').trim();
const escapeLike = (value) => String(value || '').replace(/[\\%_]/g, '\\$&');
const toQueryText = (value) => `%${escapeLike(String(value || '').trim())}%`;
const canAccessNewQuote = (newQuote, user) => {
  if (!newQuote || !user) return false;
  const role = String(user.role || '').toLowerCase();
  if (role === 'client') return newQuote.clientId === user.id;
  return ['manager', 'admin', 'employee'].includes(role);
};
const getPagination = (req) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE));
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize
  };
};

const includeClient = [{ model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone', 'companyName'], required: false }];

const loadNewQuote = async (id) => {
  if (typeof NewQuote?.findByPk !== 'function') return null;
  return NewQuote.findByPk(id, { include: includeClient });
};

const findManagerRecipients = async (options = null) => {
  if (typeof User?.findAll !== 'function') return [];
  return User.findAll({
    where: {
      role: { [Op.in]: ['manager', 'admin'] },
      isActive: true
    },
    ...(options || {})
  });
};

const withNewQuoteTransaction = async (handler) => {
  if (typeof sequelize?.transaction !== 'function') {
    return handler(null);
  }

  return sequelize.transaction(async (transaction) => handler(transaction));
};

const stagedNewQuoteWorkflow = createStagedNewQuoteWorkflow({
  sequelize,
  Project,
  ProjectMedia,
  GroupThread,
  GroupMember,
  Notification,
  User,
  ActivityEvent,
  advanceClientLifecycle,
  createActivityEvent
});

router.get(
  '/',
  [
    authV2,
    roleCheckV2('client', 'manager', 'admin'),
    query('projectType').optional().isIn(PROJECT_TYPES),
    query('q').optional().trim().isLength({ min: 1, max: 255 }),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
  ],
  asyncHandler(async (req, res) => {
    if (!hasNewQuoteStore()) {
      return fail(res, 503, 'new_quote_store_unavailable', 'New quote storage is not available');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const where = {};
    if (String(req.v2User.role || '').toLowerCase() === 'client') {
      where.clientId = req.v2User.id;
    }
    if (req.query.projectType) {
      where.projectType = req.query.projectType;
    }
    if (req.query.q) {
      const needle = toQueryText(req.query.q);
      where[Op.or] = [
        { quoteRef: { [Op.iLike]: needle } },
        { clientName: { [Op.iLike]: needle } },
        { clientEmail: { [Op.iLike]: needle } },
        { location: { [Op.iLike]: needle } },
        { postcode: { [Op.iLike]: needle } }
      ];
    }

    const { page, pageSize, offset } = getPagination(req);
    const response = typeof NewQuote.findAndCountAll === 'function'
      ? await NewQuote.findAndCountAll({
        where,
        include: includeClient,
        order: [['createdAt', 'DESC']],
        limit: pageSize,
        offset
      })
      : {
        rows: await NewQuote.findAll({ where, include: includeClient, order: [['createdAt', 'DESC']] }),
        count: 0
      };

    const rows = Array.isArray(response.rows) ? response.rows : [];
    const total = Number(response.count || rows.length || 0);
    return ok(res, {
      newQuotes: rows.map(toNewQuoteSummary),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  })
);

router.get(
  '/:id',
  [authV2, roleCheckV2('client', 'manager', 'admin'), param('id').isUUID()],
  asyncHandler(async (req, res) => {
    if (!hasNewQuoteStore()) {
      return fail(res, 503, 'new_quote_store_unavailable', 'New quote storage is not available');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const newQuote = await loadNewQuote(req.params.id);
    if (!newQuote) return fail(res, 404, 'new_quote_not_found', 'New quote not found');
    if (!canAccessNewQuote(newQuote, req.v2User)) {
      return fail(res, 403, 'new_quote_forbidden', 'You do not have access to this new quote');
    }

    return ok(res, { newQuote: toNewQuoteSummary(newQuote) });
  })
);

router.post(
  '/',
  upload.array('files', MAX_QUOTE_ATTACHMENT_FILES),
  [
    authV2,
    roleCheckV2('client'),
    body('projectType').isIn(PROJECT_TYPES),
    body('location').optional({ checkFalsy: true }).trim(),
    body('postcode').optional({ checkFalsy: true }).trim(),
    body('description').optional({ checkFalsy: true }).trim(),
    body('budgetRange').optional().trim(),
    body('name').optional({ nullable: true }).trim(),
    body('email').optional({ nullable: true }).trim(),
    body('phone').optional({ nullable: true }).trim()
  ],
  asyncHandler(async (req, res) => {
    const files = Array.isArray(req.files) ? req.files : [];
    if (!hasNewQuoteStore()) {
      await cleanupUploadedFiles(files);
      return fail(res, 503, 'new_quote_store_unavailable', 'New quote storage is not available');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await cleanupUploadedFiles(files);
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const projectType = String(req.body.projectType || '').trim();
    const rawDescription = String(req.body.description || '').trim();
    let proposalDetails;

    try {
      proposalDetails = parseQuoteProposalDetails(req.body.proposalDetails, {
        source: 'client_quote_form_v2'
      });
    } catch (error) {
      await cleanupUploadedFiles(files);
      return fail(res, error.statusCode || 400, 'invalid_proposal_payload', error.message || 'Invalid quote proposal payload', error.details || null);
    }

    const accountName = String(req.v2User.name || '').trim();
    const accountEmail = normalizeEmail(req.v2User.email);
    const accountPhone = normalizePhone(req.v2User.phone);
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

    if (!description) {
      await cleanupUploadedFiles(files);
      return fail(res, 400, 'missing_description', 'Provide a project brief before sending the quote.');
    }

    const attachmentValidationError = validateQuoteAttachmentFiles(files);
    if (attachmentValidationError) {
      await cleanupUploadedFiles(files);
      return fail(res, 400, 'invalid_attachments', attachmentValidationError);
    }

    const quoteRef = await resolveQuoteReferenceCode(NewQuote, {
      id: req.v2User.id,
      createdAt: new Date(),
      postcode,
      guestPhone: accountPhone,
      guestEmail: accountEmail,
      contactPhone: accountPhone,
      contactEmail: accountEmail,
      location,
      projectType
    });

    let created;
    try {
      created = await withNewQuoteTransaction(async (transaction) => {
        const transactionOptions = transaction ? { transaction } : undefined;
        const stagedQuote = await NewQuote.create({
          quoteRef,
          clientId: req.v2User.id,
          clientName: accountName || String(req.body.name || '').trim() || null,
          clientEmail: accountEmail || normalizeEmail(req.body.email) || null,
          clientPhone: accountPhone || normalizePhone(req.body.phone) || null,
          projectType,
          location,
          postcode: postcode || null,
          budgetRange,
          proposalDetails,
          description,
          attachments: createNewQuoteAttachmentEntries(files),
          sourceChannel: 'client_quote_portal'
        }, transactionOptions);

        const clientRecord = typeof User?.findByPk === 'function'
          ? await User.findByPk(req.v2User.id, transactionOptions)
          : req.v2User;
        await advanceClientLifecycle(clientRecord, 'quoted', transactionOptions);

        await createActivityEvent(ActivityEvent, {
          actorUserId: req.v2User.id,
          entityType: 'new_quote',
          entityId: stagedQuote.id,
          clientId: req.v2User.id,
          visibility: 'internal',
          eventType: 'new_quote_submitted',
          title: 'Client quote request submitted',
          message: `Client submitted staged quote ${quoteRef}.`,
          data: {
            quoteRef,
            projectType,
            location,
            attachmentCount: Array.isArray(stagedQuote.attachments) ? stagedQuote.attachments.length : 0
          }
        }, 'client_new_quote_submit_activity', transactionOptions);

        const managerRecipients = await findManagerRecipients(transactionOptions);
        if (managerRecipients.length && typeof Notification?.bulkCreate === 'function') {
          await Notification.bulkCreate(managerRecipients.map((user) => ({
            userId: user.id,
            type: 'new_quote_submitted',
            title: `New quote request ${quoteRef}`,
            body: `${accountName || accountEmail || 'Client'} submitted a new quote request for ${projectType} in ${location}.`,
            data: {
              newQuoteId: stagedQuote.id,
              quoteRef,
              clientId: req.v2User.id
            }
          })), transactionOptions);
        }

        return stagedQuote;
      });
    } catch (error) {
      await cleanupUploadedFiles(files);
      throw error;
    }

    const hydrated = await loadNewQuote(created.id);
    return ok(res, { newQuote: toNewQuoteSummary(hydrated || created) }, {}, 201);
  })
);

router.post(
  '/:id/attachments',
  upload.array('files', MAX_QUOTE_ATTACHMENT_FILES),
  [authV2, roleCheckV2('client', 'manager', 'admin'), param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const files = Array.isArray(req.files) ? req.files : [];
    if (!hasNewQuoteStore()) {
      await cleanupUploadedFiles(files);
      return fail(res, 503, 'new_quote_store_unavailable', 'New quote storage is not available');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await cleanupUploadedFiles(files);
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const newQuote = await loadNewQuote(req.params.id);
    if (!newQuote) {
      await cleanupUploadedFiles(files);
      return fail(res, 404, 'new_quote_not_found', 'New quote not found');
    }
    if (!canAccessNewQuote(newQuote, req.v2User)) {
      await cleanupUploadedFiles(files);
      return fail(res, 403, 'new_quote_forbidden', 'You do not have access to this new quote');
    }

    const attachmentValidationError = validateQuoteAttachmentFiles(files);
    if (attachmentValidationError) {
      await cleanupUploadedFiles(files);
      return fail(res, 400, 'invalid_attachments', attachmentValidationError);
    }

    const existingAttachments = Array.isArray(newQuote.attachments) ? newQuote.attachments : [];
    if (existingAttachments.length + files.length > MAX_QUOTE_ATTACHMENT_FILES) {
      await cleanupUploadedFiles(files);
      return fail(res, 400, 'attachment_limit_reached', `Attach up to ${MAX_QUOTE_ATTACHMENT_FILES} photos per quote.`);
    }

    await newQuote.update({
      attachments: appendNewQuoteAttachmentEntries(existingAttachments, files)
    });

    const refreshed = await loadNewQuote(newQuote.id);
    return ok(res, { newQuote: toNewQuoteSummary(refreshed || newQuote) }, {}, 201);
  })
);

router.post(
  '/:id/accept',
  [authV2, roleCheckV2('manager', 'admin'), param('id').isUUID()],
  asyncHandler(async (req, res) => {
    if (!hasNewQuoteStore()) {
      return fail(res, 503, 'new_quote_store_unavailable', 'New quote storage is not available');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const newQuote = await loadNewQuote(req.params.id);
    if (!newQuote) return fail(res, 404, 'new_quote_not_found', 'New quote not found');
    const result = await stagedNewQuoteWorkflow.accept(newQuote, req.v2User, {
      buildAcceptClientNotification: ({ newQuote: activeNewQuote, project }) => ({
        type: 'project_created',
        title: 'New project created',
        body: `Your request ${activeNewQuote.quoteRef} has been accepted and converted into project "${project.title}".`,
        data: {
          newQuoteId: activeNewQuote.id,
          quoteRef: activeNewQuote.quoteRef,
          projectId: project.id
        }
      }),
      buildAcceptActivity: ({ newQuote: activeNewQuote, actorUser, project, groupThread }) => ({
        actorUserId: actorUser.id,
        entityType: 'project',
        entityId: project.id,
        projectId: project.id,
        clientId: activeNewQuote.clientId || null,
        visibility: 'client',
        eventType: 'project_created_from_new_quote',
        title: 'Project created',
        message: `Quote request ${activeNewQuote.quoteRef} was accepted and converted into project "${project.title}".`,
        data: {
          newQuoteId: activeNewQuote.id,
          quoteRef: activeNewQuote.quoteRef,
          groupThreadId: groupThread?.id || null
        }
      }),
      acceptActivityContext: 'new_quote_accept_project_activity'
    });
    const responsePayload = {
      accepted: true,
      deleted: true,
      newQuoteId: newQuote.id,
      quoteRef: newQuote.quoteRef,
      project: result?.project || null,
      thread: result?.groupThread || null
    };
    return ok(res, responsePayload, {}, 201);
  })
);

router.post(
  '/:id/reject',
  [authV2, roleCheckV2('manager', 'admin'), param('id').isUUID()],
  asyncHandler(async (req, res) => {
    if (!hasNewQuoteStore()) {
      return fail(res, 503, 'new_quote_store_unavailable', 'New quote storage is not available');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const newQuote = await loadNewQuote(req.params.id);
    if (!newQuote) return fail(res, 404, 'new_quote_not_found', 'New quote not found');

    await stagedNewQuoteWorkflow.reject(newQuote, req.v2User, {
      buildRejectClientNotification: ({ newQuote: activeNewQuote }) => ({
        type: 'quote_rejected',
        title: 'Quote request not progressed',
        body: `Your request ${activeNewQuote.quoteRef} was not progressed and has been removed from the review queue.`,
        data: {
          newQuoteId: activeNewQuote.id,
          quoteRef: activeNewQuote.quoteRef
        }
      }),
      buildRejectActivity: ({ newQuote: activeNewQuote, actorUser }) => ({
        actorUserId: actorUser.id,
        entityType: 'new_quote',
        entityId: activeNewQuote.id,
        clientId: activeNewQuote.clientId || null,
        visibility: 'internal',
        eventType: 'new_quote_rejected',
        title: 'Quote request rejected',
        message: `Quote request ${activeNewQuote.quoteRef} was rejected and removed from staging.`,
        data: {
          quoteRef: activeNewQuote.quoteRef
        }
      }),
      rejectActivityContext: 'new_quote_reject_activity'
    });
    return ok(res, {
      rejected: true,
      deleted: true,
      newQuoteId: newQuote.id,
      quoteRef: newQuote.quoteRef
    });
  })
);

module.exports = router;
