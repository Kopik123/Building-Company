require('dotenv').config();

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'BOOTSTRAP_ADMIN_KEY'];
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);

if (missingEnvVars.length) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const { Project, ProjectMedia } = require('./models');
const { runMigrations } = require('./db/migrator');

const authRoutes = require('./routes/auth');
const quotesRoutes = require('./routes/quotes');
const inboxRoutes = require('./routes/inbox');
const managerRoutes = require('./routes/manager');
const notificationsRoutes = require('./routes/notifications');
const groupRoutes = require('./routes/group');
const clientRoutes = require('./routes/client');
const publicRoutes = require('./routes/public');
const apiV2Routes = require('./api/v2');

const app = express();
app.set('trust proxy', 1);
let cachedContactTransporter;

const PORT = Number(process.env.PORT) || 3000;
const allowedOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const GALLERY_PATH = path.join(__dirname, 'Gallery');
const GALLERY_IMAGE_PATTERN = /\.(jpg|jpeg|png|gif|webp)$/i;
const galleryCacheTtlRaw = Number(process.env.GALLERY_CACHE_TTL_MS);
const GALLERY_CACHE_TTL_MS = Number.isFinite(galleryCacheTtlRaw) && galleryCacheTtlRaw > 0
  ? galleryCacheTtlRaw
  : 60 * 1000;
const publicGalleryCacheTtlRaw = Number(process.env.PUBLIC_GALLERY_CACHE_TTL_MS);
const PUBLIC_GALLERY_CACHE_TTL_MS = Number.isFinite(publicGalleryCacheTtlRaw) && publicGalleryCacheTtlRaw > 0
  ? publicGalleryCacheTtlRaw
  : 30 * 1000;
let galleryCache = {
  images: null,
  expiresAt: 0
};
let managedGalleryCache = {
  payload: null,
  expiresAt: 0
};

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const claimLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

const getContactTransporter = () => {
  if (!cachedContactTransporter) {
    const smtpUser = String(process.env.SMTP_USER || '').trim();
    const smtpPass = String(process.env.SMTP_PASS || '').trim();
    const transporterConfig = {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      pool: true
    };

    if (smtpUser && smtpPass) {
      transporterConfig.auth = {
        user: smtpUser,
        pass: smtpPass
      };
    }

    cachedContactTransporter = nodemailer.createTransport(transporterConfig);
  }

  return cachedContactTransporter;
};

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

const getDateTokenFromFilename = (filename) => filename.match(/\d{8}/)?.[0] || '00000000';
const applyPublicCacheHeaders = (res, ttlMs) => {
  const maxAgeSeconds = Math.max(1, Math.floor(ttlMs / 1000));
  res.set('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`);
};

const getGalleryImages = async () => {
  const now = Date.now();
  if (galleryCache.images && now < galleryCache.expiresAt) {
    return galleryCache.images;
  }

  const files = await fs.promises.readdir(GALLERY_PATH);
  const imageFiles = files
    .filter((file) => GALLERY_IMAGE_PATTERN.test(file))
    .sort((a, b) => getDateTokenFromFilename(b).localeCompare(getDateTokenFromFilename(a)));

  galleryCache = {
    images: imageFiles,
    expiresAt: now + GALLERY_CACHE_TTL_MS
  };

  return imageFiles;
};

const mapManagedGalleryProjects = (projects) =>
  projects
    .map((project) => {
      const images = (project.media || [])
        .filter((item) => item.mediaType === 'image' && item.showInGallery)
        .sort((a, b) => {
          if (a.isCover !== b.isCover) return Number(b.isCover) - Number(a.isCover);
          if (a.galleryOrder !== b.galleryOrder) return a.galleryOrder - b.galleryOrder;
          return String(a.filename || '').localeCompare(String(b.filename || ''));
        })
        .map((item) => item.url);

      return {
        id: project.id,
        name: project.title,
        location: project.location || null,
        images
      };
    })
    .filter((project) => project.images.length);

const getManagedGalleryProjects = async () => {
  const projects = await Project.findAll({
    where: {
      showInGallery: true,
      isActive: true
    },
    attributes: ['id', 'title', 'location'],
    include: [
      {
        model: ProjectMedia,
        as: 'media',
        attributes: ['url', 'mediaType', 'showInGallery', 'isCover', 'galleryOrder', 'filename'],
        where: {
          mediaType: 'image',
          showInGallery: true
        },
        required: false
      }
    ],
    order: [['galleryOrder', 'ASC'], ['createdAt', 'DESC']]
  });

  return mapManagedGalleryProjects(projects);
};

const getManagedGalleryProjectsCached = async () => {
  const now = Date.now();
  if (managedGalleryCache.payload && now < managedGalleryCache.expiresAt) {
    return {
      cacheHit: true,
      projects: managedGalleryCache.payload.projects
    };
  }

  const projects = await getManagedGalleryProjects();
  managedGalleryCache = {
    payload: { projects },
    expiresAt: now + PUBLIC_GALLERY_CACHE_TTL_MS
  };

  return {
    cacheHit: false,
    projects
  };
};

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Static pages include inline JSON-LD and a small inline bootstrap script.
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    const err = new Error('Origin not allowed by CORS policy');
    err.statusCode = 403;
    callback(err);
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/', globalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/v2/auth', authLimiter);
app.use('/api/quotes/guest/:id/claim', claimLimiter);
app.use('/api/contact', contactLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/group', groupRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/v2', apiV2Routes);
app.use('/api', publicRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname)));

app.get('/api/gallery/projects', async (req, res) => {
  try {
    const { cacheHit, projects } = await getManagedGalleryProjectsCached();
    applyPublicCacheHeaders(res, PUBLIC_GALLERY_CACHE_TTL_MS);
    res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
    return res.json({ projects });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load gallery projects' });
  }
});

app.get('/api/gallery', async (req, res) => {
  try {
    const { projects: managedProjects } = await getManagedGalleryProjectsCached();
    if (managedProjects.length) {
      applyPublicCacheHeaders(res, PUBLIC_GALLERY_CACHE_TTL_MS);
      return res.json({ images: managedProjects.flatMap((project) => project.images), projects: managedProjects });
    }

    const imageFiles = await getGalleryImages();
    return res.json({ images: imageFiles, projects: [] });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to read gallery folder' });
  }
});

app.post('/api/contact', async (req, res, next) => {
  try {
    const {
      name = '',
      email = '',
      phone = '',
      location = '',
      projectType = '',
      budget = '',
      message = ''
    } = req.body || {};

    if (!name.trim() || !email.trim() || !message.trim()) {
      return res.status(400).json({ error: 'Name, email and message are required.' });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const smtpUser = String(process.env.SMTP_USER || '').trim();
    const smtpPass = String(process.env.SMTP_PASS || '').trim();
    if (!process.env.SMTP_HOST || !process.env.CONTACT_TO) {
      return res.status(503).json({ error: 'Email service is not configured yet.' });
    }

    if ((smtpUser && !smtpPass) || (!smtpUser && smtpPass)) {
      return res.status(503).json({ error: 'SMTP auth config is incomplete. Set both SMTP_USER and SMTP_PASS.' });
    }

    const transporter = getContactTransporter();

    await transporter.sendMail({
      from: `Building Company <${process.env.CONTACT_FROM || process.env.SMTP_USER}>`,
      to: process.env.CONTACT_TO,
      replyTo: email.trim(),
      subject: `New website enquiry from ${name.trim()}`,
      text: `New contact form enquiry\n\nName: ${name.trim()}\nEmail: ${email.trim()}\nPhone: ${phone.trim() || '-'}\nLocation: ${location.trim() || '-'}\nProject type: ${projectType.trim() || '-'}\nBudget: ${budget.trim() || '-'}\n\nMessage:\n${message.trim()}`,
      html: `<h2>New contact form enquiry</h2>\n<p><strong>Name:</strong> ${escapeHtml(name.trim())}</p>\n<p><strong>Email:</strong> ${escapeHtml(email.trim())}</p>\n<p><strong>Phone:</strong> ${escapeHtml(phone.trim() || '-')}</p>\n<p><strong>Location:</strong> ${escapeHtml(location.trim() || '-')}</p>\n<p><strong>Project type:</strong> ${escapeHtml(projectType.trim() || '-')}</p>\n<p><strong>Budget:</strong> ${escapeHtml(budget.trim() || '-')}</p>\n<p><strong>Message:</strong></p>\n<p>${escapeHtml(message.trim()).replace(/\n/g, '<br />')}</p>`
    });

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

app.use('/api/*', (req, res) => {
  return res.status(404).json({ error: 'API route not found' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = Number(error.statusCode) || 500;
  if (statusCode >= 500) {
    console.error('Unhandled error:', error);
  }

  return res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal server error' : error.message || 'Request failed'
  });
});

const startServer = async () => {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
