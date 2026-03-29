const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { Op } = require('sequelize');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const createUserRecord = (payload) => {
  const state = {
    crmLifecycleStatus: 'lead',
    crmLifecycleUpdatedAt: null,
    ...payload
  };

  return {
    ...state,
    async update(updatePayload, options) {
      Object.assign(state, updatePayload);
      Object.assign(this, state);
      this.lastUpdateOptions = options || null;
      return this;
    },
    toJSON() {
      return { ...state };
    }
  };
};

const readOpValue = (candidate, symbol) => {
  if (!candidate || typeof candidate !== 'object') return undefined;
  if (Object.prototype.hasOwnProperty.call(candidate, symbol)) return candidate[symbol];
  const matchingSymbol = Object.getOwnPropertySymbols(candidate).find((entry) => entry === symbol);
  return matchingSymbol ? candidate[matchingSymbol] : undefined;
};

test.afterEach(() => {
  mock.stopAll();
});

test('new quote create route wraps staged quote creation side effects in one transaction', async () => {
  const transactionCalls = [];
  const createTransactions = [];
  const notificationTransactions = [];
  const activityTransactions = [];
  const users = {
    'client-1': createUserRecord({ id: 'client-1', role: 'client', email: 'client@example.com', name: 'Marta Client', phone: '07395448487', isActive: true }),
    'manager-1': createUserRecord({ id: 'manager-1', role: 'manager', email: 'manager@example.com', name: 'Daniel Manager', isActive: true }),
    'admin-1': createUserRecord({ id: 'admin-1', role: 'admin', email: 'admin@example.com', name: 'Alice Admin', isActive: true })
  };
  const newQuotes = [];

  mockModels({
    ActivityEvent: {
      async create(payload, options) {
        activityTransactions.push(options?.transaction || null);
        return payload;
      }
    },
    GroupMember: {},
    GroupThread: {},
    NewQuote: {
      async count() {
        return 0;
      },
      async create(payload, options) {
        createTransactions.push(options?.transaction || null);
        const created = {
          id: '90000000-0000-4000-8000-000000000201',
          createdAt: '2026-03-30T12:00:00Z',
          updatedAt: '2026-03-30T12:00:00Z',
          ...payload,
          async destroy() {},
          async update() {},
          toJSON() {
            return { ...this, client: users['client-1'].toJSON() };
          }
        };
        newQuotes.push(created);
        return created;
      },
      async findByPk(id) {
        const found = newQuotes.find((entry) => entry.id === id) || null;
        if (!found) return null;
        return {
          ...found,
          client: users['client-1'],
          toJSON() {
            return { ...found, client: users['client-1'].toJSON() };
          }
        };
      },
      async findAndCountAll() {
        return { rows: [], count: 0 };
      }
    },
    Notification: {
      async bulkCreate(rows, options) {
        notificationTransactions.push(options?.transaction || null);
        return rows;
      }
    },
    Project: {},
    ProjectMedia: {},
    User: {
      async findByPk(id) {
        return users[id] || null;
      },
      async findAll({ where = {}, transaction } = {}) {
        notificationTransactions.push(transaction || null);
        const allowedRoles = readOpValue(where.role, Op.in);
        return Object.values(users).filter((user) => {
          if (Array.isArray(allowedRoles) && !allowedRoles.includes(user.role)) return false;
          if (Object.prototype.hasOwnProperty.call(where, 'isActive') && user.isActive !== where.isActive) return false;
          return true;
        });
      }
    },
    sequelize: {
      async transaction(handler) {
        const transaction = { id: `tx-${transactionCalls.length + 1}` };
        transactionCalls.push(transaction);
        return handler(transaction);
      }
    }
  });

  const route = loadRoute('api/v2/routes/new-quotes.js');
  const app = buildExpressApp('/api/v2/new-quotes', route);
  const clientToken = signAccessToken('client-1', 'client');

  const response = await request(app)
    .post('/api/v2/new-quotes')
    .set('Authorization', `Bearer ${clientToken}`)
    .field('projectType', 'kitchen')
    .field('location', 'Manchester')
    .field('postcode', 'M20 2AB')
    .field('budgetRange', 'Â£8,000-Â£12,000')
    .field('description', 'Kitchen refresh with pantry storage.')
    .field('proposalDetails', JSON.stringify({
      logistics: { location: 'Manchester', postcode: 'M20 2AB' },
      commercial: { budgetRange: 'Â£8,000-Â£12,000' },
      brief: { summary: 'Kitchen refresh with pantry storage.' }
    }))
    .expect(201);

  assert.ok(response.body?.data?.newQuote?.id);
  assert.equal(transactionCalls.length, 1);
  assert.equal(createTransactions[0]?.id, 'tx-1');
  assert.equal(activityTransactions[0]?.id, 'tx-1');
  assert.equal(notificationTransactions.some((entry) => entry && entry.id === 'tx-1'), true);
  assert.equal(users['client-1'].crmLifecycleStatus, 'quoted');
});
