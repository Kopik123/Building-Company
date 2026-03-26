const express = require('express');
const legacyGuestQuotesRouter = require('../../../routes/quotes');

const router = express.Router();

const delegateToLegacyGuestQuotes = (buildLegacyPath) => (req, res, next) => {
  const originalUrl = req.url;
  req.url = buildLegacyPath(req);
  legacyGuestQuotesRouter.handle(req, res, (error) => {
    req.url = originalUrl;
    next(error);
  });
};

router.post('/', delegateToLegacyGuestQuotes(() => '/guest'));
router.get('/:publicToken', delegateToLegacyGuestQuotes((req) => `/guest/${encodeURIComponent(req.params.publicToken)}`));
router.post('/:publicToken/attachments', delegateToLegacyGuestQuotes((req) => `/guest/${encodeURIComponent(req.params.publicToken)}/attachments`));
router.post('/:id/claim/request', delegateToLegacyGuestQuotes((req) => `/guest/${encodeURIComponent(req.params.id)}/claim/request`));
router.post('/:id/claim/confirm', delegateToLegacyGuestQuotes((req) => `/guest/${encodeURIComponent(req.params.id)}/claim/confirm`));

module.exports = router;
