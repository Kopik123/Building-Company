const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { DevicePushToken } = require('../../../models');
const asyncHandler = require('../../../utils/asyncHandler');
const { authV2 } = require('../middleware/auth');
const { ok, fail } = require('../utils/response');

const router = express.Router();

router.post(
  '/push-token',
  [
    authV2,
    body('platform').isIn(['android', 'ios', 'web']),
    body('provider').optional().isIn(['fcm', 'apns', 'webpush']),
    body('pushToken').isString().isLength({ min: 16 }),
    body('deviceId').optional().isString().isLength({ max: 255 }),
    body('appVersion').optional().isString().isLength({ max: 80 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const payload = {
      userId: req.v2User.id,
      platform: String(req.body.platform),
      provider: String(req.body.provider || 'fcm'),
      pushToken: String(req.body.pushToken),
      deviceId: req.body.deviceId ? String(req.body.deviceId) : null,
      appVersion: req.body.appVersion ? String(req.body.appVersion) : null,
      lastSeenAt: new Date()
    };

    const existing = await DevicePushToken.findOne({ where: { pushToken: payload.pushToken } });
    if (existing) {
      await existing.update(payload);
      return ok(res, { devicePushToken: existing });
    }

    const devicePushToken = await DevicePushToken.create(payload);
    return ok(res, { devicePushToken }, {}, 201);
  })
);

router.delete(
  '/push-token/:id',
  [authV2, param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, 400, 'validation_failed', 'Validation failed', errors.array());
    }

    const devicePushToken = await DevicePushToken.findOne({
      where: { id: req.params.id, userId: req.v2User.id }
    });
    if (!devicePushToken) {
      return fail(res, 404, 'push_token_not_found', 'Push token not found');
    }

    await devicePushToken.destroy();
    return ok(res, { deleted: true });
  })
);

module.exports = router;
