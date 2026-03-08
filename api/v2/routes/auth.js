const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User, SessionRefreshToken } = require('../../../models');
const asyncHandler = require('../../../utils/asyncHandler');
const { authV2 } = require('../middleware/auth');
const { ok, fail } = require('../utils/response');

const router = express.Router();
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = Math.max(
  1,
  Number.parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30', 10) || 30
);

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const hashToken = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const createRefreshToken = () => crypto.randomBytes(48).toString('base64url');

const signAccessToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      role: user.role,
      type: 'access'
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );

const issueSessionTokens = async (user, req) => {
  const accessToken = signAccessToken(user);
  const refreshToken = createRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  const session = await SessionRefreshToken.create({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    userAgent: String(req.get('user-agent') || '').slice(0, 255) || null,
    ipAddress: String(req.ip || req.connection?.remoteAddress || '').slice(0, 255) || null,
    expiresAt
  });

  return {
    accessToken,
    refreshToken,
    refreshTokenId: session.id,
    expiresAt
  };
};

router.post(
  '/login',
  [body('email').isEmail(), body('password').isString().isLength({ min: 1 })],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return fail(res, 401, 'invalid_credentials', 'Invalid credentials');
    }
    if (!user.isActive) {
      return fail(res, 403, 'user_inactive', 'User is inactive');
    }

    const valid = await user.validatePassword(password);
    if (!valid) {
      return fail(res, 401, 'invalid_credentials', 'Invalid credentials');
    }

    await user.update({ lastLogin: new Date() });
    const tokens = await issueSessionTokens(user, req);

    return ok(
      res,
      {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      },
      {
        tokenType: 'Bearer',
        accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN,
        refreshTokenExpiresInDays: REFRESH_TOKEN_EXPIRES_DAYS
      }
    );
  })
);

router.post(
  '/refresh',
  [body('refreshToken').isString().isLength({ min: 20 })],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const refreshToken = String(req.body.refreshToken || '');
    const refreshHash = hashToken(refreshToken);
    const now = new Date();

    const oldSession = await SessionRefreshToken.findOne({
      where: {
        tokenHash: refreshHash,
        revokedAt: null
      },
      include: [{ model: User, as: 'user' }]
    });

    if (!oldSession || !oldSession.user || !oldSession.user.isActive || new Date(oldSession.expiresAt) <= now) {
      return fail(res, 401, 'invalid_refresh_token', 'Invalid refresh token');
    }

    const tokens = await issueSessionTokens(oldSession.user, req);
    await oldSession.update({
      revokedAt: now,
      replacedByTokenId: tokens.refreshTokenId
    });

    return ok(
      res,
      {
        user: oldSession.user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      },
      {
        tokenType: 'Bearer',
        accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN,
        refreshTokenExpiresInDays: REFRESH_TOKEN_EXPIRES_DAYS
      }
    );
  })
);

router.post(
  '/logout',
  [authV2, body('refreshToken').optional().isString()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    let where = {
      userId: req.v2User.id,
      revokedAt: null
    };

    if (req.body.refreshToken) {
      where = {
        ...where,
        tokenHash: hashToken(String(req.body.refreshToken))
      };
    }

    const [revokedCount] = await SessionRefreshToken.update(
      { revokedAt: new Date() },
      { where }
    );

    return ok(res, { loggedOut: true, revokedCount });
  })
);

router.get('/me', authV2, asyncHandler(async (req, res) => ok(res, { user: req.v2User })));

router.patch(
  '/profile',
  [
    authV2,
    body('name').optional().trim().isLength({ min: 2, max: 120 }),
    body('phone').optional({ nullable: true }).trim().isLength({ max: 40 }),
    body('companyName').optional({ nullable: true }).trim().isLength({ max: 120 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
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
      return fail(res, 400, 'no_changes', 'No profile fields provided');
    }

    await req.v2User.update(payload);
    return ok(res, { user: req.v2User });
  })
);

router.patch(
  '/password',
  [
    authV2,
    body('currentPassword').isString().isLength({ min: 1 }),
    body('newPassword').isString().isLength({ min: 8 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    if (currentPassword === newPassword) {
      return fail(res, 400, 'invalid_password_change', 'New password must be different');
    }

    const userWithPassword = await User.findByPk(req.v2User.id);
    if (!userWithPassword) {
      return fail(res, 404, 'user_not_found', 'User not found');
    }

    const valid = await userWithPassword.validatePassword(currentPassword);
    if (!valid) {
      return fail(res, 401, 'invalid_credentials', 'Current password is invalid');
    }

    await userWithPassword.update({ password: newPassword });

    await SessionRefreshToken.update(
      { revokedAt: new Date() },
      { where: { userId: req.v2User.id, revokedAt: null } }
    );

    return ok(res, { passwordUpdated: true });
  })
);

module.exports = router;
