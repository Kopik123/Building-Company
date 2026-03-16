const express = require('express');
const { validationResult } = require('express-validator');
const asyncHandler = require('../../../utils/asyncHandler');
const { ok, fail } = require('../utils/response');
const {
  GALLERY_FILES_CACHE_TTL_MS,
  applyPublicGalleryCacheHeaders,
  fetchManagedGalleryProjectsCached,
  fetchServiceGalleryFoldersCached
} = require('../../../utils/publicGallery');
const { fetchPublicServices, publicServicesQueryValidators } = require('../../../utils/publicServices');

const router = express.Router();

router.get(
  '/services',
  publicServicesQueryValidators,
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
    const { payload, cacheStatus } = await fetchManagedGalleryProjectsCached();
    applyPublicGalleryCacheHeaders(res);
    return ok(res, payload, { cache: cacheStatus });
  })
);

router.get(
  '/gallery/services',
  asyncHandler(async (req, res) => {
    const galleryPath = req.app?.locals?.galleryPath;
    if (!galleryPath) {
      return fail(res, 500, 'gallery_path_missing', 'Gallery path is not configured');
    }

    const { payload, cacheStatus } = await fetchServiceGalleryFoldersCached(galleryPath);
    applyPublicGalleryCacheHeaders(res, GALLERY_FILES_CACHE_TTL_MS);
    return ok(res, payload, { cache: cacheStatus });
  })
);

module.exports = router;
