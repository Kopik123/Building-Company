const express = require('express');
const { getTransporter } = require('../utils/mailer');

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

const CHAR_CODE_0 = 48;
const CHAR_CODE_9 = 57;
const CHAR_CODE_A = 65;
const CHAR_CODE_Z = 90;
const CHAR_CODE_a = 97;
const CHAR_CODE_z = 122;

const isValidContactEmail = (value) => {
  const email = String(value || '').trim();
  if (!email || email.length > 254 || email.includes(' ')) return false;

  const atIndex = email.indexOf('@');
  if (atIndex <= 0 || atIndex !== email.lastIndexOf('@') || atIndex === email.length - 1) return false;

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (!localPart || localPart.length > 64 || !domain || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return false;
  }

  const domainLabels = domain.split('.');
  if (domainLabels.length < 2) return false;

  return domainLabels.every((label) => {
    if (!label || label.startsWith('-') || label.endsWith('-')) return false;
    for (const char of label) {
      const code = char.charCodeAt(0);
      const isDigit = code >= CHAR_CODE_0 && code <= CHAR_CODE_9;
      const isUpper = code >= CHAR_CODE_A && code <= CHAR_CODE_Z;
      const isLower = code >= CHAR_CODE_a && code <= CHAR_CODE_z;
      if (!isDigit && !isUpper && !isLower && char !== '-') return false;
    }
    return true;
  });
};

const createContactRouter = () => {
  const router = express.Router();

  router.post('/', async (req, res, next) => {
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

      if (!isValidContactEmail(email)) {
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

      const transporter = getTransporter();

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

  return router;
};

createContactRouter.isValidContactEmail = isValidContactEmail;

module.exports = createContactRouter;
