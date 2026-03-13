const express = require('express');

module.exports = function createStaffSearchSeedRoutes({
  body,
  query,
  validationResult,
  asyncHandler,
  managerGuard,
  staffGuard,
  User,
  ServiceOffering,
  Material,
  Project,
  ProjectMedia,
  sequelize,
  fn,
  col,
  Op,
  sqlWhere,
  MAX_PAGE_SIZE,
  normalizeEmail,
  escapeLike,
  paginationDto,
  getPagination,
  parseBoolean,
  STARTER_SERVICE_SEED,
  STARTER_MATERIAL_SEED,
  STARTER_PROJECT_SEED,
  STATIC_GALLERY_PREFIX,
  clearServicesCache,
  clearGalleryCache,
  fs,
  path,
  projectRoot
}) {
  const router = express.Router();

  router.post(
    '/staff',
    [
      ...managerGuard,
      body('email').isEmail(),
      body('password').isLength({ min: 8 }),
      body('name').trim().notEmpty(),
      body('role').isIn(['employee', 'manager']),
      body('phone').optional().trim()
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const email = normalizeEmail(req.body.email);
      const { password, name, phone, role } = req.body;

      if (role === 'manager' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can create manager accounts' });
      }

      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const user = await User.create({ email, password, name, phone: phone || null, role });
      return res.status(201).json({ user });
    })
  );

  router.get(
    '/clients/search',
    [
      ...staffGuard,
      query('email').optional().trim().isLength({ min: 1, max: 255 }),
      query('q').optional().trim().isLength({ min: 1, max: 255 }),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { page, pageSize, offset } = getPagination(req);
      const needleRaw = String(req.query.email || req.query.q || '').trim().toLowerCase();
      const where = { role: 'client', isActive: true };

      if (needleRaw) {
        const pattern = `%${escapeLike(needleRaw)}%`;
        where[Op.or] = [
          sqlWhere(fn('LOWER', col('email')), { [Op.like]: pattern }),
          sqlWhere(fn('LOWER', col('name')), { [Op.like]: pattern })
        ];
      }

      const { rows, count } = await User.findAndCountAll({
        where,
        attributes: ['id', 'name', 'email', 'phone'],
        order: [['email', 'ASC']],
        limit: pageSize,
        offset
      });

      return res.json({ clients: rows, pagination: paginationDto(page, pageSize, count) });
    })
  );

  router.get(
    '/staff/search',
    [
      ...staffGuard,
      query('email').optional().trim().isLength({ min: 1, max: 255 }),
      query('q').optional().trim().isLength({ min: 1, max: 255 }),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { page, pageSize, offset } = getPagination(req);
      const needleRaw = String(req.query.email || req.query.q || '').trim().toLowerCase();
      const where = {
        role: { [Op.in]: ['employee', 'manager', 'admin'] },
        isActive: true
      };

      if (needleRaw) {
        const pattern = `%${escapeLike(needleRaw)}%`;
        where[Op.or] = [
          sqlWhere(fn('LOWER', col('email')), { [Op.like]: pattern }),
          sqlWhere(fn('LOWER', col('name')), { [Op.like]: pattern })
        ];
      }

      const { rows, count } = await User.findAndCountAll({
        where,
        attributes: ['id', 'name', 'email', 'role'],
        order: [['email', 'ASC']],
        limit: pageSize,
        offset
      });

      return res.json({ staff: rows, pagination: paginationDto(page, pageSize, count) });
    })
  );

  router.post(
    '/seed/starter',
    [
      ...managerGuard,
      body('force').optional().isBoolean()
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const force = parseBoolean(req.body.force, false);
      const stats = {
        servicesCreated: 0,
        servicesUpdated: 0,
        materialsCreated: 0,
        materialsUpdated: 0,
        projectsCreated: 0,
        mediaCreated: 0
      };

      const tx = await sequelize.transaction();
      try {
        for (const item of STARTER_SERVICE_SEED) {
          const [service, created] = await ServiceOffering.findOrCreate({
            where: { slug: item.slug },
            defaults: { ...item, isActive: true },
            transaction: tx
          });
          if (created) {
            stats.servicesCreated += 1;
          } else if (force) {
            await service.update({ ...item, isActive: true }, { transaction: tx });
            stats.servicesUpdated += 1;
          }
        }

        for (const item of STARTER_MATERIAL_SEED) {
          const [material, created] = await Material.findOrCreate({
            where: { sku: item.sku },
            defaults: { ...item, isActive: true },
            transaction: tx
          });
          if (created) {
            stats.materialsCreated += 1;
          } else if (force) {
            await material.update({ ...item, isActive: true }, { transaction: tx });
            stats.materialsUpdated += 1;
          }
        }

        for (const projectSeed of STARTER_PROJECT_SEED) {
          const [project, created] = await Project.findOrCreate({
            where: { title: projectSeed.title, location: projectSeed.location || null },
            defaults: {
              title: projectSeed.title,
              location: projectSeed.location || null,
              status: projectSeed.status,
              description: projectSeed.description,
              budgetEstimate: projectSeed.budgetEstimate,
              showInGallery: projectSeed.showInGallery,
              galleryOrder: projectSeed.galleryOrder,
              isActive: true
            },
            transaction: tx
          });

          if (created) {
            stats.projectsCreated += 1;
          } else if (force) {
            await project.update(
              {
                status: projectSeed.status,
                description: projectSeed.description,
                budgetEstimate: projectSeed.budgetEstimate,
                showInGallery: projectSeed.showInGallery,
                galleryOrder: projectSeed.galleryOrder,
                isActive: true
              },
              { transaction: tx }
            );
          }

          const existingMediaCount = await ProjectMedia.count({ where: { projectId: project.id }, transaction: tx });
          if (existingMediaCount > 0 && !force) {
            continue;
          }

          if (force) {
            await ProjectMedia.destroy({ where: { projectId: project.id }, transaction: tx });
          }

          for (let index = 0; index < projectSeed.media.length; index += 1) {
            const filename = projectSeed.media[index];
            const relativePath = `${STATIC_GALLERY_PREFIX}${filename}`;
            const absolutePath = path.join(projectRoot, relativePath);
            if (!fs.existsSync(absolutePath)) {
              continue;
            }

            await ProjectMedia.create(
              {
                projectId: project.id,
                mediaType: 'image',
                url: `/${relativePath.replace(/\\/g, '/')}`,
                storagePath: relativePath.replace(/\\/g, '/'),
                filename,
                mimeType: 'image/jpeg',
                caption: projectSeed.title,
                showInGallery: true,
                galleryOrder: index,
                isCover: index === 0
              },
              { transaction: tx }
            );
            stats.mediaCreated += 1;
          }
        }

        await tx.commit();
        clearServicesCache();
        clearGalleryCache();
        return res.json({ message: 'Starter seed completed', force, stats });
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    })
  );

  return router;
};
