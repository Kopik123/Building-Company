const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { auth, roleCheck } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { issueV2SessionTokens, signLegacyToken } = require('../utils/sessionTokens');

const router = express.Router();
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const bootstrapLockPath = path.join(__dirname, '..', '.bootstrap.lock');

const safeCompare = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const isBootstrapLocked = () => fs.existsSync(bootstrapLockPath);

const closeBootstrap = () => {
  process.env.BOOTSTRAP_ENABLED = 'false';
  fs.writeFileSync(bootstrapLockPath, `lockedAt=${new Date().toISOString()}\n`, { encoding: 'utf8' });
};

router.post(
  '/register',
  [body('email').isEmail(), body('password').isLength({ min: 8 }), body('name').trim().notEmpty()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = normalizeEmail(req.body.email);
    const { password, name, phone, companyName } = req.body;
    const existing = await User.findOne({ where: { email } });

    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = await User.create({ email, password, name, phone, companyName, role: 'client' });
    const token = signLegacyToken(user.id);
    const v2Session = await issueV2SessionTokens(user, req);
    return res.status(201).json({ user, token, v2Session });
  })
);

router.post(
  '/login',
  [body('email').isEmail(), body('password').notEmpty()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.isActive === false) {
      return res.status(403).json({ error: 'User is inactive' });
    }

    const valid = await user.validatePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await user.update({ lastLogin: new Date() });
    const token = signLegacyToken(user.id);
    const v2Session = await issueV2SessionTokens(user, req);
    return res.json({ user, token, v2Session });
  })
);

router.get('/me', auth, asyncHandler(async (req, res) => {
  return res.json({ user: req.user });
}));

router.patch(
  '/profile',
  [
    auth,
    body('name').optional().trim().isLength({ min: 2, max: 120 }),
    body('phone').optional({ nullable: true }).trim().isLength({ max: 40 }),
    body('companyName').optional({ nullable: true }).trim().isLength({ max: 120 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const payload = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      payload.name = String(req.body.name || '').trim();
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) {
      payload.phone = String(req.body.phone || '').trim() || null;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'companyName')) {
      payload.companyName = String(req.body.companyName || '').trim() || null;
    }

    if (!Object.keys(payload).length) {
      return res.status(400).json({ error: 'No profile fields provided' });
    }

    await req.user.update(payload);
    return res.json({ user: req.user });
  })
);

router.patch(
  '/password',
  [
    auth,
    body('currentPassword').isString().isLength({ min: 1 }),
    body('newPassword').isString().isLength({ min: 8 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different' });
    }

    const userWithPassword = await User.findByPk(req.user.id);
    if (!userWithPassword) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await userWithPassword.validatePassword(currentPassword);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is invalid' });
    }

    await userWithPassword.update({ password: newPassword });
    return res.json({ message: 'Password updated successfully' });
  })
);

router.post(
  '/bootstrap/staff',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().notEmpty(),
    body('role').isIn(['manager', 'admin'])
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (process.env.BOOTSTRAP_ENABLED === 'false' || isBootstrapLocked()) {
      return res.status(403).json({ error: 'Bootstrap is disabled' });
    }

    const keyFromHeader = req.header('x-bootstrap-key');
    if (!safeCompare(keyFromHeader, process.env.BOOTSTRAP_ADMIN_KEY)) {
      return res.status(403).json({ error: 'Invalid bootstrap key' });
    }

    const email = normalizeEmail(req.body.email);
    const { password, name, phone, role } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    if (role === 'admin') {
      const existingAdmin = await User.findOne({ where: { role: 'admin' } });
      if (existingAdmin) {
        return res.status(409).json({ error: 'Admin account already exists' });
      }
    }

    const user = await User.create({ email, password, name, phone, role });
    closeBootstrap();

    const token = signLegacyToken(user.id);
    const v2Session = await issueV2SessionTokens(user, req);
    return res.status(201).json({ user, token, v2Session });
  })
);

router.post(
  '/bootstrap/rotate-key',
  [
    auth,
    roleCheck('admin'),
    body('currentBootstrapKey').isString().isLength({ min: 8 }),
    body('newBootstrapKey').isString().isLength({ min: 16 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentBootstrapKey, newBootstrapKey } = req.body;
    if (!safeCompare(currentBootstrapKey, process.env.BOOTSTRAP_ADMIN_KEY)) {
      return res.status(403).json({ error: 'Invalid current bootstrap key' });
    }

    if (safeCompare(currentBootstrapKey, newBootstrapKey)) {
      return res.status(400).json({ error: 'New bootstrap key must be different' });
    }

    process.env.BOOTSTRAP_ADMIN_KEY = String(newBootstrapKey);

    return res.json({ message: 'Bootstrap admin key rotated successfully' });
  })
);

module.exports = router;
