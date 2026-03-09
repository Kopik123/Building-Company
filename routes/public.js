const express = require('express');
const { validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const {
  fetchPublicServices,
  applyPublicServicesCacheHeaders,
  publicServicesQueryValidators
} = require('../utils/publicServices');

const router = express.Router();

router.get(
  '/services',
  publicServicesQueryValidators,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { payload, cacheStatus } = await fetchPublicServices(req.query);
    applyPublicServicesCacheHeaders(res);
    res.set('X-Cache', cacheStatus);
    return res.json(payload);
  })
);

module.exports = router;
