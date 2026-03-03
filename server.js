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
const { syncDatabase } = require('./models');

const authRoutes = require('./routes/auth');
const quotesRoutes = require('./routes/quotes');
const inboxRoutes = require('./routes/inbox');
const managerRoutes = require('./routes/manager');
const notificationsRoutes = require('./routes/notifications');
const groupRoutes = require('./routes/group');

const app = express();
app.set('trust proxy', 1);
const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const PORT = Number(process.env.PORT) || 3000;
const allowedOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20
});

const claimLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10
});

app.use(helmet());
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
app.use('/api/quotes/guest/:id/claim', claimLimiter);
app.use('/api/contact', contactLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/group', groupRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname)));

app.get('/api/gallery', (req, res) => {
  const galleryPath = path.join(__dirname, 'Gallery');

  try {
    const files = fs.readdirSync(galleryPath);
    const imageFiles = files
      .filter((file) => /^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|gif|webp)$/i.test(file))
      .sort((a, b) => {
        const dateA = a.match(/\d{8}/)?.[0] || '00000000';
        const dateB = b.match(/\d{8}/)?.[0] || '00000000';
        return dateB.localeCompare(dateA);
      });

    return res.json({ images: imageFiles });
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

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.CONTACT_TO) {
      return res.status(503).json({ error: 'Email service is not configured yet.' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

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
    await syncDatabase();
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
