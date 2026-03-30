const jwt = require('jsonwebtoken');
const { User } = require('../../../models');
const { fail } = require('../utils/response');

const AUTH_USER_ATTRIBUTES = [
  'id',
  'email',
  'role',
  'name',
  'phone',
  'companyName',
  'isActive',
  'lastLogin',
  'createdAt',
  'updatedAt'
];

const authV2 = async (req, res, next) => {
  try {
    const header = req.header('Authorization');
    const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return fail(res, 401, 'auth_required', 'Authentication required');
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type && payload.type !== 'access') {
      return fail(res, 401, 'invalid_token_type', 'Invalid token type');
    }

    const user = await User.findByPk(payload.id, { attributes: AUTH_USER_ATTRIBUTES });
    if (!user || user.isActive === false) {
      return fail(res, 401, 'invalid_user', 'Invalid user');
    }

    req.v2User = user;
    return next();
  } catch (_error) {
    return fail(res, 401, 'invalid_token', 'Invalid authentication token');
  }
};

module.exports = {
  authV2
};
