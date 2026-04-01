const express = require('express');
const { createValidatedHandler, findByPkOrRespond } = require('./route-helpers');
const { buildQuoteRevisionPayload } = require('../../utils/revisionHistory');

const toTitleCase = (value) =>
  String(value || '')
    .replaceAll(/[_-]+/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .replaceAll(/\b\w/g, (char) => char.toUpperCase());

const buildProjectName = (quote) =>
  `${toTitleCase(quote.projectType)} - ${quote.guestName || quote.client?.name || 'Project'} (${quote.postcode || quote.location || 'Manchester'})`;

const buildProjectDescription = (quote) => {
  const parts = [
    quote.description ? `Client brief: ${quote.description}` : null,
    quote.scopeOfWork ? `Scope of work: ${quote.scopeOfWork}` : null,
    quote.materialsPlan ? `Materials plan: ${quote.materialsPlan}` : null,
    quote.labourEstimate ? `Labour estimate: ${quote.labourEstimate}` : null
  ].filter(Boolean);

  return parts.join('\n\n') || quote.description || null;
};

const formatWorkflowNotificationDetail = ({ siteVisitDate, siteVisitTimeWindow, proposedStartDate }) => {
  const visitWindow = siteVisitTimeWindow ? ` (${siteVisitTimeWindow})` : '';
  const visitDetail = siteVisitDate ? ` Visit: ${siteVisitDate}${visitWindow}.` : '';
  const startDetail = proposedStartDate ? ` Proposed start: ${proposedStartDate}.` : '';
  return `${visitDetail}${startDetail}`;
};

module.exports = function createQuoteRoutes({
  param,
  query,
  body,
  validationResult,
  asyncHandler,
  managerGuard,
  Quote,
  User,
  GroupThread,
  GroupMember,
  InboxThread,
  Notification,
  Project,
  Estimate,
  Op,
  fn,
  col,
  sqlWhere,
  MAX_PAGE_SIZE,
  getPagination,
  paginationDto,
  escapeLike,
  loadEstimateDetail,
  QUOTE_WORKFLOW_STATUSES,
  QUOTE_VISIT_STATUSES,
  QUOTE_CLIENT_DECISION_STATUSES,
  deriveLegacyQuoteStatus
}) {
  const router = express.Router();
  const withValidation = createValidatedHandler({ validationResult, asyncHandler });
  const quoteInclude = [
    { model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone'] },
    { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'] },
    {
      model: Estimate,
      as: 'estimates',
      attributes: [
        'id',
        'title',
        'status',
        'total',
        'updatedAt',
        'createdAt',
        'revisionNumber',
        'clientVisible',
        'sentToClientAt',
        'documentUrl',
        'documentFilename',
        'revisionHistory'
      ],
      required: false,
      separate: true,
      limit: 5,
      order: [['updatedAt', 'DESC'], ['createdAt', 'DESC']]
    }
  ];
  const inferWorkflowPayload = ({ quote, payload, managerChangedVisitPlan, managerPreparedEstimate }) => {
    const nextPayload = { ...payload };

    if (!nextPayload.workflowStatus && managerChangedVisitPlan) {
      nextPayload.workflowStatus = 'visit_proposed';
    }
    if (!nextPayload.siteVisitStatus && managerChangedVisitPlan) {
      nextPayload.siteVisitStatus = 'proposed';
    }
    if (!nextPayload.workflowStatus && managerPreparedEstimate) {
      nextPayload.workflowStatus = 'quote_requested';
    }
    if (!nextPayload.clientDecisionStatus && nextPayload.workflowStatus === 'accepted') {
      nextPayload.clientDecisionStatus = 'accepted';
    }
    if (!nextPayload.clientDecisionStatus && nextPayload.workflowStatus === 'rejected') {
      nextPayload.clientDecisionStatus = 'rejected';
    }
    if (!nextPayload.clientDecisionStatus && nextPayload.workflowStatus === 'changes_requested') {
      nextPayload.clientDecisionStatus = 'request_edit';
    }
    if (!nextPayload.workflowStatus && nextPayload.siteVisitStatus === 'confirmed') {
      nextPayload.workflowStatus = 'visit_confirmed';
    }
    if (!nextPayload.workflowStatus && nextPayload.siteVisitStatus === 'reschedule_requested') {
      nextPayload.workflowStatus = 'visit_reschedule_requested';
    }
    if (!nextPayload.workflowStatus && nextPayload.siteVisitStatus === 'completed') {
      nextPayload.workflowStatus = 'first_view';
    }
    if (!nextPayload.workflowStatus && nextPayload.clientDecisionStatus === 'accepted') {
      nextPayload.workflowStatus = 'accepted';
    }
    if (!nextPayload.workflowStatus && nextPayload.clientDecisionStatus === 'rejected') {
      nextPayload.workflowStatus = 'rejected';
    }
    if (!nextPayload.workflowStatus && nextPayload.clientDecisionStatus === 'request_edit') {
      nextPayload.workflowStatus = 'changes_requested';
    }
    if (nextPayload.workflowStatus === 'client_review' && !nextPayload.clientReviewStartedAt) {
      nextPayload.clientReviewStartedAt = new Date();
    }

    if (nextPayload.workflowStatus === 'archived') {
      nextPayload.archivedAt = new Date();
    } else if (nextPayload.workflowStatus !== undefined && quote.archivedAt) {
      nextPayload.archivedAt = null;
    }

    return nextPayload;
  };

  const ensurePrivateQuoteThread = async (quote, manager) => {
    if (!quote.clientId) return null;

    const [participantAId, participantBId] = [quote.clientId, manager.id].sort((a, b) => String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0);
    const [thread] = await InboxThread.findOrCreate({
      where: {
        participantAId,
        participantBId,
        quoteId: quote.id
      },
      defaults: {
        participantAId,
        participantBId,
        quoteId: quote.id,
        subject: `Quote discussion: ${buildProjectName(quote)}`
      }
    });

    return thread;
  };

  const notifyClient = async (quote, payload) => {
    if (!quote.clientId) return;
    await Notification.create({
      userId: quote.clientId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      quoteId: quote.id,
      data: payload.data || null
    });
  };

  router.post(
    '/quotes/:id/create-estimate-draft',
    [...managerGuard, param('id').isUUID()],
    withValidation(async (req, res) => {
      const quote = await findByPkOrRespond(Quote, req.params.id, res, {
        message: 'Quote not found',
        include: quoteInclude
      });
      if (!quote) return;

      const existingDraft = await Estimate.findOne({
        where: {
          quoteId: quote.id,
          isActive: true,
          status: 'draft'
        },
        order: [['updatedAt', 'DESC'], ['createdAt', 'DESC']]
      });

      if (existingDraft) {
        const detail = await loadEstimateDetail(existingDraft.id);
        return res.json({ estimate: detail, reused: true });
      }

      const estimate = await Estimate.create({
        projectId: null,
        quoteId: quote.id,
        createdById: req.user.id,
        title: `${buildProjectName(quote)} - Draft Estimate`,
        status: 'draft',
        notes: buildProjectDescription(quote),
        subtotal: 0,
        total: 0,
        isActive: true
      });

      const workflowStatus = String(quote.workflowStatus || '').trim().toLowerCase();
      const normalizedWorkflowStatus = QUOTE_WORKFLOW_STATUSES.includes(workflowStatus) ? workflowStatus : 'new';
      const nextWorkflowStatus = ['accepted', 'rejected', 'archived'].includes(normalizedWorkflowStatus)
        ? normalizedWorkflowStatus
        : 'quote_requested';
      const draftPayload = buildQuoteRevisionPayload({
        quote,
        actor: req.user,
        changeType: 'draft_estimate_created',
        changedFields: ['workflowStatus', 'status'],
        updates: {
          workflowStatus: nextWorkflowStatus,
          status: deriveLegacyQuoteStatus({
            workflowStatus: nextWorkflowStatus,
            assignedManagerId: quote.assignedManagerId,
            archivedAt: quote.archivedAt,
            clientDecisionStatus: quote.clientDecisionStatus
          })
        }
      });
      await quote.update(draftPayload);

      const detail = await loadEstimateDetail(estimate.id);
      return res.status(201).json({ estimate: detail, reused: false });
    })
  );

  router.post(
    '/quotes/:id/accept',
    [...managerGuard, param('id').isUUID()],
    withValidation(async (req, res) => {
      const quote = await findByPkOrRespond(Quote, req.params.id, res, {
        message: 'Quote not found',
        include: [{ model: User, as: 'client', attributes: ['id', 'name', 'email'] }]
      });
      if (!quote) return;

      if (quote.assignedManagerId) {
        return res.status(409).json({ error: 'Quote is already assigned to a manager' });
      }

      const normalizedWorkflowStatus = String(quote.workflowStatus || '').trim();
      const workflowStatus = ['new', 'archived', ''].includes(normalizedWorkflowStatus)
        ? 'manager_review'
        : normalizedWorkflowStatus;
      const acceptPayload = buildQuoteRevisionPayload({
        quote,
        actor: req.user,
        changeType: 'manager_accepted_quote',
        changedFields: ['assignedManagerId', 'workflowStatus', 'status'],
        updates: {
          assignedManagerId: req.user.id,
          workflowStatus,
          status: deriveLegacyQuoteStatus({
            workflowStatus,
            assignedManagerId: req.user.id,
            archivedAt: quote.archivedAt,
            clientDecisionStatus: quote.clientDecisionStatus
          })
        }
      });
      await quote.update(acceptPayload);

      const projectName = buildProjectName(quote);
      const groupThread = await GroupThread.create({
        name: projectName,
        quoteId: quote.id,
        createdBy: req.user.id
      });

      await GroupMember.create({
        groupThreadId: groupThread.id,
        userId: req.user.id,
        role: 'admin'
      });

      if (quote.clientId) {
        await GroupMember.create({
          groupThreadId: groupThread.id,
          userId: quote.clientId,
          role: 'member'
        });
      }

      const inboxThread = await ensurePrivateQuoteThread(quote, req.user);

      const otherManagers = await User.findAll({
        where: { role: { [Op.in]: ['manager', 'admin'] }, isActive: true, id: { [Op.ne]: req.user.id } }
      });

      if (otherManagers.length) {
        await Notification.bulkCreate(
          otherManagers.map((manager) => ({
            userId: manager.id,
            type: 'quote_accepted',
            title: `Quote accepted by ${req.user.name}`,
            body: `Manager ${req.user.name} accepted the quote for "${projectName}".`,
            quoteId: quote.id,
            data: { quoteId: quote.id, managerId: req.user.id, groupThreadId: groupThread.id, inboxThreadId: inboxThread?.id || null }
          }))
        );
      }

      if (quote.clientId) {
        await notifyClient(quote, {
          type: 'quote_manager_assigned',
          title: 'Your quote is now being reviewed',
          body: `Manager ${req.user.name} accepted your quote. Private messaging is available${inboxThread ? ', and a team discussion has been opened.' : '.'}`,
          data: {
            quoteId: quote.id,
            managerId: req.user.id,
            groupThreadId: groupThread.id,
            inboxThreadId: inboxThread?.id || null
          }
        });
      }

      return res.status(201).json({ quote, groupThread, inboxThread });
    })
  );

  router.patch(
    '/quotes/:id/workflow',
    [
      ...managerGuard,
      param('id').isUUID(),
      body('workflowStatus').optional().isIn(QUOTE_WORKFLOW_STATUSES),
      body('siteVisitStatus').optional().isIn(QUOTE_VISIT_STATUSES),
      body('siteVisitDate').optional({ nullable: true }).isISO8601(),
      body('siteVisitTimeWindow').optional({ nullable: true }).trim().isLength({ max: 120 }),
      body('proposedStartDate').optional({ nullable: true }).isISO8601(),
      body('scopeOfWork').optional({ nullable: true }).trim().isLength({ max: 6000 }),
      body('materialsPlan').optional({ nullable: true }).trim().isLength({ max: 6000 }),
      body('labourEstimate').optional({ nullable: true }).trim().isLength({ max: 6000 }),
      body('estimateDocumentUrl').optional({ nullable: true }).trim().isLength({ max: 2048 }),
      body('clientDecisionStatus').optional().isIn(QUOTE_CLIENT_DECISION_STATUSES),
      body('clientDecisionNotes').optional({ nullable: true }).trim().isLength({ max: 6000 }),
      body('createPrivateThread').optional().isBoolean().toBoolean()
    ],
    withValidation(async (req, res) => {
      const quote = await findByPkOrRespond(Quote, req.params.id, res, {
        message: 'Quote not found',
        include: [{ model: User, as: 'client', attributes: ['id', 'name', 'email'] }]
      });
      if (!quote) return;

      let payload = {};
      const managerChangedVisitPlan = (
        req.body.siteVisitDate !== undefined
        || req.body.siteVisitTimeWindow !== undefined
      );
      const managerPreparedEstimate = (
        req.body.scopeOfWork !== undefined
        || req.body.materialsPlan !== undefined
        || req.body.labourEstimate !== undefined
        || req.body.estimateDocumentUrl !== undefined
        || req.body.proposedStartDate !== undefined
      );

      if (req.body.workflowStatus !== undefined) payload.workflowStatus = req.body.workflowStatus;
      if (req.body.siteVisitStatus !== undefined) payload.siteVisitStatus = req.body.siteVisitStatus;
      if (req.body.siteVisitDate !== undefined) payload.siteVisitDate = req.body.siteVisitDate || null;
      if (req.body.siteVisitTimeWindow !== undefined) payload.siteVisitTimeWindow = String(req.body.siteVisitTimeWindow || '').trim() || null;
      if (req.body.proposedStartDate !== undefined) payload.proposedStartDate = req.body.proposedStartDate || null;
      if (req.body.scopeOfWork !== undefined) payload.scopeOfWork = String(req.body.scopeOfWork || '').trim() || null;
      if (req.body.materialsPlan !== undefined) payload.materialsPlan = String(req.body.materialsPlan || '').trim() || null;
      if (req.body.labourEstimate !== undefined) payload.labourEstimate = String(req.body.labourEstimate || '').trim() || null;
      if (req.body.estimateDocumentUrl !== undefined) payload.estimateDocumentUrl = String(req.body.estimateDocumentUrl || '').trim() || null;
      if (req.body.clientDecisionStatus !== undefined) payload.clientDecisionStatus = req.body.clientDecisionStatus;
      if (req.body.clientDecisionNotes !== undefined) payload.clientDecisionNotes = String(req.body.clientDecisionNotes || '').trim() || null;

      payload = inferWorkflowPayload({ quote, payload, managerChangedVisitPlan, managerPreparedEstimate });

      if (!Object.keys(payload).length) {
        return res.status(400).json({ error: 'No workflow changes provided' });
      }

      payload.status = deriveLegacyQuoteStatus({
        workflowStatus: payload.workflowStatus || quote.workflowStatus,
        assignedManagerId: quote.assignedManagerId,
        archivedAt: payload.archivedAt ?? quote.archivedAt,
        clientDecisionStatus: payload.clientDecisionStatus || quote.clientDecisionStatus
      });

      const historyPayload = buildQuoteRevisionPayload({
        quote,
        actor: req.user,
        changeType: 'workflow_updated',
        changedFields: Object.keys(payload),
        updates: payload
      });
      await quote.update(historyPayload);
      const inboxThread = req.body.createPrivateThread ? await ensurePrivateQuoteThread(quote, req.user) : null;

      if (quote.clientId) {
        const latestWorkflow = payload.workflowStatus || quote.workflowStatus;
        await notifyClient(quote, {
          type: 'quote_workflow_updated',
          title: 'Your quote has a new update',
          body: `Workflow stage: ${toTitleCase(latestWorkflow)}.${formatWorkflowNotificationDetail({
            siteVisitDate: payload.siteVisitDate || quote.siteVisitDate,
            siteVisitTimeWindow: payload.siteVisitTimeWindow || quote.siteVisitTimeWindow,
            proposedStartDate: payload.proposedStartDate || quote.proposedStartDate
          })}`,
          data: {
            quoteId: quote.id,
            workflowStatus: latestWorkflow,
            siteVisitStatus: payload.siteVisitStatus || quote.siteVisitStatus,
            siteVisitDate: payload.siteVisitDate || quote.siteVisitDate || null,
            siteVisitTimeWindow: payload.siteVisitTimeWindow || quote.siteVisitTimeWindow || null,
            proposedStartDate: payload.proposedStartDate || quote.proposedStartDate || null,
            inboxThreadId: inboxThread?.id || null
          }
        });
      }

      return res.json({ quote, inboxThread });
    })
  );

  router.post(
    '/quotes/:id/convert-to-project',
    [
      ...managerGuard,
      param('id').isUUID(),
      body('title').optional().trim().isLength({ min: 1, max: 255 })
    ],
    withValidation(async (req, res) => {
      const quote = await findByPkOrRespond(Quote, req.params.id, res, {
        message: 'Quote not found',
        include: [{ model: User, as: 'client', attributes: ['id', 'name', 'email'] }]
      });
      if (!quote) return;

      if (!quote.clientId) {
        return res.status(409).json({ error: 'Quote must be linked to a client account before creating a project' });
      }

      const decisionStatus = String(quote.clientDecisionStatus || '').trim().toLowerCase();
      const workflowStatus = String(quote.workflowStatus || '').trim().toLowerCase();
      if (decisionStatus !== 'accepted' && workflowStatus !== 'accepted') {
        return res.status(409).json({ error: 'Client must accept the quote before converting it into a project' });
      }

      const existingProject = await Project.findOne({ where: { quoteId: quote.id } });
      if (existingProject) {
        return res.status(409).json({ error: 'A project already exists for this quote' });
      }

      const project = await Project.create({
        title: String(req.body.title || '').trim() || buildProjectName(quote),
        quoteId: quote.id,
        clientId: quote.clientId,
        assignedManagerId: quote.assignedManagerId || req.user.id,
        location: quote.location,
        description: buildProjectDescription(quote),
        status: 'planning',
        budgetEstimate: quote.budgetRange || null,
        startDate: quote.proposedStartDate || null,
        isActive: true
      });

      const archivePayload = buildQuoteRevisionPayload({
        quote,
        actor: req.user,
        changeType: 'converted_to_project',
        changedFields: ['workflowStatus', 'archivedAt', 'status'],
        updates: {
          workflowStatus: 'archived',
          archivedAt: new Date(),
          status: 'closed'
        }
      });
      await quote.update(archivePayload);

      await notifyClient(quote, {
        type: 'project_created_from_quote',
        title: 'Your project workspace is ready',
        body: `A project has been created from your accepted quote: ${project.title}.`,
        data: {
          quoteId: quote.id,
          projectId: project.id
        }
      });

      return res.status(201).json({ project, quote });
    })
  );

  router.post(
    '/quotes/:id/reject',
    [
      ...managerGuard,
      param('id').isUUID(),
      body('reason').optional({ nullable: true }).trim().isLength({ max: 2000 })
    ],
    withValidation(async (req, res) => {
      const quote = await findByPkOrRespond(Quote, req.params.id, res, {
        message: 'Quote not found',
        include: [{ model: User, as: 'client', attributes: ['id', 'name', 'email'] }]
      });
      if (!quote) return;

      if (quote.archivedAt) {
        return res.status(409).json({ error: 'Quote is already archived' });
      }

      const reason = String(req.body.reason || '').trim() || null;
      const rejectPayload = buildQuoteRevisionPayload({
        quote,
        actor: req.user,
        changeType: 'manager_rejected_quote',
        changedFields: ['workflowStatus', 'archivedAt', 'status'],
        updates: {
          workflowStatus: 'rejected',
          archivedAt: new Date(),
          status: 'closed'
        },
        ...(reason ? { notes: reason } : {})
      });
      await quote.update(rejectPayload);

      if (quote.clientId) {
        await notifyClient(quote, {
          type: 'quote_rejected',
          title: 'Your quote enquiry has been closed',
          body: reason
            ? `Your quote has been reviewed and closed by our team. Reason: ${reason}`
            : 'Your quote has been reviewed and closed by our team.',
          data: { quoteId: quote.id, reason }
        });
      }

      return res.json({ quote });
    })
  );

  router.get(
    '/quotes/:id/revisions',
    [...managerGuard, param('id').isUUID()],
    withValidation(async (req, res) => {
      const quote = await findByPkOrRespond(Quote, req.params.id, res, {
        message: 'Quote not found'
      });
      if (!quote) return;

      return res.json({ revisions: Array.isArray(quote.revisionHistory) ? quote.revisionHistory : [] });
    })
  );

  router.get(
    '/quotes',
    [
      ...managerGuard,
      query('status').optional().isIn(['pending', 'in_progress', 'responded', 'closed']),
      query('priority').optional().isIn(['low', 'medium', 'high']),
      query('projectType').optional().isIn(['bathroom', 'kitchen', 'interior', 'tiling', 'extension', 'joinery', 'rendering', 'decorating', 'other']),
      query('workflowStatus').optional().isIn(QUOTE_WORKFLOW_STATUSES),
      query('clientDecisionStatus').optional().isIn(QUOTE_CLIENT_DECISION_STATUSES),
      query('showArchived').optional().isBoolean().toBoolean(),
      query('q').optional().trim().isLength({ min: 1, max: 255 }),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
    ],
    withValidation(async (req, res) => {
      const where = {};
      if (req.query.status) where.status = req.query.status;
      if (req.query.priority) where.priority = req.query.priority;
      if (req.query.projectType) where.projectType = req.query.projectType;
      if (req.query.workflowStatus) where.workflowStatus = req.query.workflowStatus;
      if (req.query.clientDecisionStatus) where.clientDecisionStatus = req.query.clientDecisionStatus;

      const showArchived = req.query.showArchived === true;
      if (!showArchived) {
        where.archivedAt = null;
      }

      if (req.query.q) {
        const needle = `%${escapeLike(String(req.query.q || '').trim().toLowerCase())}%`;
        where[Op.or] = [
          sqlWhere(fn('LOWER', col('guestName')), { [Op.like]: needle }),
          sqlWhere(fn('LOWER', col('guestEmail')), { [Op.like]: needle }),
          sqlWhere(fn('LOWER', col('location')), { [Op.like]: needle }),
          sqlWhere(fn('LOWER', col('postcode')), { [Op.like]: needle }),
          sqlWhere(fn('LOWER', col('client.email')), { [Op.like]: needle }),
          sqlWhere(fn('LOWER', col('client.name')), { [Op.like]: needle })
        ];
      }

      const { page, pageSize, offset } = getPagination(req);
      const { rows, count } = await Quote.findAndCountAll({
        where,
        include: quoteInclude,
        order: [['createdAt', 'DESC']],
        distinct: true,
        limit: pageSize,
        offset
      });

      return res.json({
        quotes: rows,
        pagination: paginationDto(page, pageSize, count)
      });
    })
  );

  router.get(
    '/quotes/:id',
    [...managerGuard, param('id').isUUID()],
    withValidation(async (req, res) => {
      const quote = await findByPkOrRespond(Quote, req.params.id, res, {
        message: 'Quote not found',
        include: quoteInclude
      });
      if (!quote) return;

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
    withValidation(async (req, res) => {
      const quote = await findByPkOrRespond(Quote, req.params.id, res, { message: 'Quote not found' });
      if (!quote) return;

      const payload = {};
      if (req.body.status !== undefined) payload.status = req.body.status;
      if (req.body.priority !== undefined) payload.priority = req.body.priority;

      if (!Object.keys(payload).length) {
        return res.status(400).json({ error: 'No changes provided' });
      }

      await quote.update(payload);
      return res.json({ quote });
    })
  );

  return router;
};
