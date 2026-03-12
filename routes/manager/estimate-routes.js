const express = require('express');

module.exports = function createEstimateRoutes({
  body,
  param,
  query,
  validationResult,
  asyncHandler,
  managerGuard,
  staffGuard,
  Estimate,
  EstimateLine,
  Project,
  Quote,
  User,
  ESTIMATE_STATUSES,
  ESTIMATE_LINE_TYPES,
  MAX_PAGE_SIZE,
  Op,
  fn,
  col,
  sqlWhere,
  getPagination,
  paginationDto,
  escapeLike,
  loadEstimateDetail,
  toEstimateDto,
  toEstimateLineDto,
  toNullableNumber,
  resolveEstimateLineInput,
  calculateEstimateLineTotal,
  recalculateEstimateTotals
}) {
  const router = express.Router();

  router.get(
    '/estimates',
    [
      ...staffGuard,
      query('projectId').optional().isUUID(),
      query('quoteId').optional().isUUID(),
      query('status').optional().isIn(ESTIMATE_STATUSES),
      query('q').optional().trim().isLength({ min: 1, max: 255 }),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const where = { isActive: true };
      if (req.query.projectId) where.projectId = req.query.projectId;
      if (req.query.quoteId) where.quoteId = req.query.quoteId;
      if (req.query.status) where.status = req.query.status;
      if (req.query.q) {
        const needle = `%${escapeLike(String(req.query.q || '').trim().toLowerCase())}%`;
        where[Op.or] = [
          sqlWhere(fn('LOWER', col('title')), { [Op.like]: needle }),
          sqlWhere(fn('LOWER', col('notes')), { [Op.like]: needle })
        ];
      }

      const { page, pageSize, offset } = getPagination(req);
      const { rows, count } = await Estimate.findAndCountAll({
        where,
        include: [
          { model: Project, as: 'project', attributes: ['id', 'title', 'location'], required: false },
          { model: Quote, as: 'quote', attributes: ['id', 'projectType', 'location', 'status'], required: false },
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false }
        ],
        order: [['updatedAt', 'DESC']],
        limit: pageSize,
        offset
      });

      return res.json({
        estimates: rows.map((estimate) => toEstimateDto(estimate)),
        pagination: paginationDto(page, pageSize, count)
      });
    })
  );

  router.get(
    '/estimates/:id',
    [...staffGuard, param('id').isUUID()],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const estimate = await loadEstimateDetail(req.params.id);
      if (!estimate) {
        return res.status(404).json({ error: 'Estimate not found' });
      }

      return res.json({ estimate });
    })
  );

  router.post(
    '/estimates',
    [
      ...managerGuard,
      body('projectId').optional({ nullable: true }).isUUID(),
      body('quoteId').optional({ nullable: true }).isUUID(),
      body('title').trim().notEmpty(),
      body('status').optional().isIn(ESTIMATE_STATUSES),
      body('notes').optional().trim()
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const estimate = await Estimate.create({
        projectId: req.body.projectId || null,
        quoteId: req.body.quoteId || null,
        createdById: req.user.id,
        title: String(req.body.title || '').trim(),
        status: req.body.status || 'draft',
        notes: req.body.notes ? String(req.body.notes).trim() : null,
        subtotal: 0,
        total: 0,
        isActive: true
      });

      const detail = await loadEstimateDetail(estimate.id);
      return res.status(201).json({ estimate: detail });
    })
  );

  router.patch(
    '/estimates/:id',
    [
      ...managerGuard,
      param('id').isUUID(),
      body('projectId').optional({ nullable: true }).isUUID(),
      body('quoteId').optional({ nullable: true }).isUUID(),
      body('title').optional().trim().notEmpty(),
      body('status').optional().isIn(ESTIMATE_STATUSES),
      body('notes').optional().trim()
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const estimate = await Estimate.findByPk(req.params.id);
      if (!estimate) {
        return res.status(404).json({ error: 'Estimate not found' });
      }

      const payload = {};
      if (typeof req.body.projectId !== 'undefined') payload.projectId = req.body.projectId || null;
      if (typeof req.body.quoteId !== 'undefined') payload.quoteId = req.body.quoteId || null;
      if (typeof req.body.title !== 'undefined') payload.title = String(req.body.title || '').trim();
      if (typeof req.body.status !== 'undefined') payload.status = req.body.status;
      if (typeof req.body.notes !== 'undefined') payload.notes = String(req.body.notes || '').trim() || null;

      if (!Object.keys(payload).length) {
        return res.status(400).json({ error: 'No changes provided' });
      }

      await estimate.update(payload);
      const detail = await loadEstimateDetail(estimate.id);
      return res.json({ estimate: detail });
    })
  );

  router.delete(
    '/estimates/:id',
    [...managerGuard, param('id').isUUID()],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const estimate = await Estimate.findByPk(req.params.id);
      if (!estimate) {
        return res.status(404).json({ error: 'Estimate not found' });
      }

      await estimate.destroy();
      return res.json({ message: 'Estimate deleted' });
    })
  );

  router.post(
    '/estimates/:id/lines',
    [
      ...managerGuard,
      param('id').isUUID(),
      body('lineType').optional().isIn(ESTIMATE_LINE_TYPES),
      body('serviceId').optional({ nullable: true }).isUUID(),
      body('materialId').optional({ nullable: true }).isUUID(),
      body('description').optional().trim(),
      body('unit').optional().trim(),
      body('quantity').optional({ nullable: true }).isNumeric(),
      body('unitCost').optional({ nullable: true }).isNumeric(),
      body('lineTotalOverride').optional({ nullable: true }).isNumeric(),
      body('notes').optional().trim(),
      body('sortOrder').optional().isInt()
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const estimate = await Estimate.findByPk(req.params.id);
      if (!estimate) {
        return res.status(404).json({ error: 'Estimate not found' });
      }

      const resolved = await resolveEstimateLineInput({
        lineType: req.body.lineType,
        serviceId: req.body.serviceId,
        materialId: req.body.materialId,
        description: req.body.description,
        unit: req.body.unit,
        unitCost: req.body.unitCost
      });
      const sortOrder = typeof req.body.sortOrder !== 'undefined'
        ? Number.parseInt(req.body.sortOrder, 10) || 0
        : await EstimateLine.count({ where: { estimateId: estimate.id } });
      const quantity = toNullableNumber(req.body.quantity) ?? 1;
      const lineTotalOverride = toNullableNumber(req.body.lineTotalOverride);
      const line = await EstimateLine.create({
        estimateId: estimate.id,
        lineType: resolved.lineType,
        serviceId: resolved.serviceId,
        materialId: resolved.materialId,
        description: resolved.description,
        unit: resolved.unit,
        quantity,
        unitCost: resolved.unitCost,
        lineTotalOverride,
        lineTotal: calculateEstimateLineTotal({ quantity, unitCost: resolved.unitCost, lineTotalOverride }),
        notes: req.body.notes ? String(req.body.notes).trim() : null,
        sortOrder
      });

      await recalculateEstimateTotals(estimate.id);
      const detail = await loadEstimateDetail(estimate.id);
      return res.status(201).json({ line: toEstimateLineDto(line), estimate: detail });
    })
  );

  router.patch(
    '/estimates/:id/lines/:lineId',
    [
      ...managerGuard,
      param('id').isUUID(),
      param('lineId').isUUID(),
      body('lineType').optional().isIn(ESTIMATE_LINE_TYPES),
      body('serviceId').optional({ nullable: true }).isUUID(),
      body('materialId').optional({ nullable: true }).isUUID(),
      body('description').optional().trim(),
      body('unit').optional().trim(),
      body('quantity').optional({ nullable: true }).isNumeric(),
      body('unitCost').optional({ nullable: true }).isNumeric(),
      body('lineTotalOverride').optional({ nullable: true }).isNumeric(),
      body('notes').optional().trim(),
      body('sortOrder').optional().isInt()
    ],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const line = await EstimateLine.findOne({
        where: {
          id: req.params.lineId,
          estimateId: req.params.id
        }
      });
      if (!line) {
        return res.status(404).json({ error: 'Estimate line not found' });
      }

      const resolved = await resolveEstimateLineInput({
        lineType: req.body.lineType || line.lineType,
        serviceId: typeof req.body.serviceId !== 'undefined' ? req.body.serviceId : line.serviceId,
        materialId: typeof req.body.materialId !== 'undefined' ? req.body.materialId : line.materialId,
        description: typeof req.body.description !== 'undefined' ? req.body.description : line.description,
        unit: typeof req.body.unit !== 'undefined' ? req.body.unit : line.unit,
        unitCost: typeof req.body.unitCost !== 'undefined' ? req.body.unitCost : line.unitCost
      });
      const quantity = typeof req.body.quantity !== 'undefined' ? (toNullableNumber(req.body.quantity) ?? 1) : toNullableNumber(line.quantity) ?? 1;
      const lineTotalOverride = typeof req.body.lineTotalOverride !== 'undefined'
        ? toNullableNumber(req.body.lineTotalOverride)
        : toNullableNumber(line.lineTotalOverride);
      const payload = {
        lineType: resolved.lineType,
        serviceId: resolved.serviceId,
        materialId: resolved.materialId,
        description: resolved.description,
        unit: resolved.unit,
        quantity,
        unitCost: resolved.unitCost,
        lineTotalOverride,
        lineTotal: calculateEstimateLineTotal({ quantity, unitCost: resolved.unitCost, lineTotalOverride })
      };
      if (typeof req.body.notes !== 'undefined') payload.notes = String(req.body.notes || '').trim() || null;
      if (typeof req.body.sortOrder !== 'undefined') payload.sortOrder = Number.parseInt(req.body.sortOrder, 10) || 0;

      await line.update(payload);
      await recalculateEstimateTotals(req.params.id);
      const detail = await loadEstimateDetail(req.params.id);
      return res.json({ line: toEstimateLineDto(line), estimate: detail });
    })
  );

  router.delete(
    '/estimates/:id/lines/:lineId',
    [...managerGuard, param('id').isUUID(), param('lineId').isUUID()],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const line = await EstimateLine.findOne({
        where: {
          id: req.params.lineId,
          estimateId: req.params.id
        }
      });
      if (!line) {
        return res.status(404).json({ error: 'Estimate line not found' });
      }

      await line.destroy();
      const estimate = await recalculateEstimateTotals(req.params.id);
      const detail = estimate ? await loadEstimateDetail(req.params.id) : null;
      return res.json({ message: 'Estimate line deleted', estimate: detail });
    })
  );

  return router;
};
