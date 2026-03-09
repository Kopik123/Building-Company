const express = require('express');
const { query, validationResult } = require('express-validator');
const { ServiceOffering } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { servicesCache, getCached, setCached } = require('../utils/publicCache');

const router = express.Router();
const servicesCacheTtlRaw = Number(process.env.PUBLIC_SERVICES_CACHE_TTL_MS);
const PUBLIC_SERVICES_CACHE_TTL_MS = Number.isFinite(servicesCacheTtlRaw) && servicesCacheTtlRaw > 0
  ? servicesCacheTtlRaw
  : 30 * 1000;
const getServicesCacheKey = (req) => JSON.stringify({
  category: req.query.category || '',
  featured: req.query.featured || ''
});

const applyPublicCacheHeaders = (res) => {
  const maxAgeSeconds = Math.max(1, Math.floor(PUBLIC_SERVICES_CACHE_TTL_MS / 1000));
  res.set('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`);
};

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
    const cacheKey = getServicesCacheKey(req);
    const cached = getCached(servicesCache, cacheKey);
    if (cached) {
      applyPublicCacheHeaders(res);
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const where = { showOnWebsite: true, isActive: true };
    if (req.query.category) where.category = req.query.category;
    if (typeof req.query.featured !== 'undefined') {
      const normalized = String(req.query.featured).toLowerCase();
      where.isFeatured = ['true', '1'].includes(normalized);
    }

    const services = await ServiceOffering.findAll({
      where,
      order: [['displayOrder', 'ASC'], ['createdAt', 'DESC']]
    });

    const payload = { services };
    setCached(servicesCache, cacheKey, payload, PUBLIC_SERVICES_CACHE_TTL_MS);

    applyPublicCacheHeaders(res);
    res.set('X-Cache', 'MISS');
    return res.json(payload);
  })
);

module.exports = router;
