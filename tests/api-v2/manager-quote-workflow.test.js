const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { mock } = require('./_helpers');
const {
  managerId,
  clientId,
  quoteId,
  makeManagerUsers,
  emptyManagerModelStubs,
  buildManagerApp
} = require('./_manager-quote-fixtures');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

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
  estimates: [],
  client: { id: clientId, name: 'Client User', email: 'client@example.com' },
  async update(payload) {
    Object.assign(this, payload);
    return this;
  }
});

const createStubs = () => {
  const quote = createQuote();
  const createdProjects = [];
  const createdEstimates = [];
  const clientNotifications = [];
  const users = makeManagerUsers();

  return {
    quote,
    createdProjects,
    createdEstimates,
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
      Estimate: {
        async findOne({ where = {} } = {}) {
          return createdEstimates.find((estimate) =>
            estimate.quoteId === where.quoteId
            && estimate.isActive === where.isActive
            && estimate.status === where.status
          ) || null;
        },
        async create(payload) {
          const estimate = {
            id: `estimate-${createdEstimates.length + 1}`,
            lines: [],
            toJSON() {
              return { ...this };
            },
            async update(nextPayload) {
              Object.assign(this, nextPayload);
              return this;
            },
            ...payload
          };
          createdEstimates.push(estimate);
          quote.estimates.unshift(estimate);
          return estimate;
        },
        async findByPk(id) {
          return createdEstimates.find((estimate) => estimate.id === id) || null;
        }
      },
      EstimateLine: {},
      ...emptyManagerModelStubs()
    }
  };
};

test.afterEach(() => {
  mock.stopAll();
});

test('manager quote accept creates private inbox thread for linked client', async () => {
  const stubs = createStubs();
  const { app, token } = buildManagerApp(stubs);

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
  const { app, token } = buildManagerApp(stubs);

  const response = await request(app)
    .post(`/api/manager/quotes/${quoteId}/convert-to-project`)
    .set('Authorization', `Bearer ${token}`)
    .expect(201);

  assert.equal(response.body?.project?.quoteId, quoteId);
  assert.equal(stubs.createdProjects.length, 1);
  assert.equal(stubs.quote.workflowStatus, 'archived');
  assert.equal(stubs.quote.status, 'closed');
});

test('manager can create a draft estimate directly from a quote', async () => {
  const stubs = createStubs();
  stubs.quote.assignedManagerId = managerId;
  stubs.quote.workflowStatus = 'visit_confirmed';
  const { app, token } = buildManagerApp(stubs);

  const response = await request(app)
    .post(`/api/manager/quotes/${quoteId}/create-estimate-draft`)
    .set('Authorization', `Bearer ${token}`)
    .expect(201);

  assert.equal(response.body?.estimate?.quoteId, quoteId);
  assert.equal(stubs.createdEstimates.length, 1);
  assert.equal(stubs.quote.workflowStatus, 'quote_requested');
  assert.equal(stubs.quote.estimates.length, 1);
});

test('manager can load quote detail for the dedicated review timeline', async () => {
  const stubs = createStubs();
  stubs.quote.assignedManagerId = managerId;
  stubs.quote.revisionHistory = [{
    id: 'rev-1',
    createdAt: '2026-03-31T12:00:00.000Z',
    changeType: 'workflow_updated',
    changedFields: ['workflowStatus'],
    snapshot: { workflowStatus: 'manager_review' }
  }];
  stubs.quote.estimates = [{
    id: 'estimate-1',
    title: 'Review Pack',
    status: 'sent',
    total: 1500,
    revisionHistory: [{
      id: 'est-rev-1',
      createdAt: '2026-03-31T12:30:00.000Z',
      changeType: 'sent_to_client_review',
      changedFields: ['status'],
      snapshot: { status: 'sent' }
    }]
  }];
  const { app, token } = buildManagerApp(stubs);

  const response = await request(app)
    .get(`/api/manager/quotes/${quoteId}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(response.body?.quote?.id, quoteId);
  assert.equal(response.body?.quote?.revisionHistory?.length, 1);
  assert.equal(response.body?.quote?.estimates?.[0]?.title, 'Review Pack');
});
