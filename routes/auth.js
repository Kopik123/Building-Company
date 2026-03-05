const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { auth, roleCheck } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

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

    const { email, password, name, phone, companyName } = req.body;
    const existing = await User.findOne({ where: { email } });

    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = await User.create({ email, password, name, phone, companyName, role: 'client' });
    const token = signToken(user.id);
    return res.status(201).json({ user, token });
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

    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await user.validatePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await user.update({ lastLogin: new Date() });
    const token = signToken(user.id);
    return res.json({ user, token });
  })
);

router.get('/me', auth, asyncHandler(async (req, res) => {
  return res.json({ user: req.user });
}));

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

    const { email, password, name, phone, role } = req.body;
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

    const token = signToken(user.id);
    return res.status(201).json({ user, token });
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
