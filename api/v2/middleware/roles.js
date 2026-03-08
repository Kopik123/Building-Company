const { fail } = require('../utils/response');

const roleCheckV2 = (...roles) => (req, res, next) => {
  if (!req.v2User) {
    return fail(res, 401, 'auth_required', 'Authentication required');
  }

  if (!roles.includes(req.v2User.role)) {
    return fail(res, 403, 'access_denied', 'Access denied');
  }

  return next();
};

module.exports = {
  roleCheckV2
};
