const express = require('express');
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const { body, param, query, validationResult } = require('express-validator');
const { Quote, User } = require('../../../models');
const asyncHandler = require('../../../utils/asyncHandler');
const { authV2 } = require('../middleware/auth');
const { roleCheckV2 } = require('../middleware/roles');
const { ok, fail } = require('../utils/response');
const { QUOTE_CONTACT_METHODS, QUOTE_PRIORITIES, QUOTE_PROJECT_TYPES, QUOTE_STATUSES } = require('../../../shared/contracts/v2');

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
const quoteIncludes = [
  { model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone', 'companyName'], required: false },
  { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email', 'phone', 'role'], required: false }
];

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
      include: quoteIncludes,
      order: [['createdAt', 'DESC']],
      distinct: true,
      limit: pageSize,
      offset
    });

    return ok(res, { quotes: rows }, { page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) });
  })
);

router.post(
  '/',
  [
    authV2,
    roleCheckV2('manager', 'admin'),
    body('projectType').isIn(QUOTE_PROJECT_TYPES),
    body('location').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('status').optional().isIn(QUOTE_STATUSES),
    body('priority').optional().isIn(QUOTE_PRIORITIES),
    body('contactMethod').optional({ nullable: true }).isIn(QUOTE_CONTACT_METHODS),
    body('clientId').optional({ nullable: true }).isUUID(),
    body('assignedManagerId').optional({ nullable: true }).isUUID()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const clientId = req.body.clientId || null;
    const guestName = toNullableString(req.body.guestName);
    const guestEmail = toNullableString(req.body.guestEmail);
    const guestPhone = toNullableString(req.body.guestPhone);
    const contactEmail = toNullableString(req.body.contactEmail);

    if (!clientId && !guestName && !guestEmail && !contactEmail) {
      return fail(res, 400, 'quote_contact_required', 'Guest quotes require at least a guest name or email');
    }

    const quote = await Quote.create({
      clientId,
      isGuest: !clientId,
      guestName,
      guestEmail,
      guestPhone,
      contactMethod: req.body.contactMethod || null,
      projectType: req.body.projectType,
      location: String(req.body.location || '').trim(),
      postcode: toNullableString(req.body.postcode),
      budgetRange: toNullableString(req.body.budgetRange),
      description: String(req.body.description || '').trim(),
      contactEmail,
      contactPhone: toNullableString(req.body.contactPhone),
      status: req.body.status || QUOTE_STATUSES[0],
      assignedManagerId: req.body.assignedManagerId || req.v2User.id,
      priority: req.body.priority || QUOTE_PRIORITIES[1]
    });

    const hydratedQuote = await Quote.findByPk(quote.id, { include: quoteIncludes });
    return ok(res, { quote: hydratedQuote || quote }, {}, 201);
  })
);

router.patch(
  '/:id',
  [
    authV2,
    roleCheckV2('manager', 'admin'),
    param('id').isUUID(),
    body('projectType').optional().isIn(QUOTE_PROJECT_TYPES),
    body('location').optional().trim().notEmpty(),
    body('description').optional().trim().notEmpty(),
    body('status').optional().isIn(QUOTE_STATUSES),
    body('priority').optional().isIn(QUOTE_PRIORITIES),
    body('contactMethod').optional({ nullable: true }).isIn(QUOTE_CONTACT_METHODS),
    body('clientId').optional({ nullable: true }).isUUID(),
    body('assignedManagerId').optional({ nullable: true }).isUUID()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const quote = await Quote.findByPk(req.params.id);
    if (!quote) return fail(res, 404, 'quote_not_found', 'Quote not found');

    const payload = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'projectType')) payload.projectType = req.body.projectType;
    if (Object.prototype.hasOwnProperty.call(req.body, 'location')) payload.location = String(req.body.location || '').trim();
    if (Object.prototype.hasOwnProperty.call(req.body, 'description')) payload.description = String(req.body.description || '').trim();
    if (req.body.status) payload.status = req.body.status;
    if (req.body.priority) payload.priority = req.body.priority;
    if (Object.prototype.hasOwnProperty.call(req.body, 'clientId')) payload.clientId = req.body.clientId || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'assignedManagerId')) payload.assignedManagerId = req.body.assignedManagerId || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'guestName')) payload.guestName = toNullableString(req.body.guestName);
    if (Object.prototype.hasOwnProperty.call(req.body, 'guestEmail')) payload.guestEmail = toNullableString(req.body.guestEmail);
    if (Object.prototype.hasOwnProperty.call(req.body, 'guestPhone')) payload.guestPhone = toNullableString(req.body.guestPhone);
    if (Object.prototype.hasOwnProperty.call(req.body, 'contactMethod')) payload.contactMethod = req.body.contactMethod || null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'postcode')) payload.postcode = toNullableString(req.body.postcode);
    if (Object.prototype.hasOwnProperty.call(req.body, 'budgetRange')) payload.budgetRange = toNullableString(req.body.budgetRange);
    if (Object.prototype.hasOwnProperty.call(req.body, 'contactEmail')) payload.contactEmail = toNullableString(req.body.contactEmail);
    if (Object.prototype.hasOwnProperty.call(req.body, 'contactPhone')) payload.contactPhone = toNullableString(req.body.contactPhone);
    if (!Object.keys(payload).length) return fail(res, 400, 'no_changes', 'No changes provided');

    const nextClientId = Object.prototype.hasOwnProperty.call(payload, 'clientId') ? payload.clientId : quote.clientId;
    const nextGuestName = Object.prototype.hasOwnProperty.call(payload, 'guestName') ? payload.guestName : quote.guestName;
    const nextGuestEmail = Object.prototype.hasOwnProperty.call(payload, 'guestEmail') ? payload.guestEmail : quote.guestEmail;
    const nextContactEmail = Object.prototype.hasOwnProperty.call(payload, 'contactEmail') ? payload.contactEmail : quote.contactEmail;
    if (!nextClientId && !nextGuestName && !nextGuestEmail && !nextContactEmail) {
      return fail(res, 400, 'quote_contact_required', 'Guest quotes require at least a guest name or email');
    }

    payload.isGuest = !nextClientId;

    await quote.update(payload);
    const hydratedQuote = await Quote.findByPk(quote.id, { include: quoteIncludes });
    return ok(res, { quote: hydratedQuote || quote });
  })
);

module.exports = router;
