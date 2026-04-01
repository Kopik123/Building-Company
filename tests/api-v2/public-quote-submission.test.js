const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const clientId = '33333333-3333-4333-8333-333333333333';
const quoteId = '44444444-4444-4444-8444-444444444444';

const createStubs = () => {
  const createdQuotes = [];
  const createdClaims = [];
  const notifications = [];
  const quoteStore = new Map();
  const users = {
    [clientId]: {
      id: clientId,
      role: 'client',
      email: 'client@example.com',
      phone: '+44123456789',
      name: 'Client Example',
      isActive: true
    }
  };

  return {
    createdQuotes,
    createdClaims,
    notifications,
    models: {
      User: {
        async findAll() {
          return [{ id: 'manager-1', role: 'manager', isActive: true }];
        },
        async findByPk(id) {
          return users[id] || null;
        }
      },
      Quote: {
        async create(payload) {
          const quote = {
            id: quoteId,
            status: 'pending',
            ...payload,
            async update(updatePayload) {
              Object.assign(this, updatePayload);
              return this;
            }
          };
          createdQuotes.push(quote);
          quoteStore.set(quote.id, quote);
          return quote;
        },
        async findOne({ where = {} }) {
          const quote = quoteStore.get(where.id) || createdQuotes.find((entry) => entry.publicToken === where.publicToken);
          if (!quote) return null;
          if (typeof where.isGuest !== 'undefined' && Boolean(quote.isGuest) !== Boolean(where.isGuest)) return null;
          return quote;
        },
        async findByPk(id) {
          return quoteStore.get(id) || null;
        }
      },
      QuoteClaimToken: {
        async destroy() {
          createdClaims.length = 0;
        },
        async create(payload) {
          const claim = {
            ...payload,
            attempts: payload.attempts ?? 0,
            async update(updatePayload) {
              Object.assign(this, updatePayload);
              return this;
            }
          };
          createdClaims.push(claim);
          return claim;
        },
        async findOne({ where = {} }) {
          return createdClaims.find((claim) => claim.quoteId === where.quoteId && claim.token === where.token && claim.usedAt == null) || null;
        }
      },
      Notification: {
        async bulkCreate(payload) {
          notifications.push(...payload);
          return payload;
        },
        async create(payload) {
          notifications.push(payload);
          return payload;
        }
      }
    }
  };
};

test.afterEach(() => {
  mock.stopAll();
});

test('guest quote submission returns onscreen claim code data', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);

  const route = loadRoute('routes/quotes.js');
  const app = buildExpressApp('/api/quotes', route);

  const response = await request(app)
    .post('/api/quotes/guest')
    .send({
      guestName: 'Guest User',
      guestEmail: 'guest@example.com',
      projectType: 'bathroom',
      description: 'Need a bathroom renovation.',
      location: 'Manchester'
    })
    .expect(201);

  assert.equal(response.body?.quoteId, quoteId);
  assert.equal(typeof response.body?.claimCode, 'string');
  assert.equal(response.body?.claimCode?.length, 8);
  assert.equal(response.body?.claimCodeDeliveryMode, 'onscreen');
  assert.equal(String(response.body?.claimCodeWarning || '').includes('Save'), true);
  assert.equal(stubs.createdClaims.length, 1);
  assert.equal(stubs.createdClaims[0].code, response.body.claimCode);
});

test('authenticated quote submission links directly to the signed-in account', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);

  const route = loadRoute('routes/quotes.js');
  const app = buildExpressApp('/api/quotes', route);
  const token = signAccessToken(clientId, 'client');

  const response = await request(app)
    .post('/api/quotes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      projectType: 'kitchen',
      description: 'Kitchen refurbishment.',
      location: 'Stockport'
    })
    .expect(201);

  assert.equal(response.body?.clientId, clientId);
  assert.equal(response.body?.message, 'Quote added to your account.');
  assert.equal(stubs.createdQuotes[0].clientId, clientId);
  assert.equal(stubs.createdQuotes[0].isGuest, false);
});

test('guest claim request returns the code onscreen instead of delivery metadata only', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);

  const route = loadRoute('routes/quotes.js');
  const app = buildExpressApp('/api/quotes', route);

  await request(app)
    .post('/api/quotes/guest')
    .send({
      guestName: 'Guest User',
      guestPhone: '+44123456789',
      projectType: 'bathroom',
      description: 'Need a bathroom renovation.',
      location: 'Manchester'
    })
    .expect(201);

  const response = await request(app)
    .post(`/api/quotes/guest/${quoteId}/claim/request`)
    .send({
      channel: 'phone',
      guestPhone: '+44123456789'
    })
    .expect(200);

  assert.equal(typeof response.body?.claimCode, 'string');
  assert.equal(response.body?.claimCodeDeliveryMode, 'onscreen');
  assert.equal(String(response.body?.claimCodeWarning || '').includes('valid for 15 minutes'), true);
});

test('authenticated user can confirm a guest quote claim with the onscreen code', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);

  const route = loadRoute('routes/quotes.js');
  const app = buildExpressApp('/api/quotes', route);
  const token = signAccessToken(clientId, 'client');

  const createResponse = await request(app)
    .post('/api/quotes/guest')
    .send({
      guestName: 'Guest User',
      guestEmail: 'guest@example.com',
      projectType: 'bathroom',
      description: 'Need a bathroom renovation.',
      location: 'Manchester'
    })
    .expect(201);

  const response = await request(app)
    .post(`/api/quotes/guest/${quoteId}/claim/confirm`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      claimToken: createResponse.body.claimToken,
      claimCode: createResponse.body.claimCode
    })
    .expect(200);

  assert.equal(response.body?.quoteId, quoteId);
  assert.equal(response.body?.clientId, clientId);
  assert.equal(stubs.createdQuotes[0].clientId, clientId);
  assert.equal(stubs.createdQuotes[0].isGuest, false);
  assert.equal(stubs.createdClaims[0].usedAt instanceof Date, true);
});
