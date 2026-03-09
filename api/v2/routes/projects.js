const express = require('express');
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const { body, param, query, validationResult } = require('express-validator');
const { Project, ProjectMedia, Quote, User } = require('../../../models');
const asyncHandler = require('../../../utils/asyncHandler');
const { authV2 } = require('../middleware/auth');
const { roleCheckV2 } = require('../middleware/roles');
const { ok, fail } = require('../utils/response');
const { clearGalleryCache } = require('../utils/publicCache');

const router = express.Router();
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const PROJECT_STATUSES = ['planning', 'in_progress', 'completed', 'on_hold'];

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
    body('quoteId').optional({ nullable: true }).isUUID(),
    body('clientId').optional({ nullable: true }).isUUID(),
    body('assignedManagerId').optional({ nullable: true }).isUUID(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('showInGallery').optional().isBoolean(),
    body('isActive').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const project = await Project.create({
      title: String(req.body.title || '').trim(),
      quoteId: req.body.quoteId || null,
      clientId: req.body.clientId || null,
      assignedManagerId: req.body.assignedManagerId || null,
      location: req.body.location ? String(req.body.location).trim() : null,
      description: req.body.description ? String(req.body.description).trim() : null,
      status: req.body.status || 'planning',
      budgetEstimate: req.body.budgetEstimate ? String(req.body.budgetEstimate).trim() : null,
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
      showInGallery: parseBoolean(req.body.showInGallery, false),
      galleryOrder: Number.parseInt(req.body.galleryOrder, 10) || 0,
      isActive: parseBoolean(req.body.isActive, true)
    });

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
    body('quoteId').optional({ nullable: true }).isUUID(),
    body('clientId').optional({ nullable: true }).isUUID(),
    body('assignedManagerId').optional({ nullable: true }).isUUID(),
    body('startDate').optional({ nullable: true }).isISO8601(),
    body('endDate').optional({ nullable: true }).isISO8601(),
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

    const payload = {};
    ['title', 'status', 'quoteId', 'clientId', 'assignedManagerId', 'startDate', 'endDate'].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) payload[key] = req.body[key] || null;
    });
    if (Object.prototype.hasOwnProperty.call(req.body, 'location')) payload.location = String(req.body.location || '').trim() || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'description')) payload.description = String(req.body.description || '').trim() || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'budgetEstimate')) payload.budgetEstimate = String(req.body.budgetEstimate || '').trim() || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'showInGallery')) payload.showInGallery = parseBoolean(req.body.showInGallery);
    if (Object.prototype.hasOwnProperty.call(req.body, 'galleryOrder')) payload.galleryOrder = Number.parseInt(req.body.galleryOrder, 10) || 0;
    if (Object.prototype.hasOwnProperty.call(req.body, 'isActive')) payload.isActive = parseBoolean(req.body.isActive);

    if (!Object.keys(payload).length) return fail(res, 400, 'no_changes', 'No changes provided');

    await project.update(payload);
    clearGalleryCache();
    return ok(res, { project });
  })
);

module.exports = router;
