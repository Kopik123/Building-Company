const express = require('express');

module.exports = function createProjectRoutes({
  body,
  param,
  query,
  validationResult,
  asyncHandler,
  staffGuard,
  upload,
  Project,
  ProjectMedia,
  GroupThread,
  User,
  Quote,
  Op,
  fn,
  col,
  sqlWhere,
  MAX_PAGE_SIZE,
  PROJECT_STATUSES,
  parseBoolean,
  normalizeEmail,
  escapeLike,
  getPagination,
  paginationDto,
  resolveClientByIdentity,
  resolveManagerByIdentity,
  buildProjectMediaCountMap,
  toProjectDto,
  clearGalleryCache,
  safeUnlink,
  normalizeStoragePath
}) {
  const router = express.Router();

  const syncProjectChatLinks = async (project) => {
    if (!project?.id || !project.quoteId) return;

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
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

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
          sqlWhere(fn('LOWER', col('description')), { [Op.like]: needle })
        ];
      }

      const includeMedia = parseBoolean(req.query.includeMedia, false);
      const { page, pageSize, offset } = getPagination(req);
      const { rows, count } = await Project.findAndCountAll({
        where,
        include: [
          ...(includeMedia ? [{ model: ProjectMedia, as: 'media' }] : []),
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

      return res.json({
        projects: rows.map((project) => toProjectDto(project, { includeMedia, mediaCountByProjectId })),
        pagination: paginationDto(page, pageSize, count)
      });
    })
  );

  router.get(
    '/projects/:id',
    [...staffGuard, param('id').isUUID()],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const project = await Project.findByPk(req.params.id, {
        include: [
          { model: ProjectMedia, as: 'media' },
          { model: User, as: 'client', attributes: ['id', 'name', 'email'], required: false },
          { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'], required: false },
          { model: Quote, as: 'quote', attributes: ['id', 'status', 'projectType', 'location'], required: false }
        ]
      });
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      return res.json({ project: toProjectDto(project) });
    })
  );

  router.post(
    '/projects',
    [
      ...staffGuard,
      body('title').trim().notEmpty(),
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
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const payload = {
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
      };

      try {
        const resolvedClientId = await resolveClientByIdentity({
          clientId: payload.clientId,
          clientEmail: req.body.clientEmail
        });
        if (typeof resolvedClientId !== 'undefined') payload.clientId = resolvedClientId;

        const resolvedManagerId = await resolveManagerByIdentity({
          assignedManagerId: payload.assignedManagerId,
          assignedManagerEmail: req.body.assignedManagerEmail
        });
        if (typeof resolvedManagerId !== 'undefined') payload.assignedManagerId = resolvedManagerId;
      } catch (error) {
        return res.status(400).json({ error: error.message || 'Invalid assignee/client identity' });
      }

      if (payload.quoteId) {
        const quote = await Quote.findByPk(payload.quoteId);
        if (!quote) return res.status(400).json({ error: 'Invalid quoteId' });
        if (!payload.clientId && quote.clientId) payload.clientId = quote.clientId;
        if (!payload.assignedManagerId && quote.assignedManagerId) payload.assignedManagerId = quote.assignedManagerId;
        if (!payload.location && quote.location) payload.location = quote.location;
      }

      const project = await Project.create(payload);
      await syncProjectChatLinks(project);
      clearGalleryCache();
      return res.status(201).json({ project });
    })
  );

  router.patch(
    '/projects/:id',
    [
      ...staffGuard,
      param('id').isUUID(),
      body('title').optional().trim().notEmpty(),
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
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const project = await Project.findByPk(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const payload = {};
      if (typeof req.body.title !== 'undefined') payload.title = String(req.body.title || '').trim();
      if (typeof req.body.quoteId !== 'undefined') payload.quoteId = req.body.quoteId || null;
      if (typeof req.body.clientId !== 'undefined') payload.clientId = req.body.clientId || null;
      if (typeof req.body.assignedManagerId !== 'undefined') payload.assignedManagerId = req.body.assignedManagerId || null;
      if (typeof req.body.location !== 'undefined') payload.location = String(req.body.location || '').trim() || null;
      if (typeof req.body.description !== 'undefined') payload.description = String(req.body.description || '').trim() || null;
      if (typeof req.body.status !== 'undefined') payload.status = req.body.status;
      if (typeof req.body.budgetEstimate !== 'undefined') payload.budgetEstimate = String(req.body.budgetEstimate || '').trim() || null;
      if (typeof req.body.startDate !== 'undefined') payload.startDate = req.body.startDate || null;
      if (typeof req.body.endDate !== 'undefined') payload.endDate = req.body.endDate || null;
      if (typeof req.body.showInGallery !== 'undefined') payload.showInGallery = parseBoolean(req.body.showInGallery);
      if (typeof req.body.galleryOrder !== 'undefined') payload.galleryOrder = Number.parseInt(req.body.galleryOrder, 10) || 0;
      if (typeof req.body.isActive !== 'undefined') payload.isActive = parseBoolean(req.body.isActive);

      if (Object.prototype.hasOwnProperty.call(req.body, 'clientEmail')) {
        try {
          payload.clientId = await resolveClientByIdentity({
            clientId: payload.clientId,
            clientEmail: req.body.clientEmail
          });
        } catch (error) {
          return res.status(400).json({ error: error.message || 'Invalid client identity' });
        }
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'assignedManagerEmail')) {
        try {
          payload.assignedManagerId = await resolveManagerByIdentity({
            assignedManagerId: payload.assignedManagerId,
            assignedManagerEmail: req.body.assignedManagerEmail
          });
        } catch (error) {
          return res.status(400).json({ error: error.message || 'Invalid staff identity' });
        }
      }

      if (!Object.keys(payload).length) {
        return res.status(400).json({ error: 'No changes provided' });
      }

      if (Object.prototype.hasOwnProperty.call(payload, 'quoteId') && payload.quoteId) {
        const quote = await Quote.findByPk(payload.quoteId);
        if (!quote) return res.status(400).json({ error: 'Invalid quoteId' });
        if (!Object.prototype.hasOwnProperty.call(payload, 'clientId') && quote.clientId) payload.clientId = quote.clientId;
        if (!Object.prototype.hasOwnProperty.call(payload, 'assignedManagerId') && quote.assignedManagerId) payload.assignedManagerId = quote.assignedManagerId;
        if (!Object.prototype.hasOwnProperty.call(payload, 'location') && quote.location) payload.location = quote.location;
      }

      await project.update(payload);
      await syncProjectChatLinks(project);
      clearGalleryCache();
      return res.json({ project });
    })
  );

  router.delete(
    '/projects/:id',
    [...staffGuard, param('id').isUUID()],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const project = await Project.findByPk(req.params.id, {
        include: [{ model: ProjectMedia, as: 'media' }]
      });
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

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
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const project = await Project.findByPk(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

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
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const project = await Project.findByPk(req.params.id);
      if (!project) {
        for (const file of req.files || []) {
          await safeUnlink(normalizeStoragePath(file.path));
        }
        return res.status(404).json({ error: 'Project not found' });
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
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const media = await ProjectMedia.findOne({
        where: {
          id: req.params.mediaId,
          projectId: req.params.id
        }
      });
      if (!media) {
        return res.status(404).json({ error: 'Media not found' });
      }

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
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const media = await ProjectMedia.findOne({
        where: {
          id: req.params.mediaId,
          projectId: req.params.id
        }
      });
      if (!media) {
        return res.status(404).json({ error: 'Media not found' });
      }

      await safeUnlink(media.storagePath);
      await media.destroy();
      clearGalleryCache();
      return res.json({ message: 'Media deleted' });
    })
  );

  return router;
};
