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
const createStaffSearchSeedRoutes = require('./manager/staff-search-seed');
const createCatalogRoutes = require('./manager/catalog-routes');
const createEstimateRoutes = require('./manager/estimate-routes');


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

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

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
      { model: Quote, as: 'quote', attributes: ['id', 'projectType', 'location', 'status'], required: false },
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
}));

router.post(
  '/quotes/:id/accept',
  [...managerGuard, param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const quote = await Quote.findByPk(req.params.id, {
      include: [{ model: User, as: 'client', attributes: ['id', 'name', 'email'] }]
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (quote.assignedManagerId) {
      return res.status(409).json({ error: 'Quote is already assigned to a manager' });
    }

    await quote.update({
      assignedManagerId: req.user.id,
      status: 'in_progress'
    });

    // Create a group chat for this project
    const projectName = `${quote.projectType} - ${quote.guestName || (quote.client && quote.client.name) || 'Project'} (${quote.postcode || quote.location})`;

    const groupThread = await GroupThread.create({
      name: projectName,
      quoteId: quote.id,
      createdBy: req.user.id
    });

    // Add the manager to the group
    await GroupMember.create({
      groupThreadId: groupThread.id,
      userId: req.user.id,
      role: 'admin'
    });

    // Add the client to the group (if they have an account)
    if (quote.clientId) {
      await GroupMember.create({
        groupThreadId: groupThread.id,
        userId: quote.clientId,
        role: 'member'
      });
    }

    // Notify managers that this quote was accepted
    const otherManagers = await User.findAll({
      where: { role: { [Op.in]: ['manager', 'admin'] }, isActive: true, id: { [Op.ne]: req.user.id } }
    });

    if (otherManagers.length) {
      await Notification.bulkCreate(
        otherManagers.map((m) => ({
          userId: m.id,
          type: 'quote_accepted',
          title: `Quote accepted by ${req.user.name}`,
          body: `Manager ${req.user.name} accepted the quote for "${projectName}".`,
          quoteId: quote.id,
          data: { quoteId: quote.id, managerId: req.user.id, groupThreadId: groupThread.id }
        }))
      );
    }

    return res.status(201).json({ quote, groupThread });
  })
);

router.get(
  '/quotes',
  [
      ...managerGuard,
      query('status').optional().isIn(['pending', 'in_progress', 'responded', 'closed']),
      query('priority').optional().isIn(['low', 'medium', 'high']),
      query('projectType').optional().isIn(['bathroom', 'kitchen', 'interior', 'tiling', 'extension', 'joinery', 'rendering', 'decorating', 'other']),
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
    if (req.query.status) where.status = req.query.status;
    if (req.query.priority) where.priority = req.query.priority;
    if (req.query.projectType) where.projectType = req.query.projectType;
    if (req.query.q) {
      const needle = `%${escapeLike(String(req.query.q || '').trim().toLowerCase())}%`;
      where[Op.or] = [
        sqlWhere(fn('LOWER', col('guestName')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('guestEmail')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('location')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('postcode')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('client.email')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('client.name')), { [Op.like]: needle })
      ];
    }

    const { page, pageSize, offset } = getPagination(req);
    const { rows, count } = await Quote.findAndCountAll({
      where,
      include: [
        { model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone'] },
        { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
      distinct: true,
      limit: pageSize,
      offset
    });

    return res.json({
      quotes: rows,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.max(1, Math.ceil(count / pageSize))
      }
    });
  })
);

router.get(
  '/quotes/:id',
  [...managerGuard, param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const quote = await Quote.findByPk(req.params.id, {
      include: [
        { model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone'] },
        { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    return res.json({ quote });
  })
);

router.patch(
  '/quotes/:id',
  [
    ...managerGuard,
    param('id').isUUID(),
    body('status').optional().isIn(['pending', 'in_progress', 'responded', 'closed']),
    body('priority').optional().isIn(['low', 'medium', 'high'])
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const quote = await Quote.findByPk(req.params.id);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const payload = {};
    if (req.body.status) payload.status = req.body.status;
    if (req.body.priority) payload.priority = req.body.priority;

    if (!Object.keys(payload).length) {
      return res.status(400).json({ error: 'No changes provided' });
    }

    await quote.update(payload);
    return res.json({ quote });
  })
);

router.get(
  '/projects',
  [
    ...staffGuard,
    query('status').optional().isIn(PROJECT_STATUSES),
    query('showInGallery').optional().isIn(['true', 'false', '1', '0']),
    query('includeMedia').optional().isIn(['true', 'false', '1', '0']),
    query('q').optional().trim().isLength({ min: 1, max: 255 }),
    query('clientEmail').optional().trim().isLength({ min: 3, max: 255 }),
    query('assignedManagerEmail').optional().trim().isLength({ min: 3, max: 255 }),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (typeof req.query.showInGallery !== 'undefined') {
      where.showInGallery = parseBoolean(req.query.showInGallery);
    }
    if (req.query.clientEmail) {
      where['$client.email$'] = normalizeEmail(req.query.clientEmail);
    }
    if (req.query.assignedManagerEmail) {
      where['$assignedManager.email$'] = normalizeEmail(req.query.assignedManagerEmail);
    }
    if (req.query.q) {
      const needle = `%${escapeLike(String(req.query.q || '').trim().toLowerCase())}%`;
      where[Op.or] = [
        sqlWhere(fn('LOWER', col('title')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('location')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('description')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('client.email')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('client.name')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('assignedManager.email')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('quote.location')), { [Op.like]: needle })
      ];
    }

    const includeMedia = parseBoolean(req.query.includeMedia, false);
    const { page, pageSize, offset } = getPagination(req);
    const { rows, count } = await Project.findAndCountAll({
      where,
      include: [
        ...(includeMedia ? [{ model: ProjectMedia, as: 'media' }] : []),
        { model: User, as: 'client', attributes: ['id', 'name', 'email'], required: false },
        { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'], required: false },
        { model: Quote, as: 'quote', attributes: ['id', 'status', 'projectType', 'location'], required: false }
      ],
      order: [['galleryOrder', 'ASC'], ['createdAt', 'DESC']],
      distinct: true,
      limit: pageSize,
      offset
    });

    const mediaCountByProjectId = includeMedia
      ? null
      : await buildProjectMediaCountMap(rows.map((project) => project.id));

    return res.json({
      projects: rows.map((project) => toProjectDto(project, { includeMedia, mediaCountByProjectId })),
      pagination: paginationDto(page, pageSize, count)
    });
  })
);

router.get(
  '/projects/:id',
  [...staffGuard, param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findByPk(req.params.id, {
      include: [
        { model: ProjectMedia, as: 'media' },
        { model: User, as: 'client', attributes: ['id', 'name', 'email'], required: false },
        { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'], required: false },
        { model: Quote, as: 'quote', attributes: ['id', 'status', 'projectType', 'location'], required: false }
      ]
    });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.json({ project: toProjectDto(project) });
  })
);

router.post(
  '/projects',
  [
    ...staffGuard,
    body('title').trim().notEmpty(),
    body('location').optional().trim(),
    body('description').optional().trim(),
    body('status').optional().isIn(PROJECT_STATUSES),
    body('quoteId').optional({ nullable: true }).isUUID(),
    body('clientId').optional({ nullable: true }).isUUID(),
    body('clientEmail').optional({ checkFalsy: true }).isEmail(),
    body('assignedManagerId').optional({ nullable: true }).isUUID(),
    body('assignedManagerEmail').optional({ checkFalsy: true }).isEmail(),
    body('budgetEstimate').optional().trim(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('showInGallery').optional().isBoolean(),
    body('galleryOrder').optional().isInt(),
    body('isActive').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const payload = {
      title: String(req.body.title || '').trim(),
      quoteId: req.body.quoteId || null,
      clientId: req.body.clientId || null,
      assignedManagerId: req.body.assignedManagerId || null,
      location: req.body.location ? String(req.body.location).trim() : null,
      description: req.body.description ? String(req.body.description).trim() : null,
      status: req.body.status || 'planning',
      budgetEstimate: req.body.budgetEstimate ? String(req.body.budgetEstimate).trim() : null,
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
      showInGallery: parseBoolean(req.body.showInGallery, false),
      galleryOrder: Number.parseInt(req.body.galleryOrder, 10) || 0,
      isActive: parseBoolean(req.body.isActive, true)
    };

    try {
      const resolvedClientId = await resolveClientByIdentity({
        clientId: payload.clientId,
        clientEmail: req.body.clientEmail
      });
      if (typeof resolvedClientId !== 'undefined') payload.clientId = resolvedClientId;

      const resolvedManagerId = await resolveManagerByIdentity({
        assignedManagerId: payload.assignedManagerId,
        assignedManagerEmail: req.body.assignedManagerEmail
      });
      if (typeof resolvedManagerId !== 'undefined') payload.assignedManagerId = resolvedManagerId;
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Invalid assignee/client identity' });
    }

    if (payload.quoteId) {
      const quote = await Quote.findByPk(payload.quoteId);
      if (!quote) return res.status(400).json({ error: 'Invalid quoteId' });
      if (!payload.clientId && quote.clientId) payload.clientId = quote.clientId;
      if (!payload.assignedManagerId && quote.assignedManagerId) payload.assignedManagerId = quote.assignedManagerId;
      if (!payload.location && quote.location) payload.location = quote.location;
    }

    const project = await Project.create(payload);
    clearGalleryCache();
    return res.status(201).json({ project });
  })
);

router.patch(
  '/projects/:id',
  [
    ...staffGuard,
    param('id').isUUID(),
    body('title').optional().trim().notEmpty(),
    body('location').optional().trim(),
    body('description').optional().trim(),
    body('status').optional().isIn(PROJECT_STATUSES),
    body('quoteId').optional({ nullable: true }).isUUID(),
    body('clientId').optional({ nullable: true }).isUUID(),
    body('clientEmail').optional({ checkFalsy: true }).isEmail(),
    body('assignedManagerId').optional({ nullable: true }).isUUID(),
    body('assignedManagerEmail').optional({ checkFalsy: true }).isEmail(),
    body('budgetEstimate').optional().trim(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('showInGallery').optional().isBoolean(),
    body('galleryOrder').optional().isInt(),
    body('isActive').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const payload = {};
    if (typeof req.body.title !== 'undefined') payload.title = String(req.body.title || '').trim();
    if (typeof req.body.quoteId !== 'undefined') payload.quoteId = req.body.quoteId || null;
    if (typeof req.body.clientId !== 'undefined') payload.clientId = req.body.clientId || null;
    if (typeof req.body.assignedManagerId !== 'undefined') payload.assignedManagerId = req.body.assignedManagerId || null;
    if (typeof req.body.location !== 'undefined') payload.location = String(req.body.location || '').trim() || null;
    if (typeof req.body.description !== 'undefined') payload.description = String(req.body.description || '').trim() || null;
    if (typeof req.body.status !== 'undefined') payload.status = req.body.status;
    if (typeof req.body.budgetEstimate !== 'undefined') payload.budgetEstimate = String(req.body.budgetEstimate || '').trim() || null;
    if (typeof req.body.startDate !== 'undefined') payload.startDate = req.body.startDate || null;
    if (typeof req.body.endDate !== 'undefined') payload.endDate = req.body.endDate || null;
    if (typeof req.body.showInGallery !== 'undefined') payload.showInGallery = parseBoolean(req.body.showInGallery);
    if (typeof req.body.galleryOrder !== 'undefined') payload.galleryOrder = Number.parseInt(req.body.galleryOrder, 10) || 0;
    if (typeof req.body.isActive !== 'undefined') payload.isActive = parseBoolean(req.body.isActive);

    if (Object.prototype.hasOwnProperty.call(req.body, 'clientEmail')) {
      try {
        payload.clientId = await resolveClientByIdentity({
          clientId: payload.clientId,
          clientEmail: req.body.clientEmail
        });
      } catch (error) {
        return res.status(400).json({ error: error.message || 'Invalid client identity' });
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'assignedManagerEmail')) {
      try {
        payload.assignedManagerId = await resolveManagerByIdentity({
          assignedManagerId: payload.assignedManagerId,
          assignedManagerEmail: req.body.assignedManagerEmail
        });
      } catch (error) {
        return res.status(400).json({ error: error.message || 'Invalid staff identity' });
      }
    }

    if (!Object.keys(payload).length) {
      return res.status(400).json({ error: 'No changes provided' });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'quoteId') && payload.quoteId) {
      const quote = await Quote.findByPk(payload.quoteId);
      if (!quote) return res.status(400).json({ error: 'Invalid quoteId' });
      if (!Object.prototype.hasOwnProperty.call(payload, 'clientId') && quote.clientId) payload.clientId = quote.clientId;
      if (!Object.prototype.hasOwnProperty.call(payload, 'assignedManagerId') && quote.assignedManagerId) payload.assignedManagerId = quote.assignedManagerId;
      if (!Object.prototype.hasOwnProperty.call(payload, 'location') && quote.location) payload.location = quote.location;
    }

    await project.update(payload);
    clearGalleryCache();
    return res.json({ project });
  })
);

router.delete(
  '/projects/:id',
  [...staffGuard, param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findByPk(req.params.id, {
      include: [{ model: ProjectMedia, as: 'media' }]
    });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    for (const media of project.media || []) {
      await safeUnlink(media.storagePath);
    }

    await ProjectMedia.destroy({ where: { projectId: project.id } });
    await project.destroy();

    clearGalleryCache();
    return res.json({ message: 'Project deleted' });
  })
);

router.get(
  '/projects/:id/media',
  [...staffGuard, param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const media = await ProjectMedia.findAll({
      where: { projectId: project.id },
      order: [['mediaType', 'ASC'], ['isCover', 'DESC'], ['galleryOrder', 'ASC'], ['createdAt', 'DESC']]
    });

    return res.json({ media });
  })
);

router.post(
  '/projects/:id/media/upload',
  [...staffGuard, param('id').isUUID(), upload.array('files', 20)],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findByPk(req.params.id);
    if (!project) {
      for (const file of req.files || []) {
        await safeUnlink(normalizeStoragePath(file.path));
      }
      return res.status(404).json({ error: 'Project not found' });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const forcedType = ['image', 'document'].includes(req.body.mediaType) ? req.body.mediaType : null;
    const showInGallery = parseBoolean(req.body.showInGallery, false);
    const galleryOrderStart = Number.parseInt(req.body.galleryOrderStart, 10) || 0;
    const caption = req.body.caption ? String(req.body.caption).trim() : null;
    const markFirstAsCover = parseBoolean(req.body.isCover, false);

    if (markFirstAsCover) {
      await ProjectMedia.update({ isCover: false }, { where: { projectId: project.id, mediaType: 'image' } });
    }

    const records = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const mediaType = forcedType || (String(file.mimetype || '').startsWith('image/') ? 'image' : 'document');
      const shouldShowInGallery = mediaType === 'image' ? showInGallery : false;
      const isCover = mediaType === 'image' ? markFirstAsCover && index === 0 : false;

      records.push({
        projectId: project.id,
        mediaType,
        url: `/uploads/${file.filename}`,
        storagePath: normalizeStoragePath(file.path),
        filename: file.originalname,
        mimeType: file.mimetype || null,
        sizeBytes: Number.isFinite(file.size) ? file.size : null,
        caption,
        showInGallery: shouldShowInGallery,
        galleryOrder: galleryOrderStart + index,
        isCover
      });
    }

    const created = await ProjectMedia.bulkCreate(records, { returning: true });
    clearGalleryCache();
    return res.status(201).json({ media: created });
  })
);

router.patch(
  '/projects/:id/media/:mediaId',
  [
    ...staffGuard,
    param('id').isUUID(),
    param('mediaId').isUUID(),
    body('caption').optional().trim(),
    body('showInGallery').optional().isBoolean(),
    body('galleryOrder').optional().isInt(),
    body('isCover').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const media = await ProjectMedia.findOne({
      where: {
        id: req.params.mediaId,
        projectId: req.params.id
      }
    });
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const payload = {};
    if (typeof req.body.caption !== 'undefined') payload.caption = String(req.body.caption || '').trim() || null;
    if (typeof req.body.galleryOrder !== 'undefined') payload.galleryOrder = Number.parseInt(req.body.galleryOrder, 10) || 0;

    if (typeof req.body.showInGallery !== 'undefined') {
      const requested = parseBoolean(req.body.showInGallery, false);
      if (media.mediaType !== 'image' && requested) {
        return res.status(400).json({ error: 'Only image files can be shown in gallery' });
      }
      payload.showInGallery = media.mediaType === 'image' ? requested : false;
    }

    if (typeof req.body.isCover !== 'undefined') {
      const requestedCover = parseBoolean(req.body.isCover, false);
      if (media.mediaType !== 'image' && requestedCover) {
        return res.status(400).json({ error: 'Only image files can be cover media' });
      }
      payload.isCover = media.mediaType === 'image' ? requestedCover : false;
      if (requestedCover) {
        payload.showInGallery = true;
        await ProjectMedia.update(
          { isCover: false },
          { where: { projectId: media.projectId, mediaType: 'image', id: { [Op.ne]: media.id } } }
        );
      }
    }

    if (!Object.keys(payload).length) {
      return res.status(400).json({ error: 'No changes provided' });
    }

    await media.update(payload);
    clearGalleryCache();
    return res.json({ media });
  })
);

router.delete(
  '/projects/:id/media/:mediaId',
  [...staffGuard, param('id').isUUID(), param('mediaId').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const media = await ProjectMedia.findOne({
      where: {
        id: req.params.mediaId,
        projectId: req.params.id
      }
    });
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    await safeUnlink(media.storagePath);
    await media.destroy();
    clearGalleryCache();
    return res.json({ message: 'Media deleted' });
  })
);

module.exports = router;
