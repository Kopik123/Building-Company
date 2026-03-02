const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER && process.env.SMTP_PASS
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    : undefined
};

const recipientEmail = process.env.CONTACT_TO;
const senderEmail = process.env.CONTACT_FROM || process.env.SMTP_USER;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

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

  if (!smtpConfig.host || !smtpConfig.auth || !recipientEmail || !senderEmail) {
    return res.status(503).json({
      error: 'Email service is not configured yet. Please set SMTP env variables.'
    });
  }

  try {
    const transporter = nodemailer.createTransport(smtpConfig);

    await transporter.sendMail({
      from: `Building Company <${senderEmail}>`,
      to: recipientEmail,
      replyTo: email.trim(),
      subject: `New website enquiry from ${name.trim()}`,
      text:
`New contact form enquiry\n\nName: ${name.trim()}\nEmail: ${email.trim()}\nPhone: ${phone.trim() || '-'}\nLocation: ${location.trim() || '-'}\nProject type: ${projectType.trim() || '-'}\nBudget: ${budget.trim() || '-'}\n\nMessage:\n${message.trim()}`,
      html:
`<h2>New contact form enquiry</h2>
<p><strong>Name:</strong> ${escapeHtml(name.trim())}</p>
<p><strong>Email:</strong> ${escapeHtml(email.trim())}</p>
<p><strong>Phone:</strong> ${escapeHtml(phone.trim() || '-')}</p>
<p><strong>Location:</strong> ${escapeHtml(location.trim() || '-')}</p>
<p><strong>Project type:</strong> ${escapeHtml(projectType.trim() || '-')}</p>
<p><strong>Budget:</strong> ${escapeHtml(budget.trim() || '-')}</p>
<p><strong>Message:</strong></p>
<p>${escapeHtml(message.trim()).replace(/\n/g, '<br />')}</p>`
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error('Error sending contact email:', error);
    return res.status(500).json({
      error: 'Failed to send email. Please try again later.'
    });
  }
});

// API endpoint to get all images from Gallery folder
app.get('/api/gallery', (req, res) => {
  const galleryPath = path.join(__dirname, 'Gallery');
  
  try {
    const files = fs.readdirSync(galleryPath);
    
    // Filter only image files and sort by date (newest first)
    const imageFiles = files
      .filter(file => /\.(jpg|jpeg|png|gif|webp|JPG|JPEG|PNG|GIF|WEBP)$/.test(file))
      .sort((a, b) => {
        const dateA = a.match(/\d{8}/)?.[0] || '00000000';
        const dateB = b.match(/\d{8}/)?.[0] || '00000000';
        return dateB.localeCompare(dateA); // Newest first
      });
    
    res.json({ images: imageFiles });
  } catch (error) {
    console.error('Error reading gallery folder:', error);
    res.status(500).json({ error: 'Failed to read gallery folder' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Gallery API available at http://localhost:${PORT}/api/gallery`);
  console.log(`Contact API available at http://localhost:${PORT}/api/contact`);
});
