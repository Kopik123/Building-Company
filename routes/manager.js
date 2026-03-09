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
  sequelize
} = require('../models');
const { auth, roleCheck } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { upload } = require('../utils/upload');
const { clearServicesCache, clearGalleryCache } = require('../utils/publicCache');

const router = express.Router();

const managerGuard = [auth, roleCheck('manager', 'admin')];
const staffGuard = [auth, roleCheck('employee', 'manager', 'admin')];
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const PROJECT_STATUSES = ['planning', 'in_progress', 'completed', 'on_hold'];
const SERVICE_CATEGORIES = ['bathroom', 'kitchen', 'interior', 'outdoor', 'other'];
const MATERIAL_CATEGORIES = ['tiles', 'plumbing', 'electrical', 'joinery', 'paint', 'hardware', 'other'];
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

router.post(
  '/staff',
  [
    ...managerGuard,
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().notEmpty(),
    body('role').isIn(['employee', 'manager']),
    body('phone').optional().trim()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = normalizeEmail(req.body.email);
    const { password, name, phone, role } = req.body;

    // Only admins can create managers
    if (role === 'manager' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create manager accounts' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = await User.create({ email, password, name, phone: phone || null, role });
    return res.status(201).json({ user });
  })
);

router.get(
  '/clients/search',
  [
    ...staffGuard,
    query('email').optional().trim().isLength({ min: 1, max: 255 }),
    query('q').optional().trim().isLength({ min: 1, max: 255 }),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { page, pageSize, offset } = getPagination(req);
    const needleRaw = String(req.query.email || req.query.q || '').trim().toLowerCase();
    const where = { role: 'client', isActive: true };

    if (needleRaw) {
      const pattern = `%${escapeLike(needleRaw)}%`;
      where[Op.or] = [
        sqlWhere(fn('LOWER', col('email')), { [Op.like]: pattern }),
        sqlWhere(fn('LOWER', col('name')), { [Op.like]: pattern })
      ];
    }

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: ['id', 'name', 'email', 'phone'],
      order: [['email', 'ASC']],
      limit: pageSize,
      offset
    });

    return res.json({ clients: rows, pagination: paginationDto(page, pageSize, count) });
  })
);

router.get(
  '/staff/search',
  [
    ...staffGuard,
    query('email').optional().trim().isLength({ min: 1, max: 255 }),
    query('q').optional().trim().isLength({ min: 1, max: 255 }),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { page, pageSize, offset } = getPagination(req);
    const needleRaw = String(req.query.email || req.query.q || '').trim().toLowerCase();
    const where = {
      role: { [Op.in]: ['employee', 'manager', 'admin'] },
      isActive: true
    };

    if (needleRaw) {
      const pattern = `%${escapeLike(needleRaw)}%`;
      where[Op.or] = [
        sqlWhere(fn('LOWER', col('email')), { [Op.like]: pattern }),
        sqlWhere(fn('LOWER', col('name')), { [Op.like]: pattern })
      ];
    }

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: ['id', 'name', 'email', 'role'],
      order: [['email', 'ASC']],
      limit: pageSize,
      offset
    });

    return res.json({ staff: rows, pagination: paginationDto(page, pageSize, count) });
  })
);

router.post(
  '/seed/starter',
  [
    ...managerGuard,
    body('force').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const force = parseBoolean(req.body.force, false);
    const stats = {
      servicesCreated: 0,
      servicesUpdated: 0,
      materialsCreated: 0,
      materialsUpdated: 0,
      projectsCreated: 0,
      mediaCreated: 0
    };

    const tx = await sequelize.transaction();
    try {
      for (const item of STARTER_SERVICE_SEED) {
        const [service, created] = await ServiceOffering.findOrCreate({
          where: { slug: item.slug },
          defaults: { ...item, isActive: true },
          transaction: tx
        });
        if (created) {
          stats.servicesCreated += 1;
        } else if (force) {
          await service.update({ ...item, isActive: true }, { transaction: tx });
          stats.servicesUpdated += 1;
        }
      }

      for (const item of STARTER_MATERIAL_SEED) {
        const [material, created] = await Material.findOrCreate({
          where: { sku: item.sku },
          defaults: { ...item, isActive: true },
          transaction: tx
        });
        if (created) {
          stats.materialsCreated += 1;
        } else if (force) {
          await material.update({ ...item, isActive: true }, { transaction: tx });
          stats.materialsUpdated += 1;
        }
      }

      for (const projectSeed of STARTER_PROJECT_SEED) {
        const [project, created] = await Project.findOrCreate({
          where: { title: projectSeed.title, location: projectSeed.location || null },
          defaults: {
            title: projectSeed.title,
            location: projectSeed.location || null,
            status: projectSeed.status,
            description: projectSeed.description,
            budgetEstimate: projectSeed.budgetEstimate,
            showInGallery: projectSeed.showInGallery,
            galleryOrder: projectSeed.galleryOrder,
            isActive: true
          },
          transaction: tx
        });

        if (created) {
          stats.projectsCreated += 1;
        } else if (force) {
          await project.update(
            {
              status: projectSeed.status,
              description: projectSeed.description,
              budgetEstimate: projectSeed.budgetEstimate,
              showInGallery: projectSeed.showInGallery,
              galleryOrder: projectSeed.galleryOrder,
              isActive: true
            },
            { transaction: tx }
          );
        }

        const existingMediaCount = await ProjectMedia.count({ where: { projectId: project.id }, transaction: tx });
        if (existingMediaCount > 0 && !force) {
          continue;
        }

        if (force) {
          await ProjectMedia.destroy({ where: { projectId: project.id }, transaction: tx });
        }

        for (let index = 0; index < projectSeed.media.length; index += 1) {
          const filename = projectSeed.media[index];
          const relativePath = `${STATIC_GALLERY_PREFIX}${filename}`;
          const absolutePath = path.join(__dirname, '..', relativePath);
          if (!fs.existsSync(absolutePath)) {
            continue;
          }

          await ProjectMedia.create(
            {
              projectId: project.id,
              mediaType: 'image',
              url: `/${relativePath.replace(/\\/g, '/')}`,
              storagePath: relativePath.replace(/\\/g, '/'),
              filename,
              mimeType: 'image/jpeg',
              caption: projectSeed.title,
              showInGallery: true,
              galleryOrder: index,
              isCover: index === 0
            },
            { transaction: tx }
          );
          stats.mediaCreated += 1;
        }
      }

      await tx.commit();
      clearServicesCache();
      clearGalleryCache();
      return res.json({ message: 'Starter seed completed', force, stats });
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  })
);

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

    const includeMedia = parseBoolean(req.query.includeMedia, true);
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

module.exports = router;
