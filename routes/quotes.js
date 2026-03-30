const express = require('express');
const { auth } = require('../middleware/auth');
const { registerPublicGuestQuoteRoutes } = require('../utils/publicGuestQuoteRoutes');

const router = express.Router();

registerPublicGuestQuoteRoutes(router, {
  auth,
  paths: {
    create: '/guest',
    preview: '/guest/:publicToken',
    attachments: '/guest/:publicToken/attachments',
    claimRequest: '/guest/:id/claim/request',
    claimConfirm: '/guest/:id/claim/confirm'
  }
});

module.exports = router;
