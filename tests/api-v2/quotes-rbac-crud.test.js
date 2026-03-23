const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const createQuoteStubs = () => {
  const users = {
    '11111111-1111-4111-8111-111111111111': {
      id: '11111111-1111-4111-8111-111111111111',
      role: 'manager',
      email: 'manager@example.com',
      name: 'Manager',
      phone: '+44 7000 000 001',
      isActive: true
    },
    '22222222-2222-4222-8222-222222222222': {
      id: '22222222-2222-4222-8222-222222222222',
      role: 'admin',
      email: 'admin@example.com',
      name: 'Admin',
      phone: '+44 7000 000 002',
      isActive: true
    },
    '33333333-3333-4333-8333-333333333333': {
      id: '33333333-3333-4333-8333-333333333333',
      role: 'client',
      email: 'client@example.com',
      name: 'Client',
      phone: '+44 7000 000 003',
      companyName: 'Client Co',
      isActive: true
    }
  };

  const quotes = [];

  const hydrateQuote = (quote) => {
    if (!quote) return null;
    quote.client = quote.clientId ? users[quote.clientId] || null : null;
    quote.assignedManager = quote.assignedManagerId ? users[quote.assignedManagerId] || null : null;
    return quote;
  };

  const attachQuoteMethods = (quote) => ({
    ...quote,
    async update(payload) {
      Object.assign(this, payload, { updatedAt: '2026-03-23T20:10:00Z' });
      return this;
    },
    toJSON() {
      return {
        ...this,
        client: this.client || null,
        assignedManager: this.assignedManager || null
      };
    }
  });

  const Quote = {
    async findAndCountAll({ where = {} }) {
      const rows = quotes
        .filter((quote) => {
          if (where.clientId && quote.clientId !== where.clientId) return false;
          if (where.status && quote.status !== where.status) return false;
          if (where.priority && quote.priority !== where.priority) return false;
          return true;
        })
        .map((quote) => hydrateQuote(quote));
      return { rows, count: rows.length };
    },
    async findByPk(id) {
      return hydrateQuote(quotes.find((quote) => quote.id === id) || null);
    },
    async create(payload) {
      const created = attachQuoteMethods({
        id: `60000000-0000-4000-8000-${String(quotes.length + 1).padStart(12, '0')}`,
        clientId: payload.clientId || null,
        isGuest: typeof payload.isGuest === 'boolean' ? payload.isGuest : !payload.clientId,
        guestName: payload.guestName || null,
        guestEmail: payload.guestEmail || null,
        guestPhone: payload.guestPhone || null,
        contactMethod: payload.contactMethod || null,
        projectType: payload.projectType,
        location: payload.location,
        postcode: payload.postcode || null,
        budgetRange: payload.budgetRange || null,
        description: payload.description,
        contactEmail: payload.contactEmail || null,
        contactPhone: payload.contactPhone || null,
        status: payload.status || 'pending',
        assignedManagerId: payload.assignedManagerId || null,
        priority: payload.priority || 'medium',
        createdAt: '2026-03-23T20:00:00Z',
        updatedAt: '2026-03-23T20:00:00Z',
        client: null,
        assignedManager: null
      });
      quotes.push(created);
      return hydrateQuote(created);
    }
  };

  const User = {
    async findByPk(id) {
      return users[id] || null;
    }
  };

  return {
    quotes,
    models: {
      Quote,
      User
    }
  };
};

test.afterEach(() => {
  mock.stopAll();
});

test('quotes v2 enforces RBAC and supports manager create/update flows', async () => {
  const stubs = createQuoteStubs();
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/quotes.js');
  const app = buildExpressApp('/api/v2/quotes', route);

  const managerToken = signAccessToken('11111111-1111-4111-8111-111111111111', 'manager');
  const clientToken = signAccessToken('33333333-3333-4333-8333-333333333333', 'client');

  await request(app)
    .post('/api/v2/quotes')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({
      projectType: 'bathroom',
      location: 'Manchester',
      description: 'Client should not create through manager route.'
    })
    .expect(403);

  const guestCreateResponse = await request(app)
    .post('/api/v2/quotes')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      projectType: 'bathroom',
      location: 'Manchester',
      description: 'Luxury guest enquiry for a marble bathroom.',
      guestEmail: 'guest@example.com',
      priority: 'high'
    })
    .expect(201);

  assert.equal(guestCreateResponse.body?.data?.quote?.isGuest, true);
  assert.equal(guestCreateResponse.body?.data?.quote?.assignedManagerId, '11111111-1111-4111-8111-111111111111');

  const clientCreateResponse = await request(app)
    .post('/api/v2/quotes')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      projectType: 'kitchen',
      location: 'Stockport',
      description: 'Client-linked kitchen refurbishment.',
      clientId: '33333333-3333-4333-8333-333333333333',
      budgetRange: '60k-80k'
    })
    .expect(201);

  const clientQuoteId = clientCreateResponse.body?.data?.quote?.id;
  assert.ok(clientQuoteId);
  assert.equal(clientCreateResponse.body?.data?.quote?.isGuest, false);

  const clientListResponse = await request(app)
    .get('/api/v2/quotes')
    .set('Authorization', `Bearer ${clientToken}`)
    .expect(200);

  assert.equal(clientListResponse.body?.data?.quotes?.length, 1);
  assert.equal(clientListResponse.body?.data?.quotes?.[0]?.id, clientQuoteId);

  const updateResponse = await request(app)
    .patch(`/api/v2/quotes/${clientQuoteId}`)
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      status: 'responded',
      priority: 'low',
      location: 'Wilmslow'
    })
    .expect(200);

  assert.equal(updateResponse.body?.data?.quote?.status, 'responded');
  assert.equal(updateResponse.body?.data?.quote?.location, 'Wilmslow');
});
