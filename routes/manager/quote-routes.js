const express = require('express');
const { createValidatedHandler, findByPkOrRespond } = require('./route-helpers');

const toTitleCase = (value) =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

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
  Op,
  fn,
  col,
  sqlWhere,
  MAX_PAGE_SIZE,
  getPagination,
  paginationDto,
  escapeLike,
  QUOTE_WORKFLOW_STATUSES,
  QUOTE_VISIT_STATUSES,
  QUOTE_CLIENT_DECISION_STATUSES,
  deriveLegacyQuoteStatus
}) {
  const router = express.Router();
  const withValidation = createValidatedHandler({ validationResult, asyncHandler });
  const quoteInclude = [
    { model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone'] },
    { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'] }
  ];

  const ensurePrivateQuoteThread = async (quote, manager) => {
    if (!quote.clientId) return null;

    const [participantAId, participantBId] = [quote.clientId, manager.id].sort();
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

      const workflowStatus = ['new', 'archived'].includes(String(quote.workflowStatus || '').trim())
        ? 'manager_review'
        : String(quote.workflowStatus || '').trim() || 'manager_review';
      await quote.update({
        assignedManagerId: req.user.id,
        workflowStatus,
        status: deriveLegacyQuoteStatus({
          workflowStatus,
          assignedManagerId: req.user.id,
          archivedAt: quote.archivedAt,
          clientDecisionStatus: quote.clientDecisionStatus
        })
      });

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
          body: `Manager ${req.user.name} accepted your quote. A private conversation route is ready in your workspace${inboxThread ? ' and the project chat has been opened.' : '.'}`,
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

      const payload = {};
      const managerChangedVisitPlan = (
        typeof req.body.siteVisitDate !== 'undefined'
        || typeof req.body.siteVisitTimeWindow !== 'undefined'
      );
      const managerPreparedEstimate = (
        typeof req.body.scopeOfWork !== 'undefined'
        || typeof req.body.materialsPlan !== 'undefined'
        || typeof req.body.labourEstimate !== 'undefined'
        || typeof req.body.estimateDocumentUrl !== 'undefined'
        || typeof req.body.proposedStartDate !== 'undefined'
      );

      if (typeof req.body.workflowStatus !== 'undefined') payload.workflowStatus = req.body.workflowStatus;
      if (typeof req.body.siteVisitStatus !== 'undefined') payload.siteVisitStatus = req.body.siteVisitStatus;
      if (typeof req.body.siteVisitDate !== 'undefined') payload.siteVisitDate = req.body.siteVisitDate || null;
      if (typeof req.body.siteVisitTimeWindow !== 'undefined') payload.siteVisitTimeWindow = String(req.body.siteVisitTimeWindow || '').trim() || null;
      if (typeof req.body.proposedStartDate !== 'undefined') payload.proposedStartDate = req.body.proposedStartDate || null;
      if (typeof req.body.scopeOfWork !== 'undefined') payload.scopeOfWork = String(req.body.scopeOfWork || '').trim() || null;
      if (typeof req.body.materialsPlan !== 'undefined') payload.materialsPlan = String(req.body.materialsPlan || '').trim() || null;
      if (typeof req.body.labourEstimate !== 'undefined') payload.labourEstimate = String(req.body.labourEstimate || '').trim() || null;
      if (typeof req.body.estimateDocumentUrl !== 'undefined') payload.estimateDocumentUrl = String(req.body.estimateDocumentUrl || '').trim() || null;
      if (typeof req.body.clientDecisionStatus !== 'undefined') payload.clientDecisionStatus = req.body.clientDecisionStatus;
      if (typeof req.body.clientDecisionNotes !== 'undefined') payload.clientDecisionNotes = String(req.body.clientDecisionNotes || '').trim() || null;

      if (!payload.workflowStatus && managerChangedVisitPlan) {
        payload.workflowStatus = 'visit_proposed';
      }
      if (!payload.siteVisitStatus && managerChangedVisitPlan) {
        payload.siteVisitStatus = 'proposed';
      }
      if (!payload.workflowStatus && managerPreparedEstimate) {
        payload.workflowStatus = 'quote_requested';
      }
      if (!payload.clientDecisionStatus && payload.workflowStatus === 'accepted') {
        payload.clientDecisionStatus = 'accepted';
      }
      if (!payload.clientDecisionStatus && payload.workflowStatus === 'rejected') {
        payload.clientDecisionStatus = 'rejected';
      }
      if (!payload.clientDecisionStatus && payload.workflowStatus === 'changes_requested') {
        payload.clientDecisionStatus = 'request_edit';
      }
      if (!payload.workflowStatus && payload.siteVisitStatus === 'confirmed') {
        payload.workflowStatus = 'visit_confirmed';
      }
      if (!payload.workflowStatus && payload.siteVisitStatus === 'reschedule_requested') {
        payload.workflowStatus = 'visit_reschedule_requested';
      }
      if (!payload.workflowStatus && payload.siteVisitStatus === 'completed') {
        payload.workflowStatus = 'first_view';
      }
      if (!payload.workflowStatus && payload.clientDecisionStatus === 'accepted') {
        payload.workflowStatus = 'accepted';
      }
      if (!payload.workflowStatus && payload.clientDecisionStatus === 'rejected') {
        payload.workflowStatus = 'rejected';
      }
      if (!payload.workflowStatus && payload.clientDecisionStatus === 'request_edit') {
        payload.workflowStatus = 'changes_requested';
      }

      if (payload.workflowStatus === 'archived') {
        payload.archivedAt = new Date();
      } else if (typeof req.body.workflowStatus !== 'undefined' && quote.archivedAt) {
        payload.archivedAt = null;
      }

      if (!Object.keys(payload).length) {
        return res.status(400).json({ error: 'No workflow changes provided' });
      }

      payload.status = deriveLegacyQuoteStatus({
        workflowStatus: payload.workflowStatus || quote.workflowStatus,
        assignedManagerId: quote.assignedManagerId,
        archivedAt: payload.archivedAt ?? quote.archivedAt,
        clientDecisionStatus: payload.clientDecisionStatus || quote.clientDecisionStatus
      });

      await quote.update(payload);
      const inboxThread = req.body.createPrivateThread ? await ensurePrivateQuoteThread(quote, req.user) : null;

      if (quote.clientId) {
        const latestWorkflow = payload.workflowStatus || quote.workflowStatus;
        const visitDetail = payload.siteVisitDate || quote.siteVisitDate
          ? ` Visit: ${payload.siteVisitDate || quote.siteVisitDate}${payload.siteVisitTimeWindow || quote.siteVisitTimeWindow ? ` (${payload.siteVisitTimeWindow || quote.siteVisitTimeWindow})` : ''}.`
          : '';
        const startDetail = payload.proposedStartDate || quote.proposedStartDate
          ? ` Proposed start: ${payload.proposedStartDate || quote.proposedStartDate}.`
          : '';
        await notifyClient(quote, {
          type: 'quote_workflow_updated',
          title: 'Your quote has a new update',
          body: `Workflow stage: ${toTitleCase(latestWorkflow)}.${visitDetail}${startDetail}`,
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

      await quote.update({
        workflowStatus: 'archived',
        archivedAt: new Date(),
        status: 'closed'
      });

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

  router.get(
    '/quotes',
    [
      ...managerGuard,
      query('status').optional().isIn(['pending', 'in_progress', 'responded', 'closed']),
      query('priority').optional().isIn(['low', 'medium', 'high']),
      query('projectType').optional().isIn(['bathroom', 'kitchen', 'interior', 'tiling', 'extension', 'joinery', 'rendering', 'decorating', 'other']),
      query('workflowStatus').optional().isIn(QUOTE_WORKFLOW_STATUSES),
      query('clientDecisionStatus').optional().isIn(QUOTE_CLIENT_DECISION_STATUSES),
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
