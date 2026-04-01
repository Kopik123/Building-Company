'use strict';

const { buildExpressApp, loadRoute, mockModels, signAccessToken } = require('./_helpers');

const managerId = '11111111-1111-4111-8111-111111111111';
const clientId = '22222222-2222-4222-8222-222222222222';
const quoteId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const makeManagerUsers = () => ({
  [managerId]: { id: managerId, role: 'manager', email: 'manager@example.com', name: 'Manager User', isActive: true },
  [clientId]: { id: clientId, role: 'client', email: 'client@example.com', name: 'Client User', isActive: true }
});

/**
 * Empty stubs for model properties that a test does not exercise directly.
 * Spread into the models object of any manager-route createStubs() call.
 */
const emptyManagerModelStubs = () => ({
  GroupMessage: {},
  InboxMessage: {},
  QuoteMessage: {},
  QuoteClaimToken: {},
  SessionRefreshToken: {},
  DevicePushToken: {},
  sequelize: {}
});

/**
 * Mount the manager route and return a supertest-ready app and a pre-signed
 * manager token so individual test cases can call request(app) directly.
 */
const buildManagerApp = (stubs) => {
  mockModels(stubs.models);
  const route = loadRoute('routes/manager.js');
  const app = buildExpressApp('/api/manager', route);
  const token = signAccessToken(managerId, 'manager');
  return { app, token };
};

module.exports = {
  managerId,
  clientId,
  quoteId,
  makeManagerUsers,
  emptyManagerModelStubs,
  buildManagerApp
};
