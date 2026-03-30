const express = require('express');
const { createValidatedHandler, findByPkOrRespond } = require('./route-helpers');

module.exports = function createQuoteRoutes({
  param,
  query,
  body,
  validationResult,
  asyncHandler,
  managerGuard,
  Quote,
  User,
  GroupThread,
  GroupMember,
  Notification,
  Op,
  fn,
  col,
  sqlWhere,
  MAX_PAGE_SIZE,
  getPagination,
  paginationDto,
  escapeLike
}) {
  const router = express.Router();
  const withValidation = createValidatedHandler({ validationResult, asyncHandler });
  const quoteInclude = [
    { model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone'] },
    { model: User, as: 'assignedManager', attributes: ['id', 'name', 'email'] }
  ];

  router.post(
    '/quotes/:id/accept',
    [...managerGuard, param('id').isUUID()],
    withValidation(async (req, res) => {
      const quote = await findByPkOrRespond(Quote, req.params.id, res, {
        message: 'Quote not found',
        include: [{ model: User, as: 'client', attributes: ['id', 'name', 'email'] }]
      });
      if (!quote) return;

      if (quote.assignedManagerId) {
        return res.status(409).json({ error: 'Quote is already assigned to a manager' });
      }

      await quote.update({
        assignedManagerId: req.user.id,
        status: 'in_progress'
      });

      // Create a group chat for this project
      const projectName = `${quote.projectType} - ${quote.guestName || (quote.client && quote.client.name) || 'Project'} (${quote.postcode || quote.location})`;

      const groupThread = await GroupThread.create({
        name: projectName,
        quoteId: quote.id,
        createdBy: req.user.id
      });

      // Add the manager to the group
      await GroupMember.create({
        groupThreadId: groupThread.id,
        userId: req.user.id,
        role: 'admin'
      });

      // Add the client to the group (if they have an account)
      if (quote.clientId) {
        await GroupMember.create({
          groupThreadId: groupThread.id,
          userId: quote.clientId,
          role: 'member'
        });
      }

      // Notify managers that this quote was accepted
      const otherManagers = await User.findAll({
        where: { role: { [Op.in]: ['manager', 'admin'] }, isActive: true, id: { [Op.ne]: req.user.id } }
      });

      if (otherManagers.length) {
        await Notification.bulkCreate(
          otherManagers.map((m) => ({
            userId: m.id,
            type: 'quote_accepted',
            title: `Quote accepted by ${req.user.name}`,
            body: `Manager ${req.user.name} accepted the quote for "${projectName}".`,
            quoteId: quote.id,
            data: { quoteId: quote.id, managerId: req.user.id, groupThreadId: groupThread.id }
          }))
        );
      }

      return res.status(201).json({ quote, groupThread });
    })
  );

  router.get(
    '/quotes',
    [
        ...managerGuard,
        query('status').optional().isIn(['pending', 'in_progress', 'responded', 'closed']),
        query('priority').optional().isIn(['low', 'medium', 'high']),
        query('projectType').optional().isIn(['bathroom', 'kitchen', 'interior', 'tiling', 'extension', 'joinery', 'rendering', 'decorating', 'other']),
        query('q').optional().trim().isLength({ min: 1, max: 255 }),
        query('page').optional().isInt({ min: 1 }).toInt(),
        query('pageSize').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).toInt()
      ],
    withValidation(async (req, res) => {
      const where = {};
      if (req.query.status) where.status = req.query.status;
      if (req.query.priority) where.priority = req.query.priority;
      if (req.query.projectType) where.projectType = req.query.projectType;
      if (req.query.q) {
        const needle = `%${escapeLike(String(req.query.q || '').trim().toLowerCase())}%`;
        where[Op.or] = [
          sqlWhere(fn('LOWER', col('guestName')), { [Op.like]: needle }),
          sqlWhere(fn('LOWER', col('guestEmail')), { [Op.like]: needle }),
          sqlWhere(fn('LOWER', col('location')), { [Op.like]: needle }),
          sqlWhere(fn('LOWER', col('postcode')), { [Op.like]: needle }),
          sqlWhere(fn('LOWER', col('client.email')), { [Op.like]: needle }),
          sqlWhere(fn('LOWER', col('client.name')), { [Op.like]: needle })
        ];
      }

      const { page, pageSize, offset } = getPagination(req);
      const { rows, count } = await Quote.findAndCountAll({
        where,
        include: quoteInclude,
        order: [['createdAt', 'DESC']],
        distinct: true,
        limit: pageSize,
        offset
      });

      return res.json({
        quotes: rows,
        pagination: paginationDto(page, pageSize, count)
      });
    })
  );

  router.get(
    '/quotes/:id',
    [...managerGuard, param('id').isUUID()],
    withValidation(async (req, res) => {
      const quote = await findByPkOrRespond(Quote, req.params.id, res, {
        message: 'Quote not found',
        include: quoteInclude
      });
      if (!quote) return;

      return res.json({ quote });
    })
  );

  router.patch(
    '/quotes/:id',
    [
      ...managerGuard,
      param('id').isUUID(),
      body('status').optional().isIn(['pending', 'in_progress', 'responded', 'closed']),
      body('priority').optional().isIn(['low', 'medium', 'high'])
    ],
    withValidation(async (req, res) => {
      const quote = await findByPkOrRespond(Quote, req.params.id, res, { message: 'Quote not found' });
      if (!quote) return;

      const payload = {};
      if (typeof req.body.status !== 'undefined') payload.status = req.body.status;
      if (typeof req.body.priority !== 'undefined') payload.priority = req.body.priority;

      if (!Object.keys(payload).length) {
        return res.status(400).json({ error: 'No changes provided' });
      }

      await quote.update(payload);
      return res.json({ quote });
    })
  );

  return router;
};
