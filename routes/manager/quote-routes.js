const express = require('express');
const { ActivityEvent } = require('../../models');
const { deriveLegacyQuoteStatus } = require('../../utils/quoteWorkflow');
const { advanceClientLifecycle } = require('../../utils/crmLifecycle');
const { createActivityEvent } = require('../../utils/activityFeed');
const {
  buildNewQuoteProjectTitle,
  cleanupNewQuoteStoredAttachments,
  toNewQuoteProjectMediaRows,
  toNewQuoteSummary
} = require('../../utils/newQuoteShape');

const QUOTE_STATUSES = ['pending', 'in_progress', 'responded', 'closed'];
const QUOTE_PROJECT_TYPES = ['bathroom', 'kitchen', 'interior', 'tiling', 'extension', 'joinery', 'rendering', 'decorating', 'other'];
const NEW_QUOTE_WORKFLOW_STATUS = 'submitted';
const NEW_QUOTE_PRIORITY = 'medium';

const matchesStagedQuoteFilters = (quote, filters = {}) => {
  if (!quote) return false;

  if (filters.status && filters.status !== 'pending') return false;
  if (filters.workflowStatus && String(filters.workflowStatus).trim().toLowerCase() !== NEW_QUOTE_WORKFLOW_STATUS) return false;
  if (filters.priority && String(filters.priority).trim().toLowerCase() !== NEW_QUOTE_PRIORITY) return false;
  if (filters.projectType && String(filters.projectType).trim().toLowerCase() !== String(quote.projectType || '').trim().toLowerCase()) {
    return false;
  }

  if (filters.q) {
    const needle = String(filters.q || '').trim().toLowerCase();
    const haystack = [
      quote.quoteRef,
      quote.referenceCode,
      quote.projectType,
      quote.location,
      quote.postcode,
      quote.client?.name,
      quote.client?.email,
      quote.guestName,
      quote.guestEmail,
      quote.budgetRange,
      quote.description
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!haystack.includes(needle)) return false;
  }

  return true;
};

module.exports = function createQuoteRoutes({
  body,
  param,
  query,
  validationResult,
  asyncHandler,
  managerGuard,
  Quote,
  NewQuote,
  User,
  GroupThread,
  GroupMember,
  Notification,
  Project,
  ProjectMedia,
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
  const includeClient = [{ model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone', 'companyName'], required: false }];
  const hasNewQuoteStore = () => typeof NewQuote?.findAll === 'function';

  const loadStagedNewQuote = async (id) => {
    if (typeof NewQuote?.findByPk !== 'function') return null;
    return NewQuote.findByPk(id, { include: includeClient });
  };

  const acceptStagedNewQuote = async (newQuote, user) => {
    if (!newQuote) return null;

    const project = await Project.create({
      title: buildNewQuoteProjectTitle(newQuote),
      quoteId: null,
      acceptedEstimateId: null,
      clientId: newQuote.clientId,
      assignedManagerId: user.id,
      location: newQuote.location || null,
      description: newQuote.description || null,
      budgetEstimate: newQuote.budgetRange || null,
      status: 'planning',
      isActive: true
    });

    if (typeof ProjectMedia?.bulkCreate === 'function') {
      const mediaRows = toNewQuoteProjectMediaRows(newQuote, project.id);
      if (mediaRows.length) {
        await ProjectMedia.bulkCreate(mediaRows);
      }
    }

    let groupThread = null;
    if (typeof GroupThread?.create === 'function') {
      groupThread = await GroupThread.create({
        name: project.title,
        quoteId: null,
        projectId: project.id,
        createdBy: user.id
      });

      if (typeof GroupMember?.findOrCreate === 'function') {
        await GroupMember.findOrCreate({
          where: { groupThreadId: groupThread.id, userId: user.id },
          defaults: { groupThreadId: groupThread.id, userId: user.id, role: 'admin' }
        });
        if (newQuote.clientId) {
          await GroupMember.findOrCreate({
            where: { groupThreadId: groupThread.id, userId: newQuote.clientId },
            defaults: { groupThreadId: groupThread.id, userId: newQuote.clientId, role: 'member' }
          });
        }
      }
    }

    const clientRecord = typeof User?.findByPk === 'function' && newQuote.clientId
      ? await User.findByPk(newQuote.clientId)
      : null;
    await advanceClientLifecycle(clientRecord, 'active_project');

    if (newQuote.clientId && typeof Notification?.create === 'function') {
      await Notification.create({
        userId: newQuote.clientId,
        type: 'project_created',
        title: `Project created: ${project.title}`,
        body: `Your request ${newQuote.quoteRef} has been accepted and converted into project "${project.title}".`,
        data: {
          projectId: project.id,
          newQuoteId: newQuote.id,
          quoteRef: newQuote.quoteRef,
          groupThreadId: groupThread?.id || null
        }
      });
    }

    await createActivityEvent(ActivityEvent, {
      actorUserId: user.id,
      entityType: 'new_quote',
      entityId: newQuote.id,
      clientId: newQuote.clientId || null,
      projectId: project.id,
      visibility: 'internal',
      eventType: 'project_created_from_new_quote',
      title: 'Project created from staged quote',
      message: `Quote request ${newQuote.quoteRef} was accepted and converted into project "${project.title}".`,
      data: {
        quoteRef: newQuote.quoteRef,
        projectId: project.id,
        groupThreadId: groupThread?.id || null
      }
    }, 'legacy_manager_new_quote_accept_activity');

    await newQuote.destroy();
    return { project, groupThread };
  };

  const rejectStagedNewQuote = async (newQuote, user) => {
    if (!newQuote) return;

    if (newQuote.clientId && typeof Notification?.create === 'function') {
      await Notification.create({
        userId: newQuote.clientId,
        type: 'quote_rejected',
        title: `Quote request not progressed: ${newQuote.quoteRef}`,
        body: `Your request ${newQuote.quoteRef} was not progressed and has been removed from review.`,
        data: {
          newQuoteId: newQuote.id,
          quoteRef: newQuote.quoteRef
        }
      });
    }

    await createActivityEvent(ActivityEvent, {
      actorUserId: user.id,
      entityType: 'new_quote',
      entityId: newQuote.id,
      clientId: newQuote.clientId || null,
      visibility: 'internal',
      eventType: 'new_quote_rejected',
      title: 'Staged quote rejected',
      message: `Quote request ${newQuote.quoteRef} was rejected and removed from staging.`,
      data: {
        quoteRef: newQuote.quoteRef
      }
    }, 'legacy_manager_new_quote_reject_activity');

    await cleanupNewQuoteStoredAttachments(newQuote);
    await newQuote.destroy();
  };

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
            { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'] }
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

      const stagedQuotes = (Array.isArray(stagedNewQuoteRows) ? stagedNewQuoteRows : [])
        .map(toNewQuoteSummary)
        .filter((stagedQuote) => matchesStagedQuoteFilters(stagedQuote, req.query));

      const mergedQuotes = [...(Array.isArray(quoteRows) ? quoteRows : []), ...stagedQuotes].sort((left, right) => {
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
          { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'] }
        ]
      });

      if (quote) {
        return res.json({ quote });
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
