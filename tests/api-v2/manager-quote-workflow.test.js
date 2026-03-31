const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const managerId = '11111111-1111-4111-8111-111111111111';
const clientId = '22222222-2222-4222-8222-222222222222';
const quoteId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const createQuote = () => ({
  id: quoteId,
  projectType: 'bathroom',
  guestName: 'Jan Test',
  location: 'Manchester',
  postcode: 'M1 1AA',
  description: 'Need a full bathroom renovation',
  clientId,
  clientDecisionStatus: 'pending',
  workflowStatus: 'new',
  status: 'pending',
  assignedManagerId: null,
  archivedAt: null,
  client: { id: clientId, name: 'Client User', email: 'client@example.com' },
  async update(payload) {
    Object.assign(this, payload);
    return this;
  }
});

const createStubs = () => {
  const quote = createQuote();
  const createdProjects = [];
  const clientNotifications = [];

  const users = {
    [managerId]: { id: managerId, role: 'manager', email: 'manager@example.com', name: 'Manager User', isActive: true },
    [clientId]: { id: clientId, role: 'client', email: 'client@example.com', name: 'Client User', isActive: true }
  };

  return {
    quote,
    createdProjects,
    clientNotifications,
    models: {
      User: {
        async findByPk(id) {
          return users[id] || null;
        },
        async findAll() {
          return [];
        }
      },
      Quote: {
        async findByPk(id) {
          return id === quoteId ? quote : null;
        },
        async findAndCountAll() {
          return { rows: [quote], count: 1 };
        }
      },
      GroupThread: {
        async create(payload) {
          return { id: 'group-1', ...payload };
        }
      },
      GroupMember: {
        async create(payload) {
          return payload;
        }
      },
      InboxThread: {
        async findOrCreate() {
          return [{ id: 'inbox-1', subject: 'Quote discussion', quoteId }];
        }
      },
      Notification: {
        async bulkCreate() {
          return [];
        },
        async create(payload) {
          clientNotifications.push(payload);
          return payload;
        }
      },
      Project: {
        async findAndCountAll() {
          return { rows: [], count: 0 };
        },
        async findOne() {
          return null;
        },
        async create(payload) {
          const project = { id: 'project-1', ...payload };
          createdProjects.push(project);
          return project;
        }
      },
      ProjectMedia: { async findAll() { return []; } },
      ServiceOffering: {},
      Material: {},
      Estimate: {},
      EstimateLine: {},
      GroupMessage: {},
      InboxMessage: {},
      QuoteMessage: {},
      QuoteClaimToken: {},
      SessionRefreshToken: {},
      DevicePushToken: {},
      sequelize: {}
    }
  };
};

test.afterEach(() => {
  mock.stopAll();
});

test('manager quote accept creates private inbox thread for linked client', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);

  const route = loadRoute('routes/manager.js');
  const app = buildExpressApp('/api/manager', route);
  const token = signAccessToken(managerId, 'manager');

  const response = await request(app)
    .post(`/api/manager/quotes/${quoteId}/accept`)
    .set('Authorization', `Bearer ${token}`)
    .expect(201);

  assert.equal(response.body?.inboxThread?.id, 'inbox-1');
  assert.equal(stubs.quote.assignedManagerId, managerId);
  assert.equal(stubs.quote.workflowStatus, 'manager_review');
  assert.equal(stubs.clientNotifications.length, 1);
});

test('manager can convert accepted quote into archived project', async () => {
  const stubs = createStubs();
  stubs.quote.clientDecisionStatus = 'accepted';
  stubs.quote.workflowStatus = 'accepted';
  stubs.quote.assignedManagerId = managerId;
  stubs.quote.status = 'responded';
  mockModels(stubs.models);

  const route = loadRoute('routes/manager.js');
  const app = buildExpressApp('/api/manager', route);
  const token = signAccessToken(managerId, 'manager');

  const response = await request(app)
    .post(`/api/manager/quotes/${quoteId}/convert-to-project`)
    .set('Authorization', `Bearer ${token}`)
    .expect(201);

  assert.equal(response.body?.project?.quoteId, quoteId);
  assert.equal(stubs.createdProjects.length, 1);
  assert.equal(stubs.quote.workflowStatus, 'archived');
  assert.equal(stubs.quote.status, 'closed');
});
