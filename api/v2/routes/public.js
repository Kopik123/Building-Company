const express = require('express');
const { query, validationResult } = require('express-validator');
const { Project, ProjectMedia } = require('../../../models');
const asyncHandler = require('../../../utils/asyncHandler');
const { ok, fail } = require('../utils/response');
const { galleryCache, getCached, setCached } = require('../utils/publicCache');
const { fetchPublicServices } = require('../../../utils/publicServices');

const router = express.Router();
const GALLERY_TTL = Math.max(1000, Number.parseInt(process.env.PUBLIC_GALLERY_CACHE_TTL_MS || '30000', 10));

router.get(
  '/services',
  [
    query('category').optional().isIn(['bathroom', 'kitchen', 'interior', 'outdoor', 'other']),
    query('featured').optional().isIn(['true', 'false', '1', '0'])
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const { payload, cacheStatus } = await fetchPublicServices(req.query);
    return ok(res, payload, { cache: cacheStatus });
  })
);

router.get(
  '/gallery/projects',
  asyncHandler(async (_req, res) => {
    const cached = getCached(galleryCache, 'projects');
    if (cached) return ok(res, cached, { cache: 'HIT' });

    const projects = await Project.findAll({
      where: { showInGallery: true, isActive: true },
      attributes: ['id', 'title', 'location', 'galleryOrder'],
      include: [
        {
          model: ProjectMedia,
          as: 'media',
          attributes: ['url', 'mediaType', 'showInGallery', 'isCover', 'galleryOrder', 'filename'],
          where: { mediaType: 'image', showInGallery: true },
          required: false
        }
      ],
      order: [['galleryOrder', 'ASC'], ['createdAt', 'DESC']]
    });

    const dto = projects
      .map((project) => ({
        id: project.id,
        name: project.title,
        location: project.location || null,
        images: (project.media || [])
          .slice()
          .sort((a, b) => {
            if (a.isCover !== b.isCover) return Number(b.isCover) - Number(a.isCover);
            if (a.galleryOrder !== b.galleryOrder) return a.galleryOrder - b.galleryOrder;
            return String(a.filename || '').localeCompare(String(b.filename || ''));
          })
          .map((media) => media.url)
      }))
      .filter((project) => project.images.length);

    const payload = { projects: dto };
    setCached(galleryCache, 'projects', payload, GALLERY_TTL);
    return ok(res, payload, { cache: 'MISS' });
  })
);

module.exports = router;
