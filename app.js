const fs = require('fs');
const path = require('path');
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createAssetVersion, createVersionedHtmlMiddleware } = require('./utils/assetVersioning');

const authRoutes = require('./routes/auth');
const quotesRoutes = require('./routes/quotes');
const inboxRoutes = require('./routes/inbox');
const managerRoutes = require('./routes/manager');
const notificationsRoutes = require('./routes/notifications');
const groupRoutes = require('./routes/group');
const clientRoutes = require('./routes/client');
const publicRoutes = require('./routes/public');
const contactRoutes = require('./routes/contact');
const legacyGalleryRoutes = require('./routes/gallery');
const apiV2Routes = require('./api/v2');

const createRateLimiter = (windowMs, max) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false
  });

const setStaticCacheHeaders = (res, filePath) => {
  const ext = String(path.extname(filePath) || '').toLowerCase();

  if (ext === '.html') {
    res.setHeader('Cache-Control', 'no-store');
    return;
  }

  // During active site iteration we want browsers to fetch fresh frontend assets
  // so deploys show up without manual history/cache clearing.
  if (['.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.svg'].includes(ext)) {
    res.setHeader('Cache-Control', 'no-store');
    return;
  }

  if (['.woff', '.woff2'].includes(ext)) {
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    return;
  }

  if (['.pdf', '.doc', '.docx'].includes(ext)) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
};

const DEFAULT_WEB_V2_MOUNT_PATH = '/app-v2';

const normalizeMountPath = (value, fallback = DEFAULT_WEB_V2_MOUNT_PATH) => {
  const raw = String(value || fallback).trim();
  if (!raw || raw === '/') return fallback;
  const normalized = `/${raw.replace(/^\/+/, '').replace(/\/+$/, '')}`;
  return normalized === '/' ? fallback : normalized;
};

const mountWebV2 = (app) => {
  const mountPath = normalizeMountPath(process.env.WEB_V2_MOUNT_PATH);
  const distDir = path.join(__dirname, 'apps', 'web-v2', 'dist');
  const indexPath = path.join(distDir, 'index.html');

  if (!fs.existsSync(indexPath)) {
    return;
  }

  const sendIndex = (req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      next();
      return;
    }

    if (path.extname(req.path)) {
      next();
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'HEAD') {
      res.status(200).end();
      return;
    }

    res.sendFile(indexPath);
  };

  app.locals.webV2MountPath = mountPath;
  app.use(mountPath, express.static(distDir, {
    index: false,
    redirect: false,
    setHeaders: setStaticCacheHeaders
  }));
  app.get(mountPath, sendIndex);
  app.get(`${mountPath}/*`, sendIndex);
};

const createApp = () => {
  const app = express();
  const assetVersion = createAssetVersion();
  app.locals.galleryPath = path.join(__dirname, 'Gallery');
  app.locals.assetVersion = assetVersion;
  const allowedOrigins = String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.set('trust proxy', 1);

  const globalLimiter = createRateLimiter(15 * 60 * 1000, 150);
  const authLimiter = createRateLimiter(15 * 60 * 1000, 20);
  const claimLimiter = createRateLimiter(15 * 60 * 1000, 10);
  const contactLimiter = createRateLimiter(60 * 60 * 1000, 10);

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

  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/healthz', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      status: 'ok',
      service: 'building-company',
      uptimeSeconds: Math.round(process.uptime())
    });
  });

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
  app.use('/api/gallery', legacyGalleryRoutes({
    galleryPath: app.locals.galleryPath
  }));
  app.use('/api/contact', contactRoutes());

  app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: setStaticCacheHeaders
  }));
  mountWebV2(app);
  app.use(createVersionedHtmlMiddleware({
    rootDir: __dirname,
    assetVersion,
    cacheControl: 'no-store'
  }));
  app.use(express.static(path.join(__dirname), {
    setHeaders: setStaticCacheHeaders
  }));

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

  return app;
};

module.exports = {
  createApp
};
