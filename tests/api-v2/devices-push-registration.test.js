const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const createUser = ({ id, email, role }) => ({
  id,
  email,
  role,
  isActive: true
});

const createDeviceStubs = () => {
  const users = {
    client: createUser({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'client@example.com',
      role: 'client'
    }),
    manager: createUser({
      id: '22222222-2222-4222-8222-222222222222',
      email: 'manager@example.com',
      role: 'manager'
    })
  };

  const devicePushTokens = [];

  const DevicePushToken = {
    async findOne({ where }) {
      return devicePushTokens.find((item) => item.pushToken === where.pushToken) || null;
    },
    async create(payload) {
      const row = {
        id: `00000000-0000-4000-8000-${String(devicePushTokens.length + 1).padStart(12, '0')}`,
        ...payload,
        async update(updatePayload) {
          Object.assign(this, updatePayload);
          return this;
        },
        async destroy() {
          const index = devicePushTokens.findIndex((item) => item.id === this.id);
          if (index >= 0) devicePushTokens.splice(index, 1);
        }
      };
      devicePushTokens.push(row);
      return row;
    }
  };

  return {
    users,
    devicePushTokens,
    models: {
      User: {
        async findByPk(id) {
          return Object.values(users).find((user) => user.id === id) || null;
        }
      },
      DevicePushToken: {
        ...DevicePushToken,
        async findOne({ where }) {
          if (where?.id && where?.userId) {
            return devicePushTokens.find((item) => item.id === where.id && item.userId === where.userId) || null;
          }
          return DevicePushToken.findOne({ where });
        }
      }
    }
  };
};

test.afterEach(() => {
  mock.stopAll();
});

test('device push registration defaults client appVariant and expo provider for mobile clients', { concurrency: false }, async () => {
  const stubs = createDeviceStubs();
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/devices.js');
  const app = buildExpressApp('/api/v2/devices', route);
  const accessToken = signAccessToken(stubs.users.client.id, stubs.users.client.role);

  const response = await request(app)
    .post('/api/v2/devices/push-token')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      platform: 'android',
      pushToken: 'ExponentPushToken[client-device-token-1234567890]',
      deviceId: 'client-device-1',
      deviceName: 'Pixel 8 Pro',
      appVersion: '1.0.0'
    })
    .expect(201);

  assert.equal(response.body?.data?.devicePushToken?.appVariant, 'client');
  assert.equal(response.body?.data?.devicePushToken?.provider, 'expo');
  assert.equal(response.body?.data?.devicePushToken?.deviceName, 'Pixel 8 Pro');
});

test('device push registration accepts explicit company appVariant and supports delete by owner', { concurrency: false }, async () => {
  const stubs = createDeviceStubs();
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/devices.js');
  const app = buildExpressApp('/api/v2/devices', route);
  const accessToken = signAccessToken(stubs.users.manager.id, stubs.users.manager.role);

  const createResponse = await request(app)
    .post('/api/v2/devices/push-token')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      platform: 'android',
      provider: 'expo',
      appVariant: 'company',
      pushToken: 'ExponentPushToken[company-device-token-1234567890]',
      deviceId: 'company-device-1',
      appVersion: '1.2.0'
    })
    .expect(201);

  assert.equal(createResponse.body?.data?.devicePushToken?.appVariant, 'company');

  await request(app)
    .delete(`/api/v2/devices/push-token/${createResponse.body.data.devicePushToken.id}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  assert.equal(stubs.devicePushTokens.length, 0);
});
