const express = require('express');
const { Op } = require('sequelize');
const { auth, roleCheck } = require('../../middleware/auth');
const asyncHandler = require('../../utils/asyncHandler');
const SystemLog = require('../../models/SystemLog');

const VALID_CATEGORIES = ['site', 'database', 'user_action', 'visit', 'error'];
const LOG_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 200;

const adminGuard = [auth, roleCheck('admin')];

const router = express.Router();

router.get('/logs', adminGuard, asyncHandler(async (req, res) => {
  const rawCategory = String(req.query.category || '').toLowerCase();
  const category = VALID_CATEGORIES.includes(rawCategory) ? rawCategory : null;

  const rawLevel = String(req.query.level || '').toLowerCase();
  const validLevels = ['info', 'warn', 'error'];
  const level = validLevels.includes(rawLevel) ? rawLevel : null;

  const page = Math.max(1, parseInt(req.query.page, 10) > 0 ? parseInt(req.query.page, 10) : 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.pageSize, 10) > 0 ? parseInt(req.query.pageSize, 10) : LOG_PAGE_SIZE));

  const where = {};
  if (category) where.category = category;
  if (level) where.level = level;

  const before = req.query.before ? new Date(req.query.before) : null;
  if (before && !Number.isNaN(before.getTime())) {
    where.createdAt = { [Op.lt]: before };
  }

  const { count, rows } = await SystemLog.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return res.json({
    logs: rows.map((log) => ({
      id: log.id,
      category: log.category,
      level: log.level,
      message: log.message,
      meta: log.meta,
      userId: log.userId,
      ip: log.ip,
      method: log.method,
      path: log.path,
      statusCode: log.statusCode,
      createdAt: log.createdAt
    })),
    pagination: {
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize)
    }
  });
}));

module.exports = router;
