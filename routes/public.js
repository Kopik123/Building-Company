const express = require('express');
const { query, validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const { fetchPublicServices, applyPublicServicesCacheHeaders } = require('../utils/publicServices');

const router = express.Router();

router.get(
  '/services',
  [
    query('category').optional().isIn(['bathroom', 'kitchen', 'interior', 'outdoor', 'other']),
    query('featured').optional().isIn(['true', 'false', '1', '0'])
  ],
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
