const express = require('express');
const { auth } = require('../../../middleware/auth');
const { registerPublicGuestQuoteRoutes } = require('../../../utils/publicGuestQuoteRoutes');

const router = express.Router();

registerPublicGuestQuoteRoutes(router, { auth });

module.exports = router;
