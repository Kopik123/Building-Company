require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const { syncDatabase } = require('./models');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api/', limiter);

// Import routes
const authRoutes = require('./routes/auth');
const quotesRoutes = require('./routes/quotes');
const managerRoutes = require('./routes/manager');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/manager', managerRoutes);

// Static files - keep existing gallery and contact functionality
app.use(express.static('.'));

// Original contact endpoint (for non-authenticated users)
app.post('/api/contact', async (req, res) => {
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
    return res.status(400).json({
      error: 'Name, email and message are required.'
    });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email.trim())) {
    return res.status(400).json({
      error: 'Please provide a valid email address.'
    });
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.CONTACT_TO) {
    return res.status(503).json({
      error: 'Email service is not configured yet. Please set SMTP env variables.'
    });
  }

  try {
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
      html: `<h2>New contact form enquiry</h2>
<p><strong>Name:</strong> ${name.trim()}</p>
<p><strong>Email:</strong> ${email.trim()}</p>
<p><strong>Phone:</strong> ${phone.trim() || '-'}</p>
<p><strong>Location:</strong> ${location.trim() || '-'}</p>
<p><strong>Project type:</strong> ${projectType.trim() || '-'}</p>
<p><strong>Budget:</strong> ${budget.trim() || '-'}</p>
<p><strong>Message:</strong></p>
<p>${message.trim().replace(/\n/g, '<br />')}</p>`
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error('Error sending contact email:', error);
    return res.status(500).json({
      error: 'Failed to send email. Please try again later.'
    });
  }
});

// Gallery API
app.get('/api/gallery', (req, res) => {
  const galleryPath = path.join(__dirname, 'Gallery');
  
  try {
    const files = fs.readdirSync(galleryPath);
    
    const imageFiles = files
      .filter(file => /\.(jpg|jpeg|png|gif|webp|JPG|JPEG|PNG|GIF|WEBP)$/.test(file))
      .sort((a, b) => {
        const dateA = a.match(/\d{8}/)?.[0] || '00000000';
        const dateB = b.match(/\d{8}/)?.[0] || '00000000';
        return dateB.localeCompare(dateA);
      });
    
    res.json({ images: imageFiles });
  } catch (error) {
    console.error('Error reading gallery folder:', error);
    res.status(500).json({ error: 'Failed to read gallery folder' });
  }
});

// Initialize database and start server
const startServer = async () => {
  try {
    await syncDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`Gallery API available at http://localhost:${PORT}/api/gallery`);
      console.log(`Contact API available at http://localhost:${PORT}/api/contact`);
      console.log(`Auth API available at http://localhost:${PORT}/api/auth`);
      console.log(`Quotes API available at http://localhost:${PORT}/api/quotes`);
      console.log(`Manager API available at http://localhost:${PORT}/api/manager`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
