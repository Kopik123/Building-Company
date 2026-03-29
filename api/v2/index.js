const express = require('express');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const crmRoutes = require('./routes/crm');
const projectsRoutes = require('./routes/projects');
const quotesRoutes = require('./routes/quotes');
const newQuotesRoutes = require('./routes/new-quotes');
const messagesRoutes = require('./routes/messages');
const notificationsRoutes = require('./routes/notifications');
const inventoryRoutes = require('./routes/inventory');
const publicRoutes = require('./routes/public');
const overviewRoutes = require('./routes/overview');
const activityRoutes = require('./routes/activity');
const publicQuoteRoutes = require('./routes/public-quotes');
const { fail } = require('./utils/response');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    data: {
      status: 'ok',
      version: 'v2'
    },
    meta: {}
  });
});

router.use('/auth', authRoutes);
router.use('/devices', deviceRoutes);
router.use('/crm', crmRoutes);
router.use('/projects', projectsRoutes);
router.use('/quotes', quotesRoutes);
router.use('/new-quotes', newQuotesRoutes);
router.use('/messages', messagesRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/overview', overviewRoutes);
router.use('/activity', activityRoutes);
router.use('/public/quotes', publicQuoteRoutes);

// Public endpoints mounted on v2 root:
// /api/v2/services, /api/v2/gallery/projects, /api/v2/gallery/services
router.use('/', publicRoutes);

router.use((req, res) => fail(res, 404, 'route_not_found', 'API v2 route not found'));

router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = Number(error?.statusCode) || 500;
  if (status >= 500) {
    console.error('Unhandled v2 error:', error);
  }
  return fail(
    res,
    status,
    status >= 500 ? 'internal_error' : 'request_failed',
    status >= 500 ? 'Internal server error' : (error?.message || 'Request failed')
  );
});

module.exports = router;
