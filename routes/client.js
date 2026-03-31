const express = require('express');
const path = require('path');
const { Op } = require('sequelize');
const { body, param, query, validationResult } = require('express-validator');
const {
  Project,
  ProjectMedia,
  Quote,
  Estimate,
  GroupMember,
  GroupThread,
  Notification,
  ServiceOffering,
  User
} = require('../models');
const { auth, roleCheck } = require('../middleware/auth');
const { upload } = require('../utils/upload');
const asyncHandler = require('../utils/asyncHandler');
const {
  QUOTE_WORKFLOW_STATUSES,
  QUOTE_CLIENT_DECISION_STATUSES,
  QUOTE_CLIENT_DECISION_STATUSES_NON_PENDING,
  deriveLegacyQuoteStatus
} = require('../utils/quoteWorkflow');
const { appendRevisionEntry, buildQuoteRevisionSnapshot } = require('../utils/revisionHistory');

const router = express.Router();
const clientGuard = [auth, roleCheck('client')];

const normalizeStoragePath = (absolutePath) => {
  const relative = path.relative(path.join(__dirname, '..'), absolutePath);
  return relative.replace(/\\/g, '/');
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const mapProject = (project) => {
  const plain = project.toJSON();
  const media = Array.isArray(plain.media) ? plain.media : [];
  const images = media
    .filter((item) => item.mediaType === 'image')
    .sort((a, b) => {
      if (a.isCover !== b.isCover) return Number(b.isCover) - Number(a.isCover);
      if (a.galleryOrder !== b.galleryOrder) return a.galleryOrder - b.galleryOrder;
      return String(a.filename || '').localeCompare(String(b.filename || ''));
    });
  const documents = media
    .filter((item) => item.mediaType === 'document')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    ...plain,
    images,
    documents
  };
};

const formatVisitPreference = ({ siteVisitDate, siteVisitTimeWindow }) => {
  if (!siteVisitDate) return 'a different visit slot';
  return `${siteVisitDate}${siteVisitTimeWindow ? ` (${siteVisitTimeWindow})` : ''}`;
};

const buildQuoteHistoryPayload = ({ quote, actor, changeType, note, changedFields = [], updates = {} }) => {
  const current = typeof quote?.toJSON === 'function' ? quote.toJSON() : { ...(quote || {}) };
  const nextState = { ...current, ...updates };
  return {
    ...updates,
    revisionHistory: appendRevisionEntry(current.revisionHistory, {
      entity: 'quote',
      changeType,
      changedById: actor?.id || null,
      changedByRole: actor?.role || null,
      note: note || null,
      changedFields,
      snapshot: buildQuoteRevisionSnapshot(nextState)
    })
  };
};

router.get(
  '/overview',
  [...clientGuard, query('includeThreads').optional().isIn(['true', 'false', '1', '0'])],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const includeThreads = parseBoolean(req.query.includeThreads, true);
    const [projects, quotes, memberships, unreadCount, services] = await Promise.all([
      Project.findAll({
        where: { clientId: req.user.id, isActive: true },
        include: [
          { model: ProjectMedia, as: 'media', required: false },
          { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'], required: false },
          { model: Quote, as: 'quote', attributes: ['id', 'status', 'projectType', 'location'], required: false }
        ],
        order: [['createdAt', 'DESC']]
      }),
      Quote.findAll({
        where: { clientId: req.user.id },
        include: [
          { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'], required: false },
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
        ],
        order: [['createdAt', 'DESC']],
        limit: 100
      }),
      includeThreads
        ? GroupMember.findAll({
          where: { userId: req.user.id },
          include: [{ model: GroupThread, as: 'thread' }],
          order: [['createdAt', 'DESC']]
        })
        : Promise.resolve([]),
      Notification.count({ where: { userId: req.user.id, isRead: false } }),
      ServiceOffering.findAll({
        where: { showOnWebsite: true, isActive: true },
        order: [['displayOrder', 'ASC'], ['createdAt', 'DESC']]
      })
    ]);

    return res.json({
      user: req.user,
      metrics: {
        projectCount: projects.length,
        quoteCount: quotes.length,
        unreadNotifications: unreadCount,
        activeProjectCount: projects.filter((item) => item.status === 'in_progress').length
      },
      projects: projects.map(mapProject),
      quotes,
      threads: includeThreads ? memberships.map((membership) => membership.thread).filter(Boolean) : [],
      services
    });
  })
);

router.get(
  '/projects',
  clientGuard,
  asyncHandler(async (req, res) => {
    const projects = await Project.findAll({
      where: { clientId: req.user.id, isActive: true },
      include: [
        { model: ProjectMedia, as: 'media', required: false },
        { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'], required: false },
        { model: Quote, as: 'quote', attributes: ['id', 'status', 'projectType', 'location'], required: false }
      ],
      order: [['createdAt', 'DESC']]
    });
    return res.json({ projects: projects.map(mapProject) });
  })
);

router.get(
  '/projects/:id',
  [...clientGuard, param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findOne({
      where: { id: req.params.id, clientId: req.user.id, isActive: true },
      include: [
        { model: ProjectMedia, as: 'media', required: false },
        { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'], required: false },
        { model: Quote, as: 'quote', attributes: ['id', 'status', 'projectType', 'location'], required: false }
      ]
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.json({ project: mapProject(project) });
  })
);

router.post(
  '/quotes/:id/workflow',
  [
    ...clientGuard,
    param('id').isUUID(),
    body('siteVisitDate').optional({ nullable: true }).isISO8601(),
    body('siteVisitTimeWindow').optional({ nullable: true }).trim().isLength({ max: 120 }),
    body('clientDecisionStatus').optional().isIn(QUOTE_CLIENT_DECISION_STATUSES_NON_PENDING),
    body('clientDecisionNotes').optional({ nullable: true }).trim().isLength({ max: 6000 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const quote = await Quote.findOne({
      where: { id: req.params.id, clientId: req.user.id },
      include: [{ model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'], required: false }]
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const payload = {};
    const requestedVisitChange = (
      typeof req.body.siteVisitDate !== 'undefined'
      || typeof req.body.siteVisitTimeWindow !== 'undefined'
    );

    if (typeof req.body.siteVisitDate !== 'undefined') payload.siteVisitDate = req.body.siteVisitDate || null;
    if (typeof req.body.siteVisitTimeWindow !== 'undefined') payload.siteVisitTimeWindow = String(req.body.siteVisitTimeWindow || '').trim() || null;
    if (typeof req.body.clientDecisionStatus !== 'undefined') payload.clientDecisionStatus = req.body.clientDecisionStatus;
    if (typeof req.body.clientDecisionNotes !== 'undefined') payload.clientDecisionNotes = String(req.body.clientDecisionNotes || '').trim() || null;

    if (requestedVisitChange) {
      payload.siteVisitStatus = 'reschedule_requested';
      payload.workflowStatus = 'visit_reschedule_requested';
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

    if (payload.workflowStatus && !QUOTE_WORKFLOW_STATUSES.includes(payload.workflowStatus)) {
      return res.status(400).json({ error: 'Invalid workflow state' });
    }

    if (!Object.keys(payload).length) {
      return res.status(400).json({ error: 'No workflow changes provided' });
    }

    payload.status = deriveLegacyQuoteStatus({
      workflowStatus: payload.workflowStatus || quote.workflowStatus,
      assignedManagerId: quote.assignedManagerId,
      archivedAt: quote.archivedAt,
      clientDecisionStatus: payload.clientDecisionStatus || quote.clientDecisionStatus
    });

    const historyPayload = buildQuoteHistoryPayload({
      quote,
      actor: req.user,
      changeType: requestedVisitChange ? 'client_requested_visit_change' : 'client_updated_decision',
      changedFields: Object.keys(payload),
      updates: payload
    });
    await quote.update(historyPayload);

    const managerId = quote.assignedManagerId;
    if (managerId) {
      const requestedVisit = payload.siteVisitDate || quote.siteVisitDate;
      const requestedWindow = payload.siteVisitTimeWindow || quote.siteVisitTimeWindow;
      await Notification.create({
        userId: managerId,
        type: requestedVisitChange ? 'quote_visit_reschedule_requested' : 'quote_client_decision_updated',
        title: requestedVisitChange ? 'Client requested a different visit date' : 'Client updated quote decision',
        body: requestedVisitChange
          ? `Client ${req.user.name} requested ${formatVisitPreference({ siteVisitDate: requestedVisit, siteVisitTimeWindow: requestedWindow })} for the quote visit.`
          : `Client ${req.user.name} set quote decision to ${payload.clientDecisionStatus}.`,
        quoteId: quote.id,
        data: {
          quoteId: quote.id,
          workflowStatus: payload.workflowStatus || quote.workflowStatus,
          clientDecisionStatus: payload.clientDecisionStatus || quote.clientDecisionStatus,
          siteVisitDate: requestedVisit || null,
          siteVisitTimeWindow: requestedWindow || null
        }
      });
    }

    return res.json({ quote });
  })
);

router.post(
  '/projects/:id/documents/upload',
  [...clientGuard, param('id').isUUID(), upload.array('files', 10)],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findOne({
      where: { id: req.params.id, clientId: req.user.id, isActive: true }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const caption = req.body.caption ? String(req.body.caption).trim() : null;
    const created = await ProjectMedia.bulkCreate(
      files.map((file) => ({
        projectId: project.id,
        mediaType: 'document',
        url: `/uploads/${file.filename}`,
        storagePath: normalizeStoragePath(file.path),
        filename: file.originalname,
        mimeType: file.mimetype || null,
        sizeBytes: Number.isFinite(file.size) ? file.size : null,
        caption,
        showInGallery: false,
        galleryOrder: 0,
        isCover: false
      })),
      { returning: true }
    );

    const managerRecipients = await User.findAll({
      where: project.assignedManagerId
        ? { id: project.assignedManagerId, isActive: true }
        : { role: { [Op.in]: ['manager', 'admin'] }, isActive: true }
    });

    if (managerRecipients.length) {
      await Notification.bulkCreate(
        managerRecipients.map((user) => ({
          userId: user.id,
          type: 'client_document_uploaded',
          title: `Client uploaded document (${req.user.name})`,
          body: `New document uploaded to project "${project.title}".`,
          quoteId: project.quoteId || null,
          data: {
            projectId: project.id,
            clientId: req.user.id,
            fileCount: created.length
          }
        }))
      );
    }

    return res.status(201).json({ documents: created });
  })
);

module.exports = router;
