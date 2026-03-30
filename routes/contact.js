const express = require('express');
const { getTransporter } = require('../utils/mailer');

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

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

module.exports = createContactRouter;
