const express = require('express');
const { query, validationResult } = require('express-validator');
const { ServiceOffering } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get(
  '/services',
  [
    query('category').optional().isIn(['bathroom', 'kitchen', 'interior', 'outdoor', 'other']),
    query('featured').optional().isIn(['true', 'false', '1', '0'])
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const where = { showOnWebsite: true, isActive: true };
    if (req.query.category) where.category = req.query.category;
    if (typeof req.query.featured !== 'undefined') {
      const normalized = String(req.query.featured).toLowerCase();
      where.isFeatured = ['true', '1'].includes(normalized);
    }

    const services = await ServiceOffering.findAll({
      where,
      order: [['displayOrder', 'ASC'], ['createdAt', 'DESC']]
    });

    return res.json({ services });
  })
);

module.exports = router;
