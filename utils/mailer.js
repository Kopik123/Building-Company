const nodemailer = require('nodemailer');

// Singleton: safe under Node.js single-threaded event loop because
// nodemailer.createTransport() is synchronous – no race between check and set.
let cachedTransporter;

const getTransporter = () => {
  if (!cachedTransporter) {
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

    cachedTransporter = nodemailer.createTransport(transporterConfig);
  }

  return cachedTransporter;
};

module.exports = { getTransporter };
