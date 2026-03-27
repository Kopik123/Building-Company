const express = require('express');
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const { body, param, query, validationResult } = require('express-validator');
const { ActivityEvent, Estimate, GroupThread, Project, ProjectMedia, Quote, User } = require('../../../models');
const asyncHandler = require('../../../utils/asyncHandler');
const { authV2 } = require('../middleware/auth');
const { roleCheckV2 } = require('../middleware/roles');
const { ok, fail } = require('../utils/response');
const { clearGalleryCache } = require('../utils/publicCache');
const { createActivityEvent } = require('../../../utils/activityFeed');
const { advanceClientLifecycle } = require('../../../utils/crmLifecycle');
const { PROJECT_STATUSES, PROJECT_STAGES } = require('../../../shared/contracts/v2');

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
const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const canManageProjectMutations = (project, user) => {
  const role = String(user?.role || '').trim().toLowerCase();
  if (['manager', 'admin'].includes(role)) return true;
  return role === 'employee' && Boolean(project?.assignedManagerId) && project.assignedManagerId === user?.id;
};

const syncProjectChatLinks = async (project) => {
  if (!project?.id || !project.quoteId || typeof GroupThread?.update !== 'function') return;
  await GroupThread.update(
    { projectId: project.id },
    {
      where: {
        projectId: null,
        quoteId: project.quoteId
      }
    }
  );
};

const applyQuoteDefaults = async (payload) => {
  if (!payload?.quoteId || typeof Quote?.findByPk !== 'function') return null;
  const quote = await Quote.findByPk(payload.quoteId);
  if (!quote) return null;

  if (!payload.clientId && quote.clientId) payload.clientId = quote.clientId;
  if (!payload.assignedManagerId && quote.assignedManagerId) payload.assignedManagerId = quote.assignedManagerId;
  if (!payload.location && quote.location) payload.location = quote.location;
  if (!payload.description && quote.description) payload.description = quote.description;
  if (!payload.acceptedEstimateId && quote.currentEstimateId) payload.acceptedEstimateId = quote.currentEstimateId;

  return quote;
};

const buildProjectMediaCountMap = async (projectIds) => {
  const uniqueProjectIds = Array.from(new Set((projectIds || []).filter(Boolean)));
  if (!uniqueProjectIds.length) return new Map();

  const rows = await ProjectMedia.findAll({
    attributes: ['projectId', 'mediaType', [fn('COUNT', col('id')), 'count']],
    where: { projectId: { [Op.in]: uniqueProjectIds } },
    group: ['projectId', 'mediaType'],
    raw: true
  });

  const mediaCountByProjectId = new Map();
  uniqueProjectIds.forEach((projectId) => {
    mediaCountByProjectId.set(projectId, { imageCount: 0, documentCount: 0 });
  });

  rows.forEach((row) => {
    const projectId = row.projectId;
    const counts = mediaCountByProjectId.get(projectId) || { imageCount: 0, documentCount: 0 };
    const count = Number.parseInt(row.count, 10) || 0;
    if (row.mediaType === 'image') counts.imageCount = count;
    if (row.mediaType === 'document') counts.documentCount = count;
    mediaCountByProjectId.set(projectId, counts);
  });

  return mediaCountByProjectId;
};

const projectDto = (project, options = {}) => {
  const includeMedia = options.includeMedia !== false;
  const mediaCountByProjectId = options.mediaCountByProjectId || null;
  const plain = project.toJSON();
  const media = Array.isArray(plain.media) ? plain.media : [];
  const countedFromQuery = mediaCountByProjectId && plain.id ? mediaCountByProjectId.get(plain.id) : null;
  const imageCount = includeMedia
    ? media.filter((item) => item.mediaType === 'image').length
    : Number.parseInt(countedFromQuery?.imageCount, 10) || 0;
  const documentCount = includeMedia
    ? media.filter((item) => item.mediaType === 'document').length
    : Number.parseInt(countedFromQuery?.documentCount, 10) || 0;

  const dto = {
    ...plain,
    imageCount,
    documentCount
  };

  if (!includeMedia) {
    delete dto.media;
  }

  return dto;
};

router.get(
  '/',
  [
    authV2,
    roleCheckV2('client', 'employee', 'manager', 'admin'),
    query('status').optional().isIn(PROJECT_STATUSES),
    query('projectStage').optional().isIn(PROJECT_STAGES),
    query('showInGallery').optional().isIn(['true', 'false', '1', '0']),
    query('includeMedia').optional().isIn(['true', 'false', '1', '0']),
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
    if (req.v2User.role === 'client') {
      where.clientId = req.v2User.id;
      where.isActive = true;
    }
    if (req.query.status) where.status = req.query.status;
    if (req.query.projectStage) where.projectStage = req.query.projectStage;
    if (typeof req.query.showInGallery !== 'undefined') where.showInGallery = parseBoolean(req.query.showInGallery);
    if (req.query.q) {
      const needle = `%${escapeLike(String(req.query.q).trim().toLowerCase())}%`;
      where[Op.or] = [
        sqlWhere(fn('LOWER', col('Project.title')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('Project.location')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('Project.description')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('client.email')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('assignedManager.email')), { [Op.like]: needle })
      ];
    }

    const includeMedia = parseBoolean(req.query.includeMedia, true);
    const { page, pageSize, offset } = getPagination(req);
    const { rows, count } = await Project.findAndCountAll({
      where,
      include: [
        ...(includeMedia ? [{ model: ProjectMedia, as: 'media', required: false }] : []),
        { model: User, as: 'client', attributes: ['id', 'name', 'email'], required: false },
        { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'], required: false },
        { model: Quote, as: 'quote', attributes: ['id', 'status', 'projectType', 'location'], required: false }
      ],
      order: [['galleryOrder', 'ASC'], ['createdAt', 'DESC']],
      distinct: true,
      limit: pageSize,
      offset
    });

    const mediaCountByProjectId = includeMedia
      ? null
      : await buildProjectMediaCountMap(rows.map((project) => project.id));

    return ok(
      res,
      { projects: rows.map((project) => projectDto(project, { includeMedia, mediaCountByProjectId })) },
      { page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) }
    );
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

    const project = await Project.findByPk(req.params.id, {
      include: [
        { model: ProjectMedia, as: 'media', required: false },
        { model: User, as: 'client', attributes: ['id', 'name', 'email'], required: false },
        { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'], required: false },
        { model: Quote, as: 'quote', attributes: ['id', 'status', 'projectType', 'location'], required: false }
      ]
    });
    if (!project) return fail(res, 404, 'project_not_found', 'Project not found');
    if (req.v2User.role === 'client' && project.clientId !== req.v2User.id) {
      return fail(res, 404, 'project_not_found', 'Project not found');
    }

    return ok(res, { project: projectDto(project) });
  })
);

router.post(
  '/',
  [
    authV2,
    roleCheckV2('employee', 'manager', 'admin'),
    body('title').trim().notEmpty(),
    body('status').optional().isIn(PROJECT_STATUSES),
    body('projectStage').optional().isIn(PROJECT_STAGES),
    body('quoteId').optional({ nullable: true }).isUUID(),
    body('acceptedEstimateId').optional({ nullable: true }).isUUID(),
    body('clientId').optional({ nullable: true }).isUUID(),
    body('assignedManagerId').optional({ nullable: true }).isUUID(),
    body('currentMilestone').optional().trim(),
    body('workPackage').optional().trim(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('dueDate').optional().isISO8601(),
    body('showInGallery').optional().isBoolean(),
    body('isActive').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const payload = {
      title: String(req.body.title || '').trim(),
      quoteId: req.body.quoteId || null,
      acceptedEstimateId: req.body.acceptedEstimateId || null,
      clientId: req.body.clientId || null,
      assignedManagerId: req.body.assignedManagerId || null,
      location: req.body.location ? String(req.body.location).trim() : null,
      description: req.body.description ? String(req.body.description).trim() : null,
      status: req.body.status || 'planning',
      projectStage: req.body.projectStage || PROJECT_STAGES[0],
      currentMilestone: req.body.currentMilestone ? String(req.body.currentMilestone).trim() : null,
      workPackage: req.body.workPackage ? String(req.body.workPackage).trim() : null,
      budgetEstimate: req.body.budgetEstimate ? String(req.body.budgetEstimate).trim() : null,
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
      dueDate: req.body.dueDate || null,
      showInGallery: parseBoolean(req.body.showInGallery, false),
      galleryOrder: Number.parseInt(req.body.galleryOrder, 10) || 0,
      isActive: parseBoolean(req.body.isActive, true)
    };

    if (payload.quoteId) {
      const linkedQuote = await applyQuoteDefaults(payload);
      if (!linkedQuote) {
        return fail(res, 400, 'invalid_quote', 'Invalid quoteId');
      }
    }

    const project = await Project.create(payload);
    await syncProjectChatLinks(project);

    if (project.clientId && typeof User?.findByPk === 'function') {
      const clientRecord = await User.findByPk(project.clientId);
      await advanceClientLifecycle(clientRecord, 'active_project');
    }

    await createActivityEvent(ActivityEvent, {
      actorUserId: req.v2User.id,
      entityType: 'project',
      entityId: project.id,
      projectId: project.id,
      quoteId: project.quoteId || null,
      clientId: project.clientId || null,
      visibility: 'internal',
      eventType: 'project_created',
      title: 'Project created',
      message: `Project "${project.title}" created.`,
      data: {
        status: project.status,
        projectStage: project.projectStage,
        currentMilestone: project.currentMilestone || null,
        dueDate: project.dueDate || null,
        assignedManagerId: project.assignedManagerId || null
      }
    }, 'project_create_activity');

    clearGalleryCache();
    return ok(res, { project }, {}, 201);
  })
);

router.patch(
  '/:id',
  [
    authV2,
    roleCheckV2('employee', 'manager', 'admin'),
    param('id').isUUID(),
    body('title').optional().trim().notEmpty(),
    body('status').optional().isIn(PROJECT_STATUSES),
    body('projectStage').optional().isIn(PROJECT_STAGES),
    body('quoteId').optional({ nullable: true }).isUUID(),
    body('acceptedEstimateId').optional({ nullable: true }).isUUID(),
    body('clientId').optional({ nullable: true }).isUUID(),
    body('assignedManagerId').optional({ nullable: true }).isUUID(),
    body('currentMilestone').optional({ nullable: true }).trim(),
    body('workPackage').optional({ nullable: true }).trim(),
    body('startDate').optional({ nullable: true }).isISO8601(),
    body('endDate').optional({ nullable: true }).isISO8601(),
    body('dueDate').optional({ nullable: true }).isISO8601(),
    body('showInGallery').optional().isBoolean(),
    body('isActive').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const project = await Project.findByPk(req.params.id);
    if (!project) return fail(res, 404, 'project_not_found', 'Project not found');
    if (!canManageProjectMutations(project, req.v2User)) {
      return fail(res, 403, 'project_forbidden', 'You do not own this project route');
    }

    const payload = {};
    ['title', 'status', 'projectStage', 'quoteId', 'acceptedEstimateId', 'clientId', 'assignedManagerId', 'startDate', 'endDate', 'dueDate'].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) payload[key] = req.body[key] || null;
    });
    if (Object.prototype.hasOwnProperty.call(req.body, 'location')) payload.location = String(req.body.location || '').trim() || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'description')) payload.description = String(req.body.description || '').trim() || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'currentMilestone')) payload.currentMilestone = String(req.body.currentMilestone || '').trim() || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'workPackage')) payload.workPackage = String(req.body.workPackage || '').trim() || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'budgetEstimate')) payload.budgetEstimate = String(req.body.budgetEstimate || '').trim() || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'showInGallery')) payload.showInGallery = parseBoolean(req.body.showInGallery);
    if (Object.prototype.hasOwnProperty.call(req.body, 'galleryOrder')) payload.galleryOrder = Number.parseInt(req.body.galleryOrder, 10) || 0;
    if (Object.prototype.hasOwnProperty.call(req.body, 'isActive')) payload.isActive = parseBoolean(req.body.isActive);

    if (!Object.keys(payload).length) return fail(res, 400, 'no_changes', 'No changes provided');

    const isEmployee = String(req.v2User.role || '').toLowerCase() === 'employee';
    if (isEmployee && Object.prototype.hasOwnProperty.call(payload, 'assignedManagerId') && payload.assignedManagerId !== req.v2User.id) {
      return fail(res, 403, 'project_forbidden', 'Employees can only keep project ownership on themselves');
    }

    if (payload.quoteId) {
      const linkedQuote = await applyQuoteDefaults(payload);
      if (!linkedQuote) {
        return fail(res, 400, 'invalid_quote', 'Invalid quoteId');
      }
    }

    await project.update(payload);
    await syncProjectChatLinks(project);
    if (project.clientId && PROJECT_STATUSES.includes(String(project.status || '').trim().toLowerCase()) && typeof User?.findByPk === 'function') {
      const clientRecord = await User.findByPk(project.clientId);
      await advanceClientLifecycle(clientRecord, 'active_project');
    }

    await createActivityEvent(ActivityEvent, {
      actorUserId: req.v2User.id,
      entityType: 'project',
      entityId: project.id,
      projectId: project.id,
      quoteId: project.quoteId || null,
      clientId: project.clientId || null,
      visibility: 'internal',
      eventType: 'project_updated',
      title: 'Project updated',
      message: `Project "${project.title}" updated.`,
      data: {
        changes: payload
      }
    }, 'project_update_activity');
    clearGalleryCache();
    return ok(res, { project });
  })
);

router.delete(
  '/:id',
  [authV2, roleCheckV2('employee', 'manager', 'admin'), param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const project = await Project.findByPk(req.params.id);
    if (!project) return fail(res, 404, 'project_not_found', 'Project not found');
    if (!canManageProjectMutations(project, req.v2User)) {
      return fail(res, 403, 'project_forbidden', 'You do not own this project route');
    }

    const [linkedEstimateCount, linkedThreadCount, convertedQuoteCount] = await Promise.all([
      Estimate.count({ where: { projectId: project.id } }),
      GroupThread.count({ where: { projectId: project.id } }),
      Quote.count({ where: { convertedProjectId: project.id } })
    ]);
    const acceptedEstimateLinked = project.acceptedEstimateId ? 1 : 0;

    if (linkedEstimateCount || linkedThreadCount || convertedQuoteCount || acceptedEstimateLinked) {
      return fail(
        res,
        409,
        'project_delete_blocked',
        'Archive this project instead of deleting it once linked delivery records exist.',
        {
          linkedEstimateCount,
          linkedThreadCount,
          convertedQuoteCount,
          acceptedEstimateLinked
        }
      );
    }

    await project.destroy();
    await createActivityEvent(ActivityEvent, {
      actorUserId: req.v2User.id,
      entityType: 'project',
      entityId: project.id,
      projectId: project.id,
      quoteId: project.quoteId || null,
      clientId: project.clientId || null,
      visibility: 'internal',
      eventType: 'project_deleted',
      title: 'Project deleted',
      message: `Project "${project.title}" deleted.`,
      data: null
    }, 'project_delete_activity');
    clearGalleryCache();
    return ok(res, { deleted: true, projectId: project.id });
  })
);

module.exports = router;
