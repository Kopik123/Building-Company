const express = require('express');
const { ActivityEvent } = require('../../models');
const { deriveLegacyQuoteStatus } = require('../../utils/quoteWorkflow');
const { advanceClientLifecycle } = require('../../utils/crmLifecycle');
const { createActivityEvent } = require('../../utils/activityFeed');
const { toNewQuoteSummary } = require('../../utils/newQuoteShape');
const { createStagedNewQuoteWorkflow } = require('../../utils/stagedNewQuoteWorkflow');
const {
  getNewQuoteIncludeClient,
  hasNewQuoteStore: hasNewQuoteStoreForModel,
  loadStagedNewQuote: loadStagedNewQuoteForModel,
  matchesStagedQuoteFilters,
  toLegacyQuoteSummary
} = require('../../utils/quoteReviewData');

const QUOTE_STATUSES = ['pending', 'in_progress', 'responded', 'closed'];
const QUOTE_PROJECT_TYPES = ['bathroom', 'kitchen', 'interior', 'tiling', 'extension', 'joinery', 'rendering', 'decorating', 'other'];
module.exports = function createQuoteRoutes({
  body,
  param,
  query,
  validationResult,
  asyncHandler,
  managerGuard,
  Quote,
  QuoteAttachment,
  NewQuote,
  User,
  GroupThread,
  GroupMember,
  Notification,
  Project,
  ProjectMedia,
  DeferredFileCleanupJob,
  sequelize,
  Op,
  fn,
  col,
  sqlWhere,
  MAX_PAGE_SIZE,
  escapeLike,
  getPagination,
  paginationDto
}) {
  const router = express.Router();
  const includeClient = getNewQuoteIncludeClient(User);
  const hasNewQuoteStore = (method = 'findAll') => hasNewQuoteStoreForModel(NewQuote, method);

  const stagedNewQuoteWorkflow = createStagedNewQuoteWorkflow({
    sequelize,
    Project,
    ProjectMedia,
    GroupThread,
    GroupMember,
    Notification,
    User,
    ActivityEvent,
    DeferredFileCleanupJob,
    advanceClientLifecycle,
    createActivityEvent
  });
  const loadStagedNewQuote = async (id) => loadStagedNewQuoteForModel(NewQuote, includeClient, id);

  const acceptStagedNewQuote = (newQuote, user) => stagedNewQuoteWorkflow.accept(newQuote, user, {
    buildAcceptClientNotification: ({ newQuote: activeNewQuote, project, groupThread }) => ({
      type: 'project_created',
      title: `Project created: ${project.title}`,
      body: `Your request ${activeNewQuote.quoteRef} has been accepted and converted into project "${project.title}".`,
      data: {
        projectId: project.id,
        newQuoteId: activeNewQuote.id,
        quoteRef: activeNewQuote.quoteRef,
        groupThreadId: groupThread?.id || null
      }
    }),
    buildAcceptActivity: ({ newQuote: activeNewQuote, actorUser, project, groupThread }) => ({
      actorUserId: actorUser.id,
      entityType: 'new_quote',
      entityId: activeNewQuote.id,
      clientId: activeNewQuote.clientId || null,
      projectId: project.id,
      visibility: 'internal',
      eventType: 'project_created_from_new_quote',
      title: 'Project created from staged quote',
      message: `Quote request ${activeNewQuote.quoteRef} was accepted and converted into project "${project.title}".`,
      data: {
        quoteRef: activeNewQuote.quoteRef,
        projectId: project.id,
        groupThreadId: groupThread?.id || null
      }
    }),
    acceptActivityContext: 'legacy_manager_new_quote_accept_activity'
  });

  const rejectStagedNewQuote = (newQuote, user) => stagedNewQuoteWorkflow.reject(newQuote, user, {
    buildRejectClientNotification: ({ newQuote: activeNewQuote }) => ({
      type: 'quote_rejected',
      title: `Quote request not progressed: ${activeNewQuote.quoteRef}`,
      body: `Your request ${activeNewQuote.quoteRef} was not progressed and has been removed from review.`,
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
      title: 'Staged quote rejected',
      message: `Quote request ${activeNewQuote.quoteRef} was rejected and removed from staging.`,
      data: {
        quoteRef: activeNewQuote.quoteRef
      }
    }),
    rejectActivityContext: 'legacy_manager_new_quote_reject_activity'
  });

  router.post(
    '/quotes/:id/accept',
    [...managerGuard, param('id').isUUID()],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const quote = await Quote.findByPk(req.params.id, {
        include: [{ model: User, as: 'client', attributes: ['id', 'name', 'email'] }]
      });

      if (quote) {
        if (quote.assignedManagerId) {
          return res.status(409).json({ error: 'Quote is already assigned to a manager' });
        }

        await quote.update({
          assignedManagerId: req.user.id,
          status: deriveLegacyQuoteStatus('assigned'),
          workflowStatus: 'assigned',
          assignedAt: new Date()
        });

        const projectName = `${quote.projectType} - ${quote.guestName || (quote.client && quote.client.name) || 'Project'} (${quote.postcode || quote.location})`;

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
              data: { quoteId: quote.id, managerId: req.user.id, groupThreadId: groupThread.id }
            }))
          );
        }

        return res.status(201).json({ quote, groupThread });
      }

      const newQuote = await loadStagedNewQuote(req.params.id);
      if (!newQuote) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      const result = await acceptStagedNewQuote(newQuote, req.user);
      return res.status(201).json({
        quote: toNewQuoteSummary(newQuote),
        project: result?.project || null,
        groupThread: result?.groupThread || null,
        deleted: true,
        converted: true
      });
    })
  );

  router.post(
    '/quotes/:id/reject',
    [...managerGuard, param('id').isUUID()],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const newQuote = await loadStagedNewQuote(req.params.id);
      if (!newQuote) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      await rejectStagedNewQuote(newQuote, req.user);
      return res.json({
        rejected: true,
        deleted: true,
        quoteRef: newQuote.quoteRef,
        id: newQuote.id
      });
    })
  );

  router.get(
    '/quotes',
    [
      ...managerGuard,
      query('status').optional().isIn(QUOTE_STATUSES),
      query('workflowStatus').optional().trim().isLength({ min: 1, max: 255 }),
      query('priority').optional().isIn(['low', 'medium', 'high']),
      query('projectType').optional().isIn(QUOTE_PROJECT_TYPES),
      query('q').optional().trim().isLength({ min: 1, max: 255 }),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const where = {};
      if (req.query.status) where.status = req.query.status;
      if (req.query.workflowStatus) where.workflowStatus = String(req.query.workflowStatus).trim();
      if (req.query.priority) where.priority = req.query.priority;
      if (req.query.projectType) where.projectType = req.query.projectType;
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

      const [quoteRows, stagedNewQuoteRows] = await Promise.all([
        Quote.findAll({
          where,
          include: [
            { model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone'] },
            { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'] },
            {
              model: QuoteAttachment,
              as: 'attachments',
              attributes: ['id', 'filename', 'url', 'mimeType', 'sizeBytes', 'createdAt', 'updatedAt'],
              required: false,
              separate: true,
              order: [['createdAt', 'ASC']]
            }
          ],
          order: [['createdAt', 'DESC']]
        }),
        hasNewQuoteStore()
          ? NewQuote.findAll({
            include: includeClient,
            order: [['createdAt', 'DESC']]
          })
          : Promise.resolve([])
      ]);

      const legacyQuotes = (Array.isArray(quoteRows) ? quoteRows : []).map(toLegacyQuoteSummary);
      const stagedQuotes = (Array.isArray(stagedNewQuoteRows) ? stagedNewQuoteRows : [])
        .map(toNewQuoteSummary)
        .filter((stagedQuote) => matchesStagedQuoteFilters(stagedQuote, req.query));

      const mergedQuotes = [...legacyQuotes, ...stagedQuotes].sort((left, right) => {
        const leftTime = Date.parse(left?.updatedAt || left?.createdAt || 0) || 0;
        const rightTime = Date.parse(right?.updatedAt || right?.createdAt || 0) || 0;
        return rightTime - leftTime;
      });

      const { page, pageSize, offset } = getPagination(req);
      const pagedQuotes = mergedQuotes.slice(offset, offset + pageSize);

      return res.json({
        quotes: pagedQuotes,
        pagination: paginationDto(page, pageSize, mergedQuotes.length)
      });
    })
  );

  router.get(
    '/quotes/:id',
    [...managerGuard, param('id').isUUID()],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const quote = await Quote.findByPk(req.params.id, {
        include: [
          { model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone'] },
          { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'] },
          {
            model: QuoteAttachment,
            as: 'attachments',
            attributes: ['id', 'filename', 'url', 'mimeType', 'sizeBytes', 'createdAt', 'updatedAt'],
            required: false,
            separate: true,
            order: [['createdAt', 'ASC']]
          }
        ]
      });

      if (quote) {
        return res.json({ quote: toLegacyQuoteSummary(quote) });
      }

      const newQuote = await loadStagedNewQuote(req.params.id);
      if (!newQuote) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      return res.json({ quote: toNewQuoteSummary(newQuote) });
    })
  );

  router.patch(
    '/quotes/:id',
    [
      ...managerGuard,
      param('id').isUUID(),
      body('status').optional().isIn(QUOTE_STATUSES),
      body('priority').optional().isIn(['low', 'medium', 'high']),
      body('nextActionAt').optional({ nullable: true }).isISO8601(),
      body('responseDeadline').optional({ nullable: true }).isISO8601(),
      body('lossReason').optional().trim()
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const quote = await Quote.findByPk(req.params.id);
      if (!quote) {
        const newQuote = await loadStagedNewQuote(req.params.id);
        if (newQuote) {
          return res.status(400).json({ error: 'Staged new quotes cannot be edited from this panel. Accept or reject the request instead.' });
        }
        return res.status(404).json({ error: 'Quote not found' });
      }

      const payload = {};
      if (req.body.status) payload.status = req.body.status;
      if (req.body.priority) payload.priority = req.body.priority;
      if (Object.prototype.hasOwnProperty.call(req.body, 'nextActionAt')) payload.nextActionAt = req.body.nextActionAt || null;
      if (Object.prototype.hasOwnProperty.call(req.body, 'responseDeadline')) payload.responseDeadline = req.body.responseDeadline || null;
      if (Object.prototype.hasOwnProperty.call(req.body, 'lossReason')) payload.lossReason = String(req.body.lossReason || '').trim() || null;

      if (!Object.keys(payload).length) {
        return res.status(400).json({ error: 'No changes provided' });
      }

      await quote.update(payload);
      return res.json({ quote });
    })
  );

  return router;
};
