const express = require('express');
const { Op } = require('sequelize');
const { param, query, validationResult } = require('express-validator');
const { ActivityEvent, User } = require('../../../models');
const asyncHandler = require('../../../utils/asyncHandler');
const { authV2 } = require('../middleware/auth');
const { roleCheckV2 } = require('../middleware/roles');
const { ok, fail } = require('../utils/response');

const router = express.Router();
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const getPagination = (req) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE));
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize
  };
};

const buildVisibilityWhere = (user) => {
  if (String(user?.role || '').toLowerCase() === 'client') {
    return { [Op.in]: ['client', 'public'] };
  }
  return { [Op.in]: ['internal', 'client', 'public'] };
};

router.get(
  '/',
  [
    authV2,
    roleCheckV2('client', 'employee', 'manager', 'admin'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt(),
    query('clientId').optional().isUUID(),
    query('projectId').optional().isUUID(),
    query('quoteId').optional().isUUID()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const where = {
      visibility: buildVisibilityWhere(req.v2User)
    };

    if (req.v2User.role === 'client') {
      where.clientId = req.v2User.id;
    } else {
      if (req.query.clientId) where.clientId = req.query.clientId;
      if (req.query.projectId) where.projectId = req.query.projectId;
      if (req.query.quoteId) where.quoteId = req.query.quoteId;
    }

    const { page, pageSize, offset } = getPagination(req);
    const { rows, count } = await ActivityEvent.findAndCountAll({
      where,
      include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'email', 'role'], required: false }],
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset
    });

    return ok(res, { activity: rows }, { page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) });
  })
);

router.get(
  '/projects/:id',
  [
    authV2,
    roleCheckV2('employee', 'manager', 'admin'),
    param('id').isUUID(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const { page, pageSize, offset } = getPagination(req);
    const { rows, count } = await ActivityEvent.findAndCountAll({
      where: {
        projectId: req.params.id,
        visibility: { [Op.in]: ['internal', 'client', 'public'] }
      },
      include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'email', 'role'], required: false }],
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset
    });

    return ok(res, { activity: rows }, { page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) });
  })
);

router.get(
  '/clients/:id',
  [
    authV2,
    roleCheckV2('employee', 'manager', 'admin'),
    param('id').isUUID(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const { page, pageSize, offset } = getPagination(req);
    const { rows, count } = await ActivityEvent.findAndCountAll({
      where: {
        clientId: req.params.id,
        visibility: { [Op.in]: ['internal', 'client', 'public'] }
      },
      include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'email', 'role'], required: false }],
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset
    });

    return ok(res, { activity: rows }, { page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) });
  })
);

module.exports = router;
