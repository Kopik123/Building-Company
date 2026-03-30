const jwt = require('jsonwebtoken');
const { User } = require('../models');

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

const auth = async (req, res, next) => {
  try {
    const header = req.header('Authorization');
    const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.id, { attributes: AUTH_USER_ATTRIBUTES });

    if (!user || user.isActive === false) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
};

const roleCheck = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  return next();
};

module.exports = {
  auth,
  roleCheck
};
