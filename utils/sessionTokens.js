const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { SessionRefreshToken } = require('../models');

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = Math.max(
  1,
  Number.parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30', 10) || 30
);
const LEGACY_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const hashToken = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const createRefreshToken = () => crypto.randomBytes(48).toString('base64url');

const signLegacyToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: LEGACY_TOKEN_EXPIRES_IN
  });

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

const issueV2SessionTokens = async (user, req, sessionModel = SessionRefreshToken) => {
  const accessToken = signAccessToken(user);
  const refreshToken = createRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  const session = await sessionModel.create({
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

module.exports = {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_DAYS,
  LEGACY_TOKEN_EXPIRES_IN,
  hashToken,
  createRefreshToken,
  signLegacyToken,
  signAccessToken,
  issueV2SessionTokens
};
