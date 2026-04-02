const crypto = require('crypto');
const fs = require('fs');
const path = require('node:path');
const express = require('express');
const {
  appendRevisionEntry,
  buildEstimateRevisionSnapshot,
  buildEstimateRevisionPayload,
  buildQuoteRevisionPayload
} = require('../../utils/revisionHistory');
const { generateEstimatePdfBuffer } = require('../../utils/estimatePdf');
const { buildSafeSlug } = require('../../utils/safeSlug');
const { createValidatedHandler, findByPkOrRespond } = require('./route-helpers');
const { logUserAction } = require('../../utils/logger');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const buildEstimatePdfFilename = (estimate) => {
  const sanitizedTitle = buildSafeSlug(estimate?.title, { allowUnderscore: true });
  return `${sanitizedTitle || 'estimate'}.pdf`;
};

const persistEstimateDocument = async ({
  estimate,
  actor,
  updates,
  Quote,
  Notification,
  buildEstimateRevisionPayload,
  buildQuoteRevisionPayload,
  safeUnlink,
  loadEstimateDetail,
  quoteChangeType,
  clientNotification
}) => {
  const previousStoragePath = estimate.documentStoragePath || null;
  const revisionPayload = buildEstimateRevisionPayload({
    estimate,
    actor,
    changeType: quoteChangeType,
    changedFields: ['documentUrl', 'documentFilename', 'documentMimeType', 'documentSizeBytes'],
    updates
  });
  await estimate.update(revisionPayload);
  if (previousStoragePath && previousStoragePath !== updates.documentStoragePath) {
    await safeUnlink(previousStoragePath);
  }

  if (estimate.quoteId) {
    const quote = await Quote.findByPk(estimate.quoteId);
    if (quote) {
      const quotePayload = buildQuoteRevisionPayload({
        quote,
        actor,
        changeType: quoteChangeType,
        changedFields: ['estimateDocumentUrl'],
        updates: { estimateDocumentUrl: updates.documentUrl }
      });
      await quote.update(quotePayload);

      if (quote.clientId && clientNotification) {
        await Notification.create({
          userId: quote.clientId,
          type: clientNotification.type,
          title: clientNotification.title,
          body: clientNotification.body,
          quoteId: quote.id,
          data: {
            quoteId: quote.id,
            estimateId: estimate.id,
            documentUrl: updates.documentUrl || null
          }
        });
      }
    }
  }

  return loadEstimateDetail(estimate.id);
};

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
  recalculateEstimateTotals,
  upload,
  normalizeStoragePath,
  safeUnlink,
  Notification,
  deriveLegacyQuoteStatus
}) {
  const router = express.Router();
  const withValidation = createValidatedHandler({ validationResult, asyncHandler });
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
    withValidation(async (req, res) => {

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
          {
            model: Quote,
            as: 'quote',
            attributes: ['id', 'projectType', 'location', 'status', 'workflowStatus', 'clientDecisionStatus'],
            required: false
          },
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
    withValidation(async (req, res) => {

      const estimate = await loadEstimateDetail(req.params.id);
      if (!estimate) {
        return res.status(404).json({ error: 'Estimate not found' });
      }

      return res.json({ estimate });
    })
  );

  router.get(
    '/estimates/:id/revisions',
    [...staffGuard, param('id').isUUID()],
    withValidation(async (req, res) => {

      const estimate = await Estimate.findByPk(req.params.id);
      if (!estimate) {
        return res.status(404).json({ error: 'Estimate not found' });
      }

      return res.json({
        revisionNumber: Number(estimate.revisionNumber || 1),
        revisions: Array.isArray(estimate.revisionHistory) ? estimate.revisionHistory : []
      });
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
    withValidation(async (req, res) => {

      const basePayload = {
        projectId: req.body.projectId || null,
        quoteId: req.body.quoteId || null,
        createdById: req.user.id,
        title: String(req.body.title || '').trim(),
        status: req.body.status || 'draft',
        notes: req.body.notes ? String(req.body.notes).trim() : null,
        subtotal: 0,
        total: 0,
        isActive: true,
        clientVisible: ['sent', 'approved', 'archived'].includes(String(req.body.status || 'draft').toLowerCase()),
        revisionNumber: 1
      };
      basePayload.revisionHistory = appendRevisionEntry([], {
        entity: 'estimate',
        changeType: 'created',
        changedById: req.user.id,
        changedByRole: req.user.role,
        changedFields: ['title', 'status', 'projectId', 'quoteId', 'notes'],
        snapshot: buildEstimateRevisionSnapshot(basePayload)
      });

      const estimate = await Estimate.create(basePayload);
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
    withValidation(async (req, res) => {

      const estimate = await Estimate.findByPk(req.params.id);
      if (!estimate) {
        return res.status(404).json({ error: 'Estimate not found' });
      }

      const updates = {};
      if (typeof req.body.projectId !== 'undefined') updates.projectId = req.body.projectId || null;
      if (typeof req.body.quoteId !== 'undefined') updates.quoteId = req.body.quoteId || null;
      if (typeof req.body.title !== 'undefined') updates.title = String(req.body.title || '').trim();
      if (typeof req.body.status !== 'undefined') {
        updates.status = req.body.status;
        updates.clientVisible = ['sent', 'approved', 'archived'].includes(String(req.body.status || '').toLowerCase());
      }
      if (typeof req.body.notes !== 'undefined') updates.notes = String(req.body.notes || '').trim() || null;

      if (!Object.keys(updates).length) {
        return res.status(400).json({ error: 'No changes provided' });
      }

      const revisionPayload = buildEstimateRevisionPayload({
        estimate,
        actor: req.user,
        changeType: 'updated',
        changedFields: Object.keys(updates),
        updates
      });

      await estimate.update(revisionPayload);
      const detail = await loadEstimateDetail(estimate.id);
      return res.json({ estimate: detail });
    })
  );

  router.post(
    '/estimates/:id/document',
    [...managerGuard, param('id').isUUID(), upload.single('file')],
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        if (req.file?.path) {
          await safeUnlink(normalizeStoragePath(req.file.path));
        }
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const estimate = await Estimate.findByPk(req.params.id);
      if (!estimate) {
        await safeUnlink(normalizeStoragePath(req.file.path));
        return res.status(404).json({ error: 'Estimate not found' });
      }

      const updates = {
        documentUrl: `/uploads/${req.file.filename}`,
        documentStoragePath: normalizeStoragePath(req.file.path),
        documentFilename: req.file.originalname,
        documentMimeType: req.file.mimetype || null,
        documentSizeBytes: Number.isFinite(req.file.size) ? req.file.size : null
      };
      const detail = await persistEstimateDocument({
        estimate,
        actor: req.user,
        updates,
        Quote,
        Notification,
        buildEstimateRevisionPayload,
        buildQuoteRevisionPayload,
        safeUnlink,
        loadEstimateDetail,
        quoteChangeType: 'document_uploaded',
        clientNotification: {
          type: 'quote_estimate_pack_file_uploaded',
          title: 'Estimate file updated',
          body: `A manager uploaded a new file for "${estimate.title}".`
        }
      });
      return res.status(201).json({ estimate: detail });
    })
  );

  router.post(
    '/estimates/:id/generate-pdf',
    [...managerGuard, param('id').isUUID()],
    withValidation(async (req, res) => {

      const estimateDetail = await loadEstimateDetail(req.params.id);
      if (!estimateDetail) {
        return res.status(404).json({ error: 'Estimate not found' });
      }

      const estimate = await Estimate.findByPk(req.params.id);
      if (!estimate) {
        return res.status(404).json({ error: 'Estimate not found' });
      }

      const filename = `${crypto.randomUUID()}.pdf`;
      const absolutePath = path.join(UPLOADS_DIR, filename);
      const pdfBuffer = generateEstimatePdfBuffer(estimateDetail);
      await fs.promises.writeFile(absolutePath, pdfBuffer);

      const detail = await persistEstimateDocument({
        estimate,
        actor: req.user,
        updates: {
          documentUrl: `/uploads/${filename}`,
          documentStoragePath: normalizeStoragePath(absolutePath),
          documentFilename: buildEstimatePdfFilename(estimate),
          documentMimeType: 'application/pdf',
          documentSizeBytes: pdfBuffer.length
        },
        Quote,
        Notification,
        buildEstimateRevisionPayload,
        buildQuoteRevisionPayload,
        safeUnlink,
        loadEstimateDetail,
        quoteChangeType: 'pdf_generated',
        clientNotification: {
          type: 'quote_estimate_pdf_generated',
          title: 'Estimate PDF ready',
          body: `A manager generated a PDF pack for "${estimate.title}".`
        }
      });

      return res.status(201).json({ estimate: detail });
    })
  );

  router.post(
    '/estimates/:id/send-to-client-review',
    [...managerGuard, param('id').isUUID()],
    withValidation(async (req, res) => {

      const estimate = await Estimate.findByPk(req.params.id);
      if (!estimate) {
        return res.status(404).json({ error: 'Estimate not found' });
      }

      if (!estimate.quoteId) {
        return res.status(409).json({ error: 'Estimate must be linked to a quote before sending it to client review' });
      }

      const quote = await Quote.findByPk(estimate.quoteId);
      if (!quote) {
        return res.status(404).json({ error: 'Linked quote not found' });
      }

      if (!quote.clientId) {
        return res.status(409).json({ error: 'Quote must be linked to a client account before client review can start' });
      }

      const sentToClientAt = new Date();
      let latestEstimate = estimate;
      if (!estimate.documentUrl) {
        const estimateDetail = await loadEstimateDetail(estimate.id);
        const filename = `${crypto.randomUUID()}.pdf`;
        const absolutePath = path.join(UPLOADS_DIR, filename);
        const pdfBuffer = generateEstimatePdfBuffer(estimateDetail || estimate);
        await fs.promises.writeFile(absolutePath, pdfBuffer);
        await persistEstimateDocument({
          estimate,
          actor: req.user,
          updates: {
            documentUrl: `/uploads/${filename}`,
            documentStoragePath: normalizeStoragePath(absolutePath),
            documentFilename: buildEstimatePdfFilename(estimate),
            documentMimeType: 'application/pdf',
            documentSizeBytes: pdfBuffer.length
          },
          Quote,
          Notification,
          buildEstimateRevisionPayload,
          buildQuoteRevisionPayload,
          safeUnlink,
          loadEstimateDetail,
          quoteChangeType: 'pdf_generated',
          clientNotification: null
        });
        latestEstimate = await Estimate.findByPk(estimate.id);
      }
      const estimateUpdates = {
        status: 'sent',
        clientVisible: true,
        sentToClientAt
      };
      const estimatePayload = buildEstimateRevisionPayload({
        estimate,
        actor: req.user,
        changeType: 'sent_to_client_review',
        changedFields: ['status', 'clientVisible', 'sentToClientAt'],
        updates: estimateUpdates
      });
      await estimate.update(estimatePayload);

      const quoteUpdates = {
        workflowStatus: 'client_review',
        clientReviewStartedAt: sentToClientAt,
        estimateDocumentUrl: latestEstimate.documentUrl || quote.estimateDocumentUrl || null
      };
      quoteUpdates.status = deriveLegacyQuoteStatus({
        workflowStatus: quoteUpdates.workflowStatus,
        assignedManagerId: quote.assignedManagerId,
        archivedAt: quote.archivedAt,
        clientDecisionStatus: quote.clientDecisionStatus
      });
      const quotePayload = buildQuoteRevisionPayload({
        quote,
        actor: req.user,
        changeType: 'client_review_started',
        changedFields: ['workflowStatus', 'clientReviewStartedAt', 'estimateDocumentUrl', 'status'],
        updates: quoteUpdates
      });
      await quote.update(quotePayload);

      await Notification.create({
        userId: quote.clientId,
        type: 'quote_client_review_ready',
        title: 'Your estimate pack is ready for review',
        body: `A manager sent "${estimate.title}" for your review. Open the review screen to accept, reject or request edits.`,
        quoteId: quote.id,
        data: {
          quoteId: quote.id,
          estimateId: estimate.id,
          workflowStatus: 'client_review',
          documentUrl: latestEstimate.documentUrl || null
        }
      });

      const detail = await loadEstimateDetail(estimate.id);
      logUserAction(req.user.id, 'manager_sent_estimate_to_client', { estimateId: estimate.id, quoteId: quote.id }, req).catch(() => {});
      return res.status(201).json({ estimate: detail, quote });
    })
  );

  router.delete(
    '/estimates/:id',
    [...managerGuard, param('id').isUUID()],
    withValidation(async (req, res) => {

      const estimate = await Estimate.findByPk(req.params.id);
      if (!estimate) {
        return res.status(404).json({ error: 'Estimate not found' });
      }

      if (estimate.documentStoragePath) {
        await safeUnlink(estimate.documentStoragePath);
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
    withValidation(async (req, res) => {

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

      const recalculatedEstimate = await recalculateEstimateTotals(estimate.id);
      if (recalculatedEstimate) {
        const revisionPayload = buildEstimateRevisionPayload({
          estimate: recalculatedEstimate,
          actor: req.user,
          changeType: 'line_added',
          changedFields: ['lines', 'subtotal', 'total'],
          updates: {}
        });
        await recalculatedEstimate.update(revisionPayload);
      }
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
    withValidation(async (req, res) => {

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
      const recalculatedEstimate = await recalculateEstimateTotals(req.params.id);
      if (recalculatedEstimate) {
        const revisionPayload = buildEstimateRevisionPayload({
          estimate: recalculatedEstimate,
          actor: req.user,
          changeType: 'line_updated',
          changedFields: ['lines', 'subtotal', 'total'],
          updates: {}
        });
        await recalculatedEstimate.update(revisionPayload);
      }
      const detail = await loadEstimateDetail(req.params.id);
      return res.json({ line: toEstimateLineDto(line), estimate: detail });
    })
  );

  router.delete(
    '/estimates/:id/lines/:lineId',
    [...managerGuard, param('id').isUUID(), param('lineId').isUUID()],
    withValidation(async (req, res) => {

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
      if (estimate) {
        const revisionPayload = buildEstimateRevisionPayload({
          estimate,
          actor: req.user,
          changeType: 'line_deleted',
          changedFields: ['lines', 'subtotal', 'total'],
          updates: {}
        });
        await estimate.update(revisionPayload);
      }
      const detail = estimate ? await loadEstimateDetail(req.params.id) : null;
      return res.json({ message: 'Estimate line deleted', estimate: detail });
    })
  );

  return router;
};
