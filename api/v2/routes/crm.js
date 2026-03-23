const express = require('express');
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const { body, param, query, validationResult } = require('express-validator');
const { User } = require('../../../models');
const asyncHandler = require('../../../utils/asyncHandler');
const { authV2 } = require('../middleware/auth');
const { roleCheckV2 } = require('../middleware/roles');
const { ok, fail } = require('../utils/response');
const { STAFF_CREATION_ROLES, STAFF_ROLES } = require('../../../shared/contracts/v2');

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

const escapeLike = (value) => String(value || '').replace(/[\\%_]/g, '\\$&');
const toNullableString = (value) => {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : null;
};

router.get(
  '/clients',
  [
    authV2,
    roleCheckV2('employee', 'manager', 'admin'),
    query('q').optional().trim().isLength({ min: 1, max: 255 }),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const where = { role: 'client', isActive: true };
    if (req.query.q) {
      const needle = `%${escapeLike(String(req.query.q).trim().toLowerCase())}%`;
      where[Op.or] = [
        sqlWhere(fn('LOWER', col('email')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('name')), { [Op.like]: needle })
      ];
    }

    const { page, pageSize, offset } = getPagination(req);
    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: ['id', 'name', 'email', 'phone', 'companyName', 'isActive', 'createdAt', 'updatedAt'],
      order: [['email', 'ASC']],
      limit: pageSize,
      offset
    });

    return ok(res, { clients: rows }, { page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) });
  })
);

router.get(
  '/staff',
  [
    authV2,
    roleCheckV2('employee', 'manager', 'admin'),
    query('q').optional().trim().isLength({ min: 1, max: 255 }),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const where = { role: { [Op.in]: STAFF_ROLES }, isActive: true };
    if (req.query.q) {
      const needle = `%${escapeLike(String(req.query.q).trim().toLowerCase())}%`;
      where[Op.or] = [
        sqlWhere(fn('LOWER', col('email')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('name')), { [Op.like]: needle })
      ];
    }

    const { page, pageSize, offset } = getPagination(req);
    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: ['id', 'name', 'email', 'phone', 'role', 'isActive', 'createdAt', 'updatedAt'],
      order: [['email', 'ASC']],
      limit: pageSize,
      offset
    });

    return ok(res, { staff: rows }, { page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) });
  })
);

router.patch(
  '/clients/:id',
  [
    authV2,
    roleCheckV2('manager', 'admin'),
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('phone').optional({ nullable: true }).trim(),
    body('companyName').optional({ nullable: true }).trim(),
    body('isActive').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const client = await User.findByPk(req.params.id);
    if (!client || client.role !== 'client') return fail(res, 404, 'client_not_found', 'Client not found');

    const payload = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) payload.name = String(req.body.name || '').trim();
    if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) payload.phone = toNullableString(req.body.phone);
    if (Object.prototype.hasOwnProperty.call(req.body, 'companyName')) payload.companyName = toNullableString(req.body.companyName);
    if (Object.prototype.hasOwnProperty.call(req.body, 'isActive')) payload.isActive = req.body.isActive;
    if (!Object.keys(payload).length) return fail(res, 400, 'no_changes', 'No changes provided');

    await client.update(payload);
    return ok(res, { client });
  })
);

router.post(
  '/staff',
  [
    authV2,
    roleCheckV2('manager', 'admin'),
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().notEmpty(),
    body('role').isIn(STAFF_CREATION_ROLES),
    body('phone').optional().trim()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const email = String(req.body.email || '').trim().toLowerCase();
    const role = req.body.role;

    if (role === 'manager' && req.v2User.role !== 'admin') {
      return fail(res, 403, 'access_denied', 'Only admins can create manager accounts');
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return fail(res, 409, 'email_taken', 'Email already registered');
    }

    const staffMember = await User.create({
      email,
      password: req.body.password,
      name: String(req.body.name || '').trim(),
      phone: req.body.phone ? String(req.body.phone).trim() : null,
      role
    });

    return ok(res, { staff: staffMember }, {}, 201);
  })
);

router.patch(
  '/staff/:id',
  [
    authV2,
    roleCheckV2('manager', 'admin'),
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('phone').optional({ nullable: true }).trim(),
    body('role').optional().isIn(STAFF_ROLES),
    body('isActive').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const staffMember = await User.findByPk(req.params.id);
    if (!staffMember || !STAFF_ROLES.includes(staffMember.role)) {
      return fail(res, 404, 'staff_not_found', 'Staff member not found');
    }

    if (req.v2User.role !== 'admin' && staffMember.role !== 'employee' && staffMember.id !== req.v2User.id) {
      return fail(res, 403, 'access_denied', 'Only admins can update other manager/admin accounts');
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'role') && req.v2User.role !== 'admin') {
      return fail(res, 403, 'access_denied', 'Only admins can change staff roles');
    }
    if (req.v2User.role !== 'admin' && staffMember.id === req.v2User.id && req.body.isActive === false) {
      return fail(res, 400, 'self_deactivate_forbidden', 'You cannot deactivate your own account');
    }

    const payload = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) payload.name = String(req.body.name || '').trim();
    if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) payload.phone = toNullableString(req.body.phone);
    if (Object.prototype.hasOwnProperty.call(req.body, 'role')) payload.role = req.body.role;
    if (Object.prototype.hasOwnProperty.call(req.body, 'isActive')) payload.isActive = req.body.isActive;
    if (!Object.keys(payload).length) return fail(res, 400, 'no_changes', 'No changes provided');

    await staffMember.update(payload);
    return ok(res, { staff: staffMember });
  })
);

module.exports = router;
