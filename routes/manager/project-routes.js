const express = require('express');
const {
  createValidatedHandler,
  findByPkOrRespond,
  findOneOrRespond,
  cleanupUploadedFiles
} = require('./route-helpers');

const hasOwn = (source, key) => Object.prototype.hasOwnProperty.call(source, key);
const toTrimmedOrNull = (value) => String(value || '').trim() || null;
const toIntegerOrZero = (value) => Number.parseInt(value, 10) || 0;

const createProjectWriteValidators = ({ body, PROJECT_STATUSES, partial = false }) => {
  const titleValidator = partial
    ? body('title').optional().trim().notEmpty()
    : body('title').trim().notEmpty();

  return [
    titleValidator,
    body('location').optional().trim(),
    body('description').optional().trim(),
    body('status').optional().isIn(PROJECT_STATUSES),
    body('quoteId').optional({ nullable: true }).isUUID(),
    body('clientId').optional({ nullable: true }).isUUID(),
    body('clientEmail').optional({ checkFalsy: true }).isEmail(),
    body('assignedManagerId').optional({ nullable: true }).isUUID(),
    body('assignedManagerEmail').optional({ checkFalsy: true }).isEmail(),
    body('budgetEstimate').optional().trim(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('showInGallery').optional().isBoolean(),
    body('galleryOrder').optional().isInt(),
    body('isActive').optional().isBoolean()
  ];
};

const createProjectInclude = ({ ProjectMedia, User, Quote, includeMedia = false }) => [
  ...(includeMedia ? [{ model: ProjectMedia, as: 'media' }] : []),
  { model: User, as: 'client', attributes: ['id', 'name', 'email'], required: false },
  { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'], required: false },
  { model: Quote, as: 'quote', attributes: ['id', 'status', 'projectType', 'location'], required: false }
];

const buildProjectPayload = (source, { partial, parseBoolean }) => {
  const payload = {};
  const assign = (key, value) => {
    if (!partial || hasOwn(source, key)) payload[key] = value;
  };

  assign('title', String(source.title || '').trim());
  assign('quoteId', source.quoteId || null);
  assign('clientId', source.clientId || null);
  assign('assignedManagerId', source.assignedManagerId || null);
  assign('location', hasOwn(source, 'location') || !partial ? toTrimmedOrNull(source.location) : undefined);
  assign('description', hasOwn(source, 'description') || !partial ? toTrimmedOrNull(source.description) : undefined);
  assign('status', partial ? source.status : source.status || 'planning');
  assign('budgetEstimate', hasOwn(source, 'budgetEstimate') || !partial ? toTrimmedOrNull(source.budgetEstimate) : undefined);
  assign('startDate', source.startDate || null);
  assign('endDate', source.endDate || null);
  assign('showInGallery', partial ? parseBoolean(source.showInGallery) : parseBoolean(source.showInGallery, false));
  assign('galleryOrder', toIntegerOrZero(source.galleryOrder));
  assign('isActive', partial ? parseBoolean(source.isActive) : parseBoolean(source.isActive, true));

  Object.keys(payload).forEach((key) => {
    if (typeof payload[key] === 'undefined') {
      delete payload[key];
    }
  });

  return payload;
};

const applyProjectIdentityOverrides = async ({
  source,
  payload,
  partial,
  resolveClientByIdentity,
  resolveManagerByIdentity
}) => {
  if (!partial || hasOwn(source, 'clientEmail')) {
    payload.clientId = await resolveClientByIdentity({
      clientId: payload.clientId,
      clientEmail: source.clientEmail
    });
  }

  if (!partial || hasOwn(source, 'assignedManagerEmail')) {
    payload.assignedManagerId = await resolveManagerByIdentity({
      assignedManagerId: payload.assignedManagerId,
      assignedManagerEmail: source.assignedManagerEmail
    });
  }
};

const applyQuoteProjectDefaults = async ({ payload, partial, Quote }) => {
  if ((!partial || hasOwn(payload, 'quoteId')) && payload.quoteId) {
    const quote = await Quote.findByPk(payload.quoteId);
    if (!quote) {
      throw new Error('Invalid quoteId');
    }

    if ((!partial || !hasOwn(payload, 'clientId')) && quote.clientId) payload.clientId = quote.clientId;
    if ((!partial || !hasOwn(payload, 'assignedManagerId')) && quote.assignedManagerId) payload.assignedManagerId = quote.assignedManagerId;
    if ((!partial || !hasOwn(payload, 'location')) && quote.location) payload.location = quote.location;
  }
};

module.exports = function createProjectRoutes({
  body,
  param,
  query,
  validationResult,
  asyncHandler,
  staffGuard,
  Quote,
  User,
  Project,
  ProjectMedia,
  Op,
  fn,
  col,
  sqlWhere,
  MAX_PAGE_SIZE,
  PROJECT_STATUSES,
  getPagination,
  paginationDto,
  escapeLike,
  parseBoolean,
  normalizeEmail,
  resolveClientByIdentity,
  resolveManagerByIdentity,
  toProjectDto,
  buildProjectMediaCountMap,
  normalizeStoragePath,
  safeUnlink,
  upload,
  clearGalleryCache
}) {
  const router = express.Router();
  const withValidation = createValidatedHandler({ validationResult, asyncHandler });
  const projectDetailInclude = createProjectInclude({ ProjectMedia, User, Quote, includeMedia: true });
  const projectListBaseInclude = createProjectInclude({ ProjectMedia, User, Quote, includeMedia: false });

  router.get(
    '/projects',
    [
      ...staffGuard,
      query('status').optional().isIn(PROJECT_STATUSES),
      query('showInGallery').optional().isIn(['true', 'false', '1', '0']),
      query('includeMedia').optional().isIn(['true', 'false', '1', '0']),
      query('q').optional().trim().isLength({ min: 1, max: 255 }),
      query('clientEmail').optional().trim().isLength({ min: 3, max: 255 }),
      query('assignedManagerEmail').optional().trim().isLength({ min: 3, max: 255 }),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
    ],
    withValidation(async (req, res) => {
      const where = {};
      if (req.query.status) where.status = req.query.status;
      if (typeof req.query.showInGallery !== 'undefined') {
        where.showInGallery = parseBoolean(req.query.showInGallery);
      }
      if (req.query.clientEmail) {
        where['$client.email$'] = normalizeEmail(req.query.clientEmail);
      }
      if (req.query.assignedManagerEmail) {
        where['$assignedManager.email$'] = normalizeEmail(req.query.assignedManagerEmail);
      }
      if (req.query.q) {
        const needle = `%${escapeLike(String(req.query.q || '').trim().toLowerCase())}%`;
        where[Op.or] = [
          sqlWhere(fn('LOWER', col('title')), { [Op.like]: needle }),
          sqlWhere(fn('LOWER', col('location')), { [Op.like]: needle }),
          sqlWhere(fn('LOWER', col('description')), { [Op.like]: needle }),
          sqlWhere(fn('LOWER', col('client.email')), { [Op.like]: needle }),
          sqlWhere(fn('LOWER', col('client.name')), { [Op.like]: needle }),
          sqlWhere(fn('LOWER', col('assignedManager.email')), { [Op.like]: needle }),
          sqlWhere(fn('LOWER', col('quote.location')), { [Op.like]: needle })
        ];
      }

      const includeMedia = parseBoolean(req.query.includeMedia, true);
      const { page, pageSize, offset } = getPagination(req);
      const { rows, count } = await Project.findAndCountAll({
        where,
        include: [
          ...(includeMedia ? projectDetailInclude : projectListBaseInclude)
        ],
        order: [['galleryOrder', 'ASC'], ['createdAt', 'DESC']],
        distinct: true,
        limit: pageSize,
        offset
      });

      const mediaCountByProjectId = includeMedia
        ? null
        : await buildProjectMediaCountMap(rows.map((project) => project.id));

      return res.json({
        projects: rows.map((project) => toProjectDto(project, { includeMedia, mediaCountByProjectId })),
        pagination: paginationDto(page, pageSize, count)
      });
    })
  );

  router.get(
    '/projects/:id',
    [...staffGuard, param('id').isUUID()],
    withValidation(async (req, res) => {
      const project = await findByPkOrRespond(Project, req.params.id, res, {
        message: 'Project not found',
        include: projectDetailInclude
      });
      if (!project) return null;

      return res.json({ project: toProjectDto(project) });
    })
  );

  router.post(
    '/projects',
    [
      ...staffGuard,
      ...createProjectWriteValidators({ body, PROJECT_STATUSES })
    ],
    withValidation(async (req, res) => {
      const payload = buildProjectPayload(req.body, { partial: false, parseBoolean });

      try {
        await applyProjectIdentityOverrides({
          source: req.body,
          payload,
          partial: false,
          resolveClientByIdentity,
          resolveManagerByIdentity
        });
        await applyQuoteProjectDefaults({ payload, partial: false, Quote });
      } catch (error) {
        return res.status(400).json({ error: error.message || 'Invalid assignee/client identity' });
      }

      const project = await Project.create(payload);
      clearGalleryCache();
      return res.status(201).json({ project });
    })
  );

  router.patch(
    '/projects/:id',
    [
      ...staffGuard,
      param('id').isUUID(),
      ...createProjectWriteValidators({ body, PROJECT_STATUSES, partial: true })
    ],
    withValidation(async (req, res) => {
      const project = await findByPkOrRespond(Project, req.params.id, res, { message: 'Project not found' });
      if (!project) return null;

      const payload = buildProjectPayload(req.body, { partial: true, parseBoolean });

      try {
        await applyProjectIdentityOverrides({
          source: req.body,
          payload,
          partial: true,
          resolveClientByIdentity,
          resolveManagerByIdentity
        });
        await applyQuoteProjectDefaults({ payload, partial: true, Quote });
      } catch (error) {
        return res.status(400).json({ error: error.message || 'Invalid staff identity' });
      }

      if (!Object.keys(payload).length) {
        return res.status(400).json({ error: 'No changes provided' });
      }

      await project.update(payload);
      clearGalleryCache();
      return res.json({ project });
    })
  );

  router.delete(
    '/projects/:id',
    [...staffGuard, param('id').isUUID()],
    withValidation(async (req, res) => {
      const project = await findByPkOrRespond(Project, req.params.id, res, {
        message: 'Project not found',
        include: [{ model: ProjectMedia, as: 'media' }]
      });
      if (!project) return null;

      for (const media of project.media || []) {
        await safeUnlink(media.storagePath);
      }

      await ProjectMedia.destroy({ where: { projectId: project.id } });
      await project.destroy();

      clearGalleryCache();
      return res.json({ message: 'Project deleted' });
    })
  );

  router.get(
    '/projects/:id/media',
    [...staffGuard, param('id').isUUID()],
    withValidation(async (req, res) => {
      const project = await findByPkOrRespond(Project, req.params.id, res, { message: 'Project not found' });
      if (!project) return null;

      const media = await ProjectMedia.findAll({
        where: { projectId: project.id },
        order: [['mediaType', 'ASC'], ['isCover', 'DESC'], ['galleryOrder', 'ASC'], ['createdAt', 'DESC']]
      });

      return res.json({ media });
    })
  );

  router.post(
    '/projects/:id/media/upload',
    [...staffGuard, param('id').isUUID(), upload.array('files', 20)],
    withValidation(async (req, res) => {
      const project = await findByPkOrRespond(Project, req.params.id, res, { message: 'Project not found' });
      if (!project) {
        await cleanupUploadedFiles(req.files, normalizeStoragePath, safeUnlink);
        return null;
      }

      const files = Array.isArray(req.files) ? req.files : [];
      if (!files.length) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const forcedType = ['image', 'document'].includes(req.body.mediaType) ? req.body.mediaType : null;
      const showInGallery = parseBoolean(req.body.showInGallery, false);
      const galleryOrderStart = Number.parseInt(req.body.galleryOrderStart, 10) || 0;
      const caption = req.body.caption ? String(req.body.caption).trim() : null;
      const markFirstAsCover = parseBoolean(req.body.isCover, false);

      if (markFirstAsCover) {
        await ProjectMedia.update({ isCover: false }, { where: { projectId: project.id, mediaType: 'image' } });
      }

      const records = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const mediaType = forcedType || (String(file.mimetype || '').startsWith('image/') ? 'image' : 'document');
        const shouldShowInGallery = mediaType === 'image' ? showInGallery : false;
        const isCover = mediaType === 'image' ? markFirstAsCover && index === 0 : false;

        records.push({
          projectId: project.id,
          mediaType,
          url: `/uploads/${file.filename}`,
          storagePath: normalizeStoragePath(file.path),
          filename: file.originalname,
          mimeType: file.mimetype || null,
          sizeBytes: Number.isFinite(file.size) ? file.size : null,
          caption,
          showInGallery: shouldShowInGallery,
          galleryOrder: galleryOrderStart + index,
          isCover
        });
      }

      const created = await ProjectMedia.bulkCreate(records, { returning: true });
      clearGalleryCache();
      return res.status(201).json({ media: created });
    })
  );

  router.patch(
    '/projects/:id/media/:mediaId',
    [
      ...staffGuard,
      param('id').isUUID(),
      param('mediaId').isUUID(),
      body('caption').optional().trim(),
      body('showInGallery').optional().isBoolean(),
      body('galleryOrder').optional().isInt(),
      body('isCover').optional().isBoolean()
    ],
    withValidation(async (req, res) => {
      const media = await findOneOrRespond(
        ProjectMedia,
        { id: req.params.mediaId, projectId: req.params.id },
        res,
        { message: 'Media not found' }
      );
      if (!media) return null;

      const payload = {};
      if (typeof req.body.caption !== 'undefined') payload.caption = String(req.body.caption || '').trim() || null;
      if (typeof req.body.galleryOrder !== 'undefined') payload.galleryOrder = Number.parseInt(req.body.galleryOrder, 10) || 0;

      if (typeof req.body.showInGallery !== 'undefined') {
        const requested = parseBoolean(req.body.showInGallery, false);
        if (media.mediaType !== 'image' && requested) {
          return res.status(400).json({ error: 'Only image files can be shown in gallery' });
        }
        payload.showInGallery = media.mediaType === 'image' ? requested : false;
      }

      if (typeof req.body.isCover !== 'undefined') {
        const requestedCover = parseBoolean(req.body.isCover, false);
        if (media.mediaType !== 'image' && requestedCover) {
          return res.status(400).json({ error: 'Only image files can be cover media' });
        }
        payload.isCover = media.mediaType === 'image' ? requestedCover : false;
        if (requestedCover) {
          payload.showInGallery = true;
          await ProjectMedia.update(
            { isCover: false },
            { where: { projectId: media.projectId, mediaType: 'image', id: { [Op.ne]: media.id } } }
          );
        }
      }

      if (!Object.keys(payload).length) {
        return res.status(400).json({ error: 'No changes provided' });
      }

      await media.update(payload);
      clearGalleryCache();
      return res.json({ media });
    })
  );

  router.delete(
    '/projects/:id/media/:mediaId',
    [...staffGuard, param('id').isUUID(), param('mediaId').isUUID()],
    withValidation(async (req, res) => {
      const media = await findOneOrRespond(
        ProjectMedia,
        { id: req.params.mediaId, projectId: req.params.id },
        res,
        { message: 'Media not found' }
      );
      if (!media) return null;

      await safeUnlink(media.storagePath);
      await media.destroy();
      clearGalleryCache();
      return res.json({ message: 'Media deleted' });
    })
  );

  return router;
};
