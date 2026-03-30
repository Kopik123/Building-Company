const assert = require('node:assert/strict');
const test = require('node:test');

const mobileContracts = require('../../packages/mobile-contracts');
const mobileCore = require('../../packages/mobile-core');

test('mobile contracts allow only client roles inside the client app variant', () => {
  assert.equal(mobileContracts.isRoleAllowedForVariant('client', 'client'), true);
  assert.equal(mobileContracts.isRoleAllowedForVariant('manager', 'client'), false);
  assert.equal(mobileContracts.resolveAppVariantForRole('manager'), 'company');
});

test('mobile session normalization supports v2 auth payloads', () => {
  const session = mobileContracts.normalizeMobileSession({
    user: {
      id: 'client-1',
      name: 'Client',
      email: 'client@example.com',
      role: 'client',
      phone: null,
      companyName: null,
      crmLifecycleStatus: 'lead',
      crmLifecycleUpdatedAt: null,
      isActive: true,
      createdAt: null,
      updatedAt: null
    },
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    legacyToken: 'legacy-token'
  });

  assert.equal(session.user.role, 'client');
  assert.equal(session.accessToken, 'access-token');
  assert.equal(session.legacyToken, 'legacy-token');
});

test('mobile core builds portable quote payloads and push registration metadata', () => {
  const form = mobileCore.createDefaultQuoteForm();
  form.name = 'Client User';
  form.email = 'client@example.com';
  form.phone = '07000000000';
  form.projectType = 'kitchen';
  form.budgetRange = '£12,000-£20,000';
  form.location = 'Manchester and the North West';
  form.summary = 'Need a new kitchen layout.';
  form.mustHaves = 'Island and storage.';
  form.constraints = 'Family home.';
  form.propertyType = 'semi_detached';
  form.planningStage = 'ready_to_start';
  form.targetStartWindow = 'within_3_months';
  form.roomsInvolved = ['kitchen', 'utility'];
  form.priorities = ['finish_quality', 'storage'];

  const payload = mobileCore.buildPublicQuotePayload(form);
  assert.equal(payload.projectType, 'kitchen');
  assert.equal(payload.proposalDetails.projectScope.propertyType, 'semi_detached');
  assert.equal(payload.proposalDetails.priorities.length, 2);

  const pushPayload = mobileCore.buildPushRegistrationPayload({
    userRole: 'manager',
    platform: 'android',
    pushToken: 'ExponentPushToken[token-1234567890]',
    deviceName: 'Pixel Test',
    appVersion: '1.0.0'
  });

  assert.equal(pushPayload.appVariant, 'company');
  assert.equal(pushPayload.provider, 'expo');
});
