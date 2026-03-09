const { query } = require('express-validator');
const { ServiceOffering } = require('../models');
const { servicesCache, getCached, setCached } = require('./publicCache');

const PUBLIC_SERVICES_TTL_MS = Math.max(1000, Number.parseInt(process.env.PUBLIC_SERVICES_CACHE_TTL_MS || '30000', 10));

const getServicesCacheKey = (query = {}) => JSON.stringify({
  category: query.category || '',
  featured: query.featured || ''
});

const buildServicesWhere = (query = {}) => {
  const where = { showOnWebsite: true, isActive: true };

  if (query.category) {
    where.category = query.category;
  }

  if (typeof query.featured !== 'undefined') {
    where.isFeatured = ['true', '1'].includes(String(query.featured).toLowerCase());
  }

  return where;
};

const publicServicesQueryValidators = [
  query('category').optional().isIn(['bathroom', 'kitchen', 'interior', 'outdoor', 'other']),
  query('featured').optional().isIn(['true', 'false', '1', '0'])
];

const fetchPublicServices = async (query = {}) => {
  const cacheKey = getServicesCacheKey(query);
  const cached = getCached(servicesCache, cacheKey);
  if (cached) {
    return { payload: cached, cacheStatus: 'HIT' };
  }

  const services = await ServiceOffering.findAll({
    where: buildServicesWhere(query),
    order: [['displayOrder', 'ASC'], ['createdAt', 'DESC']]
  });

  const payload = { services };
  setCached(servicesCache, cacheKey, payload, PUBLIC_SERVICES_TTL_MS);
  return { payload, cacheStatus: 'MISS' };
};

const applyPublicServicesCacheHeaders = (res) => {
  const maxAgeSeconds = Math.max(1, Math.floor(PUBLIC_SERVICES_TTL_MS / 1000));
  res.set('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`);
};

module.exports = {
  publicServicesQueryValidators,
  fetchPublicServices,
  applyPublicServicesCacheHeaders
};
