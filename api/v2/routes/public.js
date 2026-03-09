const express = require('express');
const { validationResult } = require('express-validator');
const asyncHandler = require('../../../utils/asyncHandler');
const { ok, fail } = require('../utils/response');
const {
  applyPublicGalleryCacheHeaders,
  fetchManagedGalleryProjectsCached
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

module.exports = router;
