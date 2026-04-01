const express = require('express');
const fs = require('fs');
const path = require('path');
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const { body, param, query, validationResult } = require('express-validator');
const {
  Quote,
  User,
  GroupThread,
  GroupMember,
  InboxThread,
  Notification,
  Project,
  ProjectMedia,
  ServiceOffering,
  Material,
  Estimate,
  EstimateLine,
  sequelize
} = require('../models');
const { auth, roleCheck } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { upload } = require('../utils/upload');
const { clearServicesCache, clearGalleryCache } = require('../utils/publicCache');
const { buildSafeSlug } = require('../utils/safeSlug');
const {
  QUOTE_WORKFLOW_STATUSES,
  QUOTE_VISIT_STATUSES,
  QUOTE_CLIENT_DECISION_STATUSES,
  deriveLegacyQuoteStatus
} = require('../utils/quoteWorkflow');
const createStaffSearchSeedRoutes = require('./manager/staff-search-seed');
const createCatalogRoutes = require('./manager/catalog-routes');
const createEstimateRoutes = require('./manager/estimate-routes');
const createQuoteRoutes = require('./manager/quote-routes');
const createProjectRoutes = require('./manager/project-routes');
const logRoutes = require('./manager/log-routes');


const router = express.Router();

const managerGuard = [auth, roleCheck('manager', 'admin')];
const staffGuard = [auth, roleCheck('employee', 'manager', 'admin')];
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const PROJECT_STATUSES = ['planning', 'in_progress', 'completed', 'on_hold'];
const SERVICE_CATEGORIES = ['bathroom', 'kitchen', 'interior', 'outdoor', 'other'];
const MATERIAL_CATEGORIES = ['tiles', 'plumbing', 'electrical', 'joinery', 'paint', 'hardware', 'other'];
const ESTIMATE_STATUSES = ['draft', 'sent', 'approved', 'archived'];
const ESTIMATE_LINE_TYPES = ['service', 'material', 'custom'];
const STATIC_GALLERY_PREFIX = 'Gallery/premium/';
const STARTER_SERVICE_SEED = [
  {
    slug: 'premium-bathroom-renovation',
    title: 'Premium Bathroom Renovation',
    category: 'bathroom',
    shortDescription: 'Luxury bathrooms with end-to-end design, plumbing, tiling and finishing.',
    fullDescription: 'Complete bathroom renovation service including demolition, waterproofing, premium tiling, sanitary installation and final detailing.',
    basePriceFrom: 8500,
    heroImageUrl: '/Gallery/premium/bathroom-main.jpg',
    isFeatured: true,
    showOnWebsite: true,
    displayOrder: 1
  },
  {
    slug: 'bespoke-kitchen-renovation',
    title: 'Bespoke Kitchen Renovation',
    category: 'kitchen',
    shortDescription: 'Tailored kitchens with cabinetry, electrics, plumbing and decorative finishes.',
    fullDescription: 'From layout planning to final handover: bespoke kitchen fitting, wiring, lighting, flooring and premium workmanship standards.',
    basePriceFrom: 14000,
    heroImageUrl: '/Gallery/premium/kitchen-panorama-main.jpg',
    isFeatured: true,
    showOnWebsite: true,
    displayOrder: 2
  },
  {
    slug: 'full-interior-refurbishment',
    title: 'Full Interior Refurbishment',
    category: 'interior',
    shortDescription: 'High-spec refurbishment for apartments and houses across Greater Manchester.',
    fullDescription: 'Structural updates, plastering, decorating, flooring and carpentry delivered under one coordinated project team.',
    basePriceFrom: 22000,
    heroImageUrl: '/Gallery/premium/brick-dark-main.jpg',
    isFeatured: false,
    showOnWebsite: true,
    displayOrder: 3
  }
];

const STARTER_MATERIAL_SEED = [
  { sku: 'TILE-MARBLE-60', name: 'Porcelain Marble Tile 60x60', category: 'tiles', unit: 'm2', stockQty: 120, minStockQty: 40, unitCost: 28.5, supplier: 'North Tiles UK', notes: 'Premium wall/floor finish' },
  { sku: 'PLUMB-MIXER-BLK', name: 'Matte Black Mixer Set', category: 'plumbing', unit: 'pcs', stockQty: 18, minStockQty: 8, unitCost: 132, supplier: 'HydroPro', notes: 'Bathroom mixer with warranty' },
  { sku: 'ELEC-SPOT-IP65', name: 'IP65 Bathroom Spotlights', category: 'electrical', unit: 'pcs', stockQty: 64, minStockQty: 20, unitCost: 14.75, supplier: 'Luma Electric', notes: 'Warm white, dimmable' },
  { sku: 'PAINT-WASH-MATT', name: 'Washable Matt Paint 10L', category: 'paint', unit: 'pcs', stockQty: 22, minStockQty: 10, unitCost: 46, supplier: 'DecorLine', notes: 'Interior high-traffic walls' },
  { sku: 'JOIN-OAK-SKIRT', name: 'Oak Skirting Board 2.4m', category: 'joinery', unit: 'pcs', stockQty: 52, minStockQty: 15, unitCost: 11.2, supplier: 'TimberCraft', notes: 'Pre-primed oak profile' },
  { sku: 'HARD-SCREW-BOX', name: 'Fixing Screws Assorted Box', category: 'hardware', unit: 'box', stockQty: 35, minStockQty: 12, unitCost: 8.4, supplier: 'FixFast', notes: 'General fitting pack' }
];

const STARTER_PROJECT_SEED = [
  {
    title: 'Didsbury Bathroom Transformation',
    location: 'Didsbury',
    status: 'completed',
    description: 'Full strip-out and premium bathroom rebuild with concealed storage.',
    budgetEstimate: 'GBP 12,000 - GBP 18,000',
    showInGallery: true,
    galleryOrder: 1,
    media: ['bathroom-main.jpg', 'bathroom-tiles.jpg', 'bathroom-bathtub.jpg']
  },
  {
    title: 'Wilmslow Kitchen Modernisation',
    location: 'Wilmslow',
    status: 'in_progress',
    description: 'Open-plan kitchen upgrade with custom joinery and smart lighting.',
    budgetEstimate: 'GBP 25,000 - GBP 40,000',
    showInGallery: true,
    galleryOrder: 2,
    media: ['kitchen-panorama-main.jpg', 'kitchen-panorama-left.jpg', 'kitchen-panorama-right.jpg']
  },
  {
    title: 'Stockport Exterior Brick Refresh',
    location: 'Stockport',
    status: 'planning',
    description: 'Exterior brickwork, detailing and facade enhancement package.',
    budgetEstimate: 'GBP 9,000 - GBP 15,000',
    showInGallery: true,
    galleryOrder: 3,
    media: ['exterior-front.jpg', 'exterior-chimney.jpg', 'brick-detail-charcoal.jpg']
  }
];

const getPagination = (req) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE));
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize
  };
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') return false;
  if (value === 1) return true;
  if (value === 0) return false;
  return fallback;
};

const toNullableNumber = (value) => {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const toMoneyValue = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : fallback;
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const escapeLike = (value) => String(value || '').replace(/[\\%_]/g, '\\$&');

const slugify = (value) => buildSafeSlug(value, { maxLength: 120 });

const normalizeStoragePath = (absolutePath) => {
  const relative = path.relative(path.join(__dirname, '..'), absolutePath);
  return relative.replace(/\\/g, '/');
};

const safeUnlink = async (storagePath) => {
  if (!storagePath) return;
  const normalizedPath = String(storagePath || '').replace(/\\/g, '/');
  if (!normalizedPath.startsWith('uploads/')) return;

  const resolved = path.join(__dirname, '..', storagePath);
  if (!resolved.startsWith(path.join(__dirname, '..'))) return;

  try {
    await fs.promises.unlink(resolved);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

const resolveClientByIdentity = async ({ clientId, clientEmail }) => {
  if (clientId) {
    const client = await User.findByPk(clientId);
    if (!client || client.role !== 'client') {
      throw new Error('Invalid clientId');
    }
    return client.id;
  }

  if (typeof clientEmail !== 'undefined') {
    const normalized = normalizeEmail(clientEmail);
    if (!normalized) return null;
    const client = await User.findOne({
      where: {
        email: normalized,
        role: 'client'
      }
    });
    if (!client) {
      throw new Error('Client with provided email not found');
    }
    return client.id;
  }

  return undefined;
};

const resolveManagerByIdentity = async ({ assignedManagerId, assignedManagerEmail }) => {
  if (assignedManagerId) {
    const manager = await User.findByPk(assignedManagerId);
    if (!manager || !['manager', 'admin', 'employee'].includes(String(manager.role || ''))) {
      throw new Error('Invalid assignedManagerId');
    }
    return manager.id;
  }

  if (typeof assignedManagerEmail !== 'undefined') {
    const normalized = normalizeEmail(assignedManagerEmail);
    if (!normalized) return null;
    const manager = await User.findOne({
      where: {
        email: normalized,
        role: { [Op.in]: ['employee', 'manager', 'admin'] }
      }
    });
    if (!manager) {
      throw new Error('Staff user with provided email not found');
    }
    return manager.id;
  }

  return undefined;
};

const paginationDto = (page, pageSize, total) => ({
  page,
  pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(total / pageSize))
});

const buildProjectMediaCountMap = async (projectIds) => {
  const uniqueProjectIds = Array.from(new Set((projectIds || []).filter(Boolean)));
  if (!uniqueProjectIds.length) return new Map();

  const rows = await ProjectMedia.findAll({
    attributes: ['projectId', 'mediaType', [fn('COUNT', col('id')), 'count']],
    where: { projectId: { [Op.in]: uniqueProjectIds } },
    group: ['projectId', 'mediaType'],
    raw: true
  });

  const mediaCountByProjectId = new Map();
  uniqueProjectIds.forEach((projectId) => {
    mediaCountByProjectId.set(projectId, { imageCount: 0, documentCount: 0 });
  });

  rows.forEach((row) => {
    const projectId = row.projectId;
    const counts = mediaCountByProjectId.get(projectId) || { imageCount: 0, documentCount: 0 };
    const count = Number.parseInt(row.count, 10) || 0;
    if (row.mediaType === 'image') counts.imageCount = count;
    if (row.mediaType === 'document') counts.documentCount = count;
    mediaCountByProjectId.set(projectId, counts);
  });

  return mediaCountByProjectId;
};

const toProjectDto = (project, options = {}) => {
  const includeMedia = options.includeMedia !== false;
  const mediaCountByProjectId = options.mediaCountByProjectId || null;
  const plain = project.toJSON();
  const media = Array.isArray(plain.media) ? plain.media : [];
  const sortedMedia = media
    .slice()
    .sort((a, b) => {
      if (a.mediaType !== b.mediaType) return a.mediaType.localeCompare(b.mediaType);
      if (a.isCover !== b.isCover) return Number(b.isCover) - Number(a.isCover);
      if (a.galleryOrder !== b.galleryOrder) return a.galleryOrder - b.galleryOrder;
      return String(a.filename || '').localeCompare(String(b.filename || ''));
    });

  const countedFromQuery = mediaCountByProjectId && plain.id ? mediaCountByProjectId.get(plain.id) : null;
  const imageCount = includeMedia
    ? sortedMedia.filter((item) => item.mediaType === 'image').length
    : Number.parseInt(countedFromQuery?.imageCount, 10) || 0;
  const documentCount = includeMedia
    ? sortedMedia.filter((item) => item.mediaType === 'document').length
    : Number.parseInt(countedFromQuery?.documentCount, 10) || 0;

  const dto = {
    ...plain,
    imageCount,
    documentCount
  };

  if (includeMedia) {
    dto.media = sortedMedia;
  } else {
    delete dto.media;
  }

  return dto;
};

const toEstimateLineDto = (line) => {
  const plain = typeof line.toJSON === 'function' ? line.toJSON() : line;
  return {
    ...plain,
    quantity: toMoneyValue(plain.quantity, 0),
    unitCost: plain.unitCost == null ? null : toMoneyValue(plain.unitCost, 0),
    lineTotalOverride: plain.lineTotalOverride == null ? null : toMoneyValue(plain.lineTotalOverride, 0),
    lineTotal: toMoneyValue(plain.lineTotal, 0)
  };
};

const toEstimateDto = (estimate) => {
  const plain = typeof estimate.toJSON === 'function' ? estimate.toJSON() : estimate;
  return {
    ...plain,
    subtotal: toMoneyValue(plain.subtotal, 0),
    total: toMoneyValue(plain.total, 0),
    lines: Array.isArray(plain.lines) ? plain.lines.map(toEstimateLineDto) : undefined
  };
};

const calculateEstimateLineTotal = ({ quantity, unitCost, lineTotalOverride }) => {
  const override = toNullableNumber(lineTotalOverride);
  if (override != null) return toMoneyValue(override, 0);
  return toMoneyValue((toNullableNumber(quantity) ?? 0) * (toNullableNumber(unitCost) ?? 0), 0);
};

const recalculateEstimateTotals = async (estimateId, transaction) => {
  const lines = await EstimateLine.findAll({
    where: { estimateId },
    transaction
  });
  const subtotal = lines.reduce((sum, line) => sum + toMoneyValue(line.lineTotal, 0), 0);
  const estimate = await Estimate.findByPk(estimateId, { transaction });
  if (!estimate) return null;
  await estimate.update(
    {
      subtotal: toMoneyValue(subtotal, 0),
      total: toMoneyValue(subtotal, 0)
    },
    { transaction }
  );
  return estimate;
};

const loadEstimateDetail = async (estimateId) => {
  const estimate = await Estimate.findByPk(estimateId, {
    include: [
      { model: Project, as: 'project', attributes: ['id', 'title', 'location'], required: false },
      {
        model: Quote,
        as: 'quote',
        attributes: ['id', 'projectType', 'location', 'status', 'workflowStatus', 'clientDecisionStatus', 'clientReviewStartedAt'],
        required: false
      },
      { model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false },
      {
        model: EstimateLine,
        as: 'lines',
        required: false,
        include: [
          { model: ServiceOffering, as: 'service', attributes: ['id', 'title', 'basePriceFrom'], required: false },
          { model: Material, as: 'material', attributes: ['id', 'name', 'unit', 'unitCost'], required: false }
        ]
      }
    ],
    order: [[{ model: EstimateLine, as: 'lines' }, 'sortOrder', 'ASC'], [{ model: EstimateLine, as: 'lines' }, 'createdAt', 'ASC']]
  });

  return estimate ? toEstimateDto(estimate) : null;
};

const resolveEstimateLineInput = async ({ lineType, serviceId, materialId, description, unit, unitCost }) => {
  const nextLineType = ESTIMATE_LINE_TYPES.includes(lineType) ? lineType : (serviceId ? 'service' : materialId ? 'material' : 'custom');
  let resolvedDescription = String(description || '').trim();
  let resolvedUnit = String(unit || '').trim() || null;
  let resolvedUnitCost = toNullableNumber(unitCost);

  let service = null;
  let material = null;

  if (serviceId) {
    service = await ServiceOffering.findByPk(serviceId);
    if (!service) throw new Error('Service not found');
    resolvedDescription = resolvedDescription || service.title;
    if (resolvedUnitCost == null) resolvedUnitCost = toNullableNumber(service.basePriceFrom);
  }

  if (materialId) {
    material = await Material.findByPk(materialId);
    if (!material) throw new Error('Material not found');
    resolvedDescription = resolvedDescription || material.name;
    resolvedUnit = resolvedUnit || material.unit || null;
    if (resolvedUnitCost == null) resolvedUnitCost = toNullableNumber(material.unitCost);
  }

  if (!resolvedDescription) {
    throw new Error('Line description is required');
  }

  return {
    lineType: nextLineType,
    serviceId: service?.id || null,
    materialId: material?.id || null,
    description: resolvedDescription,
    unit: resolvedUnit,
    unitCost: resolvedUnitCost
  };
};

router.use(createStaffSearchSeedRoutes({
  body,
  query,
  validationResult,
  asyncHandler,
  managerGuard,
  staffGuard,
  User,
  ServiceOffering,
  Material,
  Project,
  ProjectMedia,
  sequelize,
  fn,
  col,
  Op,
  sqlWhere,
  MAX_PAGE_SIZE,
  normalizeEmail,
  escapeLike,
  paginationDto,
  getPagination,
  parseBoolean,
  STARTER_SERVICE_SEED,
  STARTER_MATERIAL_SEED,
  STARTER_PROJECT_SEED,
  STATIC_GALLERY_PREFIX,
  clearServicesCache,
  clearGalleryCache,
  fs,
  path,
  projectRoot: path.join(__dirname, '..')
}));

router.use(createCatalogRoutes({
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
}));

router.use(createEstimateRoutes({
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
  Quote,
  Notification,
  deriveLegacyQuoteStatus
}));

router.use(createQuoteRoutes({
  param,
  query,
  body,
  validationResult,
  asyncHandler,
  managerGuard,
  Quote,
  User,
  GroupThread,
  GroupMember,
  InboxThread,
  Notification,
  Project,
  Estimate,
  Op,
  fn,
  col,
  sqlWhere,
  MAX_PAGE_SIZE,
  getPagination,
  paginationDto,
  escapeLike,
  loadEstimateDetail,
  QUOTE_WORKFLOW_STATUSES,
  QUOTE_VISIT_STATUSES,
  QUOTE_CLIENT_DECISION_STATUSES,
  deriveLegacyQuoteStatus
}));

router.use(createProjectRoutes({
  body,
  param,
  query,
  validationResult,
  asyncHandler,
  staffGuard,
  Quote,
  User,
  Project,
  ProjectMedia,
  Op,
  fn,
  col,
  sqlWhere,
  MAX_PAGE_SIZE,
  PROJECT_STATUSES,
  getPagination,
  paginationDto,
  escapeLike,
  parseBoolean,
  normalizeEmail,
  resolveClientByIdentity,
  resolveManagerByIdentity,
  toProjectDto,
  buildProjectMediaCountMap,
  normalizeStoragePath,
  safeUnlink,
  upload,
  clearGalleryCache
}));

router.use(logRoutes);

module.exports = router;
