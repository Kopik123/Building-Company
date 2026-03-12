const express = require('express');

module.exports = function createCatalogRoutes({
  body,
  param,
  query,
  validationResult,
  asyncHandler,
  staffGuard,
  ServiceOffering,
  Material,
  Op,
  fn,
  col,
  sqlWhere,
  SERVICE_CATEGORIES,
  MATERIAL_CATEGORIES,
  MAX_PAGE_SIZE,
  parseBoolean,
  escapeLike,
  getPagination,
  paginationDto,
  toNullableNumber,
  slugify,
  clearServicesCache
}) {
  const router = express.Router();

  router.get(
    '/services',
    [
      ...staffGuard,
      query('showOnWebsite').optional().isIn(['true', 'false', '1', '0']),
      query('isFeatured').optional().isIn(['true', 'false', '1', '0']),
      query('isActive').optional().isIn(['true', 'false', '1', '0']),
      query('category').optional().isIn(SERVICE_CATEGORIES),
      query('q').optional().trim().isLength({ min: 1, max: 255 }),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const where = {};
      if (typeof req.query.showOnWebsite !== 'undefined') {
        where.showOnWebsite = parseBoolean(req.query.showOnWebsite);
      }
      if (typeof req.query.isFeatured !== 'undefined') {
        where.isFeatured = parseBoolean(req.query.isFeatured);
      }
      if (typeof req.query.isActive !== 'undefined') {
        where.isActive = parseBoolean(req.query.isActive);
      }
      if (req.query.category) where.category = req.query.category;
      if (req.query.q) {
        const needle = `%${escapeLike(String(req.query.q || '').trim().toLowerCase())}%`;
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

      return res.json({
        services: rows,
        pagination: paginationDto(page, pageSize, count)
      });
    })
  );

  router.post(
    '/services',
    [
      ...staffGuard,
      body('title').trim().notEmpty(),
      body('slug').optional().trim(),
      body('shortDescription').optional().trim(),
      body('fullDescription').optional().trim(),
      body('category').optional().isIn(SERVICE_CATEGORIES),
      body('basePriceFrom').optional({ nullable: true }).isNumeric(),
      body('heroImageUrl').optional().trim(),
      body('isFeatured').optional().isBoolean(),
      body('showOnWebsite').optional().isBoolean(),
      body('displayOrder').optional().isInt(),
      body('isActive').optional().isBoolean()
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const slug = slugify(req.body.slug || req.body.title);
      if (!slug) {
        return res.status(400).json({ error: 'Invalid slug/title' });
      }

      const existing = await ServiceOffering.findOne({ where: { slug } });
      if (existing) {
        return res.status(409).json({ error: 'Service slug already exists' });
      }

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
      return res.status(201).json({ service });
    })
  );

  router.patch(
    '/services/:id',
    [
      ...staffGuard,
      param('id').isUUID(),
      body('title').optional().trim().notEmpty(),
      body('slug').optional().trim(),
      body('shortDescription').optional().trim(),
      body('fullDescription').optional().trim(),
      body('category').optional().isIn(SERVICE_CATEGORIES),
      body('basePriceFrom').optional({ nullable: true }).isNumeric(),
      body('heroImageUrl').optional().trim(),
      body('isFeatured').optional().isBoolean(),
      body('showOnWebsite').optional().isBoolean(),
      body('displayOrder').optional().isInt(),
      body('isActive').optional().isBoolean()
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const service = await ServiceOffering.findByPk(req.params.id);
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

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
        if (!nextSlug) return res.status(400).json({ error: 'Invalid slug/title' });
        const existing = await ServiceOffering.findOne({ where: { slug: nextSlug, id: { [Op.ne]: service.id } } });
        if (existing) return res.status(409).json({ error: 'Service slug already exists' });
        payload.slug = nextSlug;
      }

      if (!Object.keys(payload).length) {
        return res.status(400).json({ error: 'No changes provided' });
      }

      await service.update(payload);
      clearServicesCache();
      return res.json({ service });
    })
  );

  router.delete(
    '/services/:id',
    [...staffGuard, param('id').isUUID()],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const service = await ServiceOffering.findByPk(req.params.id);
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      await service.destroy();
      clearServicesCache();
      return res.json({ message: 'Service deleted' });
    })
  );

  router.get(
    '/materials',
    [
      ...staffGuard,
      query('category').optional().isIn(MATERIAL_CATEGORIES),
      query('lowStock').optional().isIn(['true', 'false', '1', '0']),
      query('isActive').optional().isIn(['true', 'false', '1', '0']),
      query('q').optional().trim().isLength({ min: 1, max: 255 }),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const baseWhere = {};
      if (req.query.category) baseWhere.category = req.query.category;
      if (typeof req.query.isActive !== 'undefined') {
        baseWhere.isActive = parseBoolean(req.query.isActive);
      }
      if (req.query.q) {
        const needle = `%${escapeLike(String(req.query.q || '').trim().toLowerCase())}%`;
        baseWhere[Op.or] = [
          sqlWhere(fn('LOWER', col('name')), { [Op.like]: needle }),
          sqlWhere(fn('LOWER', col('sku')), { [Op.like]: needle }),
          sqlWhere(fn('LOWER', col('supplier')), { [Op.like]: needle })
        ];
      }

      const lowStockFilterSet = typeof req.query.lowStock !== 'undefined';
      const lowStockOnly = parseBoolean(req.query.lowStock, false);
      const where = { ...baseWhere };
      if (lowStockFilterSet) {
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

      const lowStockCount = await Material.count({
        where: {
          ...baseWhere,
          [Op.and]: [sqlWhere(col('stockQty'), { [Op.lte]: col('minStockQty') })]
        }
      });

      return res.json({
        materials: rows,
        stats: { total: count, lowStockCount },
        pagination: paginationDto(page, pageSize, count)
      });
    })
  );

  router.post(
    '/materials',
    [
      ...staffGuard,
      body('name').trim().notEmpty(),
      body('sku').optional().trim(),
      body('category').optional().isIn(MATERIAL_CATEGORIES),
      body('unit').optional().trim(),
      body('stockQty').optional({ nullable: true }).isNumeric(),
      body('minStockQty').optional({ nullable: true }).isNumeric(),
      body('unitCost').optional({ nullable: true }).isNumeric(),
      body('supplier').optional().trim(),
      body('notes').optional().trim(),
      body('isActive').optional().isBoolean()
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const skuRaw = String(req.body.sku || '').trim();
      if (skuRaw) {
        const existing = await Material.findOne({ where: { sku: skuRaw } });
        if (existing) return res.status(409).json({ error: 'Material SKU already exists' });
      }

      const material = await Material.create({
        sku: skuRaw || null,
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

      return res.status(201).json({ material });
    })
  );

  router.patch(
    '/materials/:id',
    [
      ...staffGuard,
      param('id').isUUID(),
      body('name').optional().trim().notEmpty(),
      body('sku').optional().trim(),
      body('category').optional().isIn(MATERIAL_CATEGORIES),
      body('unit').optional().trim(),
      body('stockQty').optional({ nullable: true }).isNumeric(),
      body('minStockQty').optional({ nullable: true }).isNumeric(),
      body('unitCost').optional({ nullable: true }).isNumeric(),
      body('supplier').optional().trim(),
      body('notes').optional().trim(),
      body('isActive').optional().isBoolean()
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const material = await Material.findByPk(req.params.id);
      if (!material) {
        return res.status(404).json({ error: 'Material not found' });
      }

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
          if (existing) return res.status(409).json({ error: 'Material SKU already exists' });
        }
        payload.sku = nextSku;
      }

      if (!Object.keys(payload).length) {
        return res.status(400).json({ error: 'No changes provided' });
      }

      await material.update(payload);
      return res.json({ material });
    })
  );

  router.delete(
    '/materials/:id',
    [...staffGuard, param('id').isUUID()],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const material = await Material.findByPk(req.params.id);
      if (!material) {
        return res.status(404).json({ error: 'Material not found' });
      }

      await material.destroy();
      return res.json({ message: 'Material deleted' });
    })
  );

  return router;
};
