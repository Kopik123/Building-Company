const express = require('express');
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const { body, param, query, validationResult } = require('express-validator');
const { Quote, User } = require('../../../models');
const asyncHandler = require('../../../utils/asyncHandler');
const { authV2 } = require('../middleware/auth');
const { roleCheckV2 } = require('../middleware/roles');
const { ok, fail } = require('../utils/response');
const { QUOTE_PRIORITIES, QUOTE_STATUSES } = require('../../../shared/contracts/v2');

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

router.get(
  '/',
  [
    authV2,
    roleCheckV2('client', 'employee', 'manager', 'admin'),
    query('status').optional().isIn(QUOTE_STATUSES),
    query('priority').optional().isIn(QUOTE_PRIORITIES),
    query('q').optional().trim().isLength({ min: 1, max: 255 }),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const where = {};
    if (req.v2User.role === 'client') {
      where.clientId = req.v2User.id;
    }
    if (req.query.status) where.status = req.query.status;
    if (req.query.priority) where.priority = req.query.priority;
    if (req.query.q) {
      const needle = `%${escapeLike(String(req.query.q).trim().toLowerCase())}%`;
      where[Op.or] = [
        sqlWhere(fn('LOWER', col('Quote.guestName')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('Quote.guestEmail')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('Quote.location')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('client.email')), { [Op.like]: needle }),
        sqlWhere(fn('LOWER', col('client.name')), { [Op.like]: needle })
      ];
    }

    const { page, pageSize, offset } = getPagination(req);
    const { rows, count } = await Quote.findAndCountAll({
      where,
      include: [
        { model: User, as: 'client', attributes: ['id', 'name', 'email'], required: false },
        { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'], required: false }
      ],
      order: [['createdAt', 'DESC']],
      distinct: true,
      limit: pageSize,
      offset
    });

    return ok(res, { quotes: rows }, { page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) });
  })
);

router.patch(
  '/:id',
  [
    authV2,
    roleCheckV2('manager', 'admin'),
    param('id').isUUID(),
    body('status').optional().isIn(QUOTE_STATUSES),
    body('priority').optional().isIn(QUOTE_PRIORITIES)
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const quote = await Quote.findByPk(req.params.id);
    if (!quote) return fail(res, 404, 'quote_not_found', 'Quote not found');

    const payload = {};
    if (req.body.status) payload.status = req.body.status;
    if (req.body.priority) payload.priority = req.body.priority;
    if (!Object.keys(payload).length) return fail(res, 400, 'no_changes', 'No changes provided');

    await quote.update(payload);
    return ok(res, { quote });
  })
);

module.exports = router;
