const express = require('express');
const path = require('path');
const { Op } = require('sequelize');
const { param, query, validationResult } = require('express-validator');
const {
  Project,
  ProjectMedia,
  Quote,
  NewQuote,
  GroupMember,
  GroupThread,
  Notification,
  ServiceOffering,
  User
} = require('../models');
const { auth, roleCheck } = require('../middleware/auth');
const { upload } = require('../utils/upload');
const asyncHandler = require('../utils/asyncHandler');
const { toNewQuoteSummary } = require('../utils/newQuoteShape');

const router = express.Router();
const clientGuard = [auth, roleCheck('client')];

const normalizeStoragePath = (absolutePath) => {
  const relative = path.relative(path.join(__dirname, '..'), absolutePath);
  return relative.replace(/\\/g, '/');
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const sortByRecent = (items) => (Array.isArray(items) ? items.slice().sort((left, right) => {
  const leftTime = Date.parse(left?.updatedAt || left?.createdAt || 0) || 0;
  const rightTime = Date.parse(right?.updatedAt || right?.createdAt || 0) || 0;
  return rightTime - leftTime;
}) : []);

const mapProject = (project) => {
  const plain = project.toJSON();
  const media = Array.isArray(plain.media) ? plain.media : [];
  const images = media
    .filter((item) => item.mediaType === 'image')
    .sort((a, b) => {
      if (a.isCover !== b.isCover) return Number(b.isCover) - Number(a.isCover);
      if (a.galleryOrder !== b.galleryOrder) return a.galleryOrder - b.galleryOrder;
      return String(a.filename || '').localeCompare(String(b.filename || ''));
    });
  const documents = media
    .filter((item) => item.mediaType === 'document')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    ...plain,
    images,
    documents
  };
};

router.get(
  '/overview',
  [...clientGuard, query('includeThreads').optional().isIn(['true', 'false', '1', '0'])],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const includeThreads = parseBoolean(req.query.includeThreads, true);
    const [projects, quotes, stagedNewQuotes, memberships, unreadCount, services] = await Promise.all([
      Project.findAll({
        where: { clientId: req.user.id, isActive: true },
        include: [
          { model: ProjectMedia, as: 'media', required: false },
          { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'], required: false },
          { model: Quote, as: 'quote', attributes: ['id', 'status', 'projectType', 'location'], required: false }
        ],
        order: [['createdAt', 'DESC']]
      }),
      Quote.findAll({
        where: { clientId: req.user.id },
        include: [{ model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'], required: false }],
        order: [['createdAt', 'DESC']],
        limit: 100
      }),
      typeof NewQuote?.findAll === 'function'
        ? NewQuote.findAll({
          where: { clientId: req.user.id },
          include: [{ model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone', 'companyName'], required: false }],
          order: [['createdAt', 'DESC']],
          limit: 100
        })
        : Promise.resolve([]),
      includeThreads
        ? GroupMember.findAll({
          where: { userId: req.user.id },
          include: [{ model: GroupThread, as: 'thread' }],
          order: [['createdAt', 'DESC']]
        })
        : Promise.resolve([]),
      Notification.count({ where: { userId: req.user.id, isRead: false } }),
      ServiceOffering.findAll({
        where: { showOnWebsite: true, isActive: true },
        order: [['displayOrder', 'ASC'], ['createdAt', 'DESC']]
      })
    ]);

    const mergedQuotes = sortByRecent([
      ...(Array.isArray(quotes) ? quotes : []),
      ...((Array.isArray(stagedNewQuotes) ? stagedNewQuotes : []).map(toNewQuoteSummary))
    ]);

    return res.json({
      user: req.user,
      metrics: {
        projectCount: projects.length,
        quoteCount: mergedQuotes.length,
        unreadNotifications: unreadCount,
        activeProjectCount: projects.filter((item) => item.status === 'in_progress').length
      },
      projects: projects.map(mapProject),
      quotes: mergedQuotes,
      threads: includeThreads ? memberships.map((membership) => membership.thread).filter(Boolean) : [],
      services
    });
  })
);

router.get(
  '/projects',
  clientGuard,
  asyncHandler(async (req, res) => {
    const projects = await Project.findAll({
      where: { clientId: req.user.id, isActive: true },
      include: [
        { model: ProjectMedia, as: 'media', required: false },
        { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'], required: false },
        { model: Quote, as: 'quote', attributes: ['id', 'status', 'projectType', 'location'], required: false }
      ],
      order: [['createdAt', 'DESC']]
    });
    return res.json({ projects: projects.map(mapProject) });
  })
);

router.get(
  '/projects/:id',
  [...clientGuard, param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findOne({
      where: { id: req.params.id, clientId: req.user.id, isActive: true },
      include: [
        { model: ProjectMedia, as: 'media', required: false },
        { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'], required: false },
        { model: Quote, as: 'quote', attributes: ['id', 'status', 'projectType', 'location'], required: false }
      ]
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.json({ project: mapProject(project) });
  })
);

router.post(
  '/projects/:id/documents/upload',
  [...clientGuard, param('id').isUUID(), upload.array('files', 10)],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findOne({
      where: { id: req.params.id, clientId: req.user.id, isActive: true }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const caption = req.body.caption ? String(req.body.caption).trim() : null;
    const created = await ProjectMedia.bulkCreate(
      files.map((file) => ({
        projectId: project.id,
        mediaType: 'document',
        url: `/uploads/${file.filename}`,
        storagePath: normalizeStoragePath(file.path),
        filename: file.originalname,
        mimeType: file.mimetype || null,
        sizeBytes: Number.isFinite(file.size) ? file.size : null,
        caption,
        showInGallery: false,
        galleryOrder: 0,
        isCover: false
      })),
      { returning: true }
    );

    const managerRecipients = await User.findAll({
      where: project.assignedManagerId
        ? { id: project.assignedManagerId, isActive: true }
        : { role: { [Op.in]: ['manager', 'admin'] }, isActive: true }
    });

    if (managerRecipients.length) {
      await Notification.bulkCreate(
        managerRecipients.map((user) => ({
          userId: user.id,
          type: 'client_document_uploaded',
          title: `Client uploaded document (${req.user.name})`,
          body: `New document uploaded to project "${project.title}".`,
          quoteId: project.quoteId || null,
          data: {
            projectId: project.id,
            clientId: req.user.id,
            fileCount: created.length
          }
        }))
      );
    }

    return res.status(201).json({ documents: created });
  })
);

module.exports = router;
