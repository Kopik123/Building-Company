const express = require('express');
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const { body, param, query, validationResult } = require('express-validator');
const { Material, ServiceOffering } = require('../../../models');
const asyncHandler = require('../../../utils/asyncHandler');
const { authV2 } = require('../middleware/auth');
const { roleCheckV2 } = require('../middleware/roles');
const { ok, fail } = require('../utils/response');
const { clearServicesCache } = require('../utils/publicCache');
const { MATERIAL_CATEGORIES, SERVICE_CATEGORIES } = require('@building-company/contracts-v2');

const router = express.Router();
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const getPagination = (req) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE));
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize
  };
};

const escapeLike = (value) => String(value || '').replace(/[\\%_]/g, '\\$&');
const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};
const toNullableNumber = (value) => {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};
const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

router.get(
  '/services',
  [
    authV2,
    roleCheckV2('employee', 'manager', 'admin'),
    query('category').optional().isIn(SERVICE_CATEGORIES),
    query('showOnWebsite').optional().isIn(['true', 'false', '1', '0']),
    query('q').optional().trim().isLength({ min: 1, max: 255 }),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());

    const where = {};
    if (req.query.category) where.category = req.query.category;
    if (typeof req.query.showOnWebsite !== 'undefined') where.showOnWebsite = parseBoolean(req.query.showOnWebsite);
    if (req.query.q) {
      const needle = `%${escapeLike(String(req.query.q).trim().toLowerCase())}%`;
      where[Op.or] = [
        sqlWhere(fn('LOWER', col('title')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('slug')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('shortDescription')), { [Op.like]: needle })
      ];
    }

    const { page, pageSize, offset } = getPagination(req);
    const { rows, count } = await ServiceOffering.findAndCountAll({
      where,
      order: [['displayOrder', 'ASC'], ['createdAt', 'DESC']],
      limit: pageSize,
      offset
    });

    return ok(res, { services: rows }, { page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) });
  })
);

router.post(
  '/services',
  [
    authV2,
    roleCheckV2('employee', 'manager', 'admin'),
    body('title').trim().notEmpty(),
    body('slug').optional().trim(),
    body('category').optional().isIn(SERVICE_CATEGORIES),
    body('basePriceFrom').optional({ nullable: true }).isNumeric(),
    body('displayOrder').optional().isInt(),
    body('showOnWebsite').optional().isBoolean(),
    body('isFeatured').optional().isBoolean(),
    body('isActive').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());

    const slug = slugify(req.body.slug || req.body.title);
    if (!slug) return fail(res, 400, 'invalid_slug', 'Invalid slug/title');
    const existing = await ServiceOffering.findOne({ where: { slug } });
    if (existing) return fail(res, 409, 'service_exists', 'Service slug already exists');

    const service = await ServiceOffering.create({
      slug,
      title: String(req.body.title || '').trim(),
      shortDescription: req.body.shortDescription ? String(req.body.shortDescription).trim() : null,
      fullDescription: req.body.fullDescription ? String(req.body.fullDescription).trim() : null,
      category: req.body.category || 'other',
      basePriceFrom: toNullableNumber(req.body.basePriceFrom),
      heroImageUrl: req.body.heroImageUrl ? String(req.body.heroImageUrl).trim() : null,
      isFeatured: parseBoolean(req.body.isFeatured, false),
      showOnWebsite: parseBoolean(req.body.showOnWebsite, true),
      displayOrder: Number.parseInt(req.body.displayOrder, 10) || 0,
      isActive: parseBoolean(req.body.isActive, true)
    });

    clearServicesCache();
    return ok(res, { service }, {}, 201);
  })
);

router.patch(
  '/services/:id',
  [
    authV2,
    roleCheckV2('employee', 'manager', 'admin'),
    param('id').isUUID(),
    body('title').optional().trim().notEmpty(),
    body('slug').optional().trim(),
    body('category').optional().isIn(SERVICE_CATEGORIES),
    body('basePriceFrom').optional({ nullable: true }).isNumeric(),
    body('displayOrder').optional().isInt(),
    body('showOnWebsite').optional().isBoolean(),
    body('isFeatured').optional().isBoolean(),
    body('isActive').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());

    const service = await ServiceOffering.findByPk(req.params.id);
    if (!service) return fail(res, 404, 'service_not_found', 'Service not found');

    const payload = {};
    if (typeof req.body.title !== 'undefined') payload.title = String(req.body.title || '').trim();
    if (typeof req.body.shortDescription !== 'undefined') payload.shortDescription = String(req.body.shortDescription || '').trim() || null;
    if (typeof req.body.fullDescription !== 'undefined') payload.fullDescription = String(req.body.fullDescription || '').trim() || null;
    if (typeof req.body.category !== 'undefined') payload.category = req.body.category;
    if (typeof req.body.basePriceFrom !== 'undefined') payload.basePriceFrom = toNullableNumber(req.body.basePriceFrom);
    if (typeof req.body.heroImageUrl !== 'undefined') payload.heroImageUrl = String(req.body.heroImageUrl || '').trim() || null;
    if (typeof req.body.isFeatured !== 'undefined') payload.isFeatured = parseBoolean(req.body.isFeatured);
    if (typeof req.body.showOnWebsite !== 'undefined') payload.showOnWebsite = parseBoolean(req.body.showOnWebsite);
    if (typeof req.body.displayOrder !== 'undefined') payload.displayOrder = Number.parseInt(req.body.displayOrder, 10) || 0;
    if (typeof req.body.isActive !== 'undefined') payload.isActive = parseBoolean(req.body.isActive);
    if (typeof req.body.slug !== 'undefined' || typeof req.body.title !== 'undefined') {
      const nextSlug = slugify(req.body.slug || payload.title || service.title);
      if (!nextSlug) return fail(res, 400, 'invalid_slug', 'Invalid slug/title');
      const existing = await ServiceOffering.findOne({ where: { slug: nextSlug, id: { [Op.ne]: service.id } } });
      if (existing) return fail(res, 409, 'service_exists', 'Service slug already exists');
      payload.slug = nextSlug;
    }
    if (!Object.keys(payload).length) return fail(res, 400, 'no_changes', 'No changes provided');

    await service.update(payload);
    clearServicesCache();
    return ok(res, { service });
  })
);

router.delete(
  '/services/:id',
  [authV2, roleCheckV2('manager', 'admin'), param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());

    const service = await ServiceOffering.findByPk(req.params.id);
    if (!service) return fail(res, 404, 'service_not_found', 'Service not found');
    await service.destroy();
    clearServicesCache();
    return ok(res, { deleted: true });
  })
);

router.get(
  '/materials',
  [
    authV2,
    roleCheckV2('employee', 'manager', 'admin'),
    query('category').optional().isIn(MATERIAL_CATEGORIES),
    query('lowStock').optional().isIn(['true', 'false', '1', '0']),
    query('q').optional().trim().isLength({ min: 1, max: 255 }),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());

    const where = {};
    if (req.query.category) where.category = req.query.category;
    if (req.query.q) {
      const needle = `%${escapeLike(String(req.query.q).trim().toLowerCase())}%`;
      where[Op.or] = [
        sqlWhere(fn('LOWER', col('name')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('sku')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('supplier')), { [Op.like]: needle })
      ];
    }
    if (typeof req.query.lowStock !== 'undefined') {
      const lowStockOnly = parseBoolean(req.query.lowStock, false);
      where[Op.and] = [
        lowStockOnly
          ? sqlWhere(col('stockQty'), { [Op.lte]: col('minStockQty') })
          : sqlWhere(col('stockQty'), { [Op.gt]: col('minStockQty') })
      ];
    }

    const { page, pageSize, offset } = getPagination(req);
    const { rows, count } = await Material.findAndCountAll({
      where,
      order: [['category', 'ASC'], ['name', 'ASC']],
      limit: pageSize,
      offset
    });

    return ok(res, { materials: rows }, { page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) });
  })
);

router.post(
  '/materials',
  [
    authV2,
    roleCheckV2('employee', 'manager', 'admin'),
    body('name').trim().notEmpty(),
    body('category').optional().isIn(MATERIAL_CATEGORIES),
    body('stockQty').optional({ nullable: true }).isNumeric(),
    body('minStockQty').optional({ nullable: true }).isNumeric(),
    body('unitCost').optional({ nullable: true }).isNumeric(),
    body('isActive').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());

    const sku = String(req.body.sku || '').trim() || null;
    if (sku) {
      const existing = await Material.findOne({ where: { sku } });
      if (existing) return fail(res, 409, 'material_exists', 'Material SKU already exists');
    }

    const material = await Material.create({
      sku,
      name: String(req.body.name || '').trim(),
      category: req.body.category || 'other',
      unit: String(req.body.unit || 'pcs').trim() || 'pcs',
      stockQty: toNullableNumber(req.body.stockQty) ?? 0,
      minStockQty: toNullableNumber(req.body.minStockQty) ?? 0,
      unitCost: toNullableNumber(req.body.unitCost),
      supplier: req.body.supplier ? String(req.body.supplier).trim() : null,
      notes: req.body.notes ? String(req.body.notes).trim() : null,
      isActive: parseBoolean(req.body.isActive, true)
    });

    return ok(res, { material }, {}, 201);
  })
);

router.patch(
  '/materials/:id',
  [
    authV2,
    roleCheckV2('employee', 'manager', 'admin'),
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('category').optional().isIn(MATERIAL_CATEGORIES),
    body('stockQty').optional({ nullable: true }).isNumeric(),
    body('minStockQty').optional({ nullable: true }).isNumeric(),
    body('unitCost').optional({ nullable: true }).isNumeric(),
    body('isActive').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());

    const material = await Material.findByPk(req.params.id);
    if (!material) return fail(res, 404, 'material_not_found', 'Material not found');

    const payload = {};
    if (typeof req.body.name !== 'undefined') payload.name = String(req.body.name || '').trim();
    if (typeof req.body.category !== 'undefined') payload.category = req.body.category;
    if (typeof req.body.unit !== 'undefined') payload.unit = String(req.body.unit || '').trim() || 'pcs';
    if (typeof req.body.stockQty !== 'undefined') payload.stockQty = toNullableNumber(req.body.stockQty) ?? 0;
    if (typeof req.body.minStockQty !== 'undefined') payload.minStockQty = toNullableNumber(req.body.minStockQty) ?? 0;
    if (typeof req.body.unitCost !== 'undefined') payload.unitCost = toNullableNumber(req.body.unitCost);
    if (typeof req.body.supplier !== 'undefined') payload.supplier = String(req.body.supplier || '').trim() || null;
    if (typeof req.body.notes !== 'undefined') payload.notes = String(req.body.notes || '').trim() || null;
    if (typeof req.body.isActive !== 'undefined') payload.isActive = parseBoolean(req.body.isActive);
    if (typeof req.body.sku !== 'undefined') {
      const nextSku = String(req.body.sku || '').trim() || null;
      if (nextSku) {
        const existing = await Material.findOne({ where: { sku: nextSku, id: { [Op.ne]: material.id } } });
        if (existing) return fail(res, 409, 'material_exists', 'Material SKU already exists');
      }
      payload.sku = nextSku;
    }
    if (!Object.keys(payload).length) return fail(res, 400, 'no_changes', 'No changes provided');

    await material.update(payload);
    return ok(res, { material });
  })
);

router.delete(
  '/materials/:id',
  [authV2, roleCheckV2('manager', 'admin'), param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());

    const material = await Material.findByPk(req.params.id);
    if (!material) return fail(res, 404, 'material_not_found', 'Material not found');
    await material.destroy();
    return ok(res, { deleted: true });
  })
);

module.exports = router;
