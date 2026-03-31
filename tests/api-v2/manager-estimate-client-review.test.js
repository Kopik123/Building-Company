const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const managerId = '11111111-1111-4111-8111-111111111111';
const clientId = '22222222-2222-4222-8222-222222222222';
const quoteId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const estimateId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const createStubs = () => {
  const notifications = [];
  const quote = {
    id: quoteId,
    clientId,
    assignedManagerId: managerId,
    workflowStatus: 'quote_requested',
    status: 'responded',
    clientDecisionStatus: 'pending',
    estimateDocumentUrl: null,
    revisionHistory: [],
    archivedAt: null,
    async update(payload) {
      Object.assign(this, payload);
      return this;
    }
  };
  const estimate = {
    id: estimateId,
    quoteId,
    projectId: null,
    createdById: managerId,
    title: 'Bathroom Estimate',
    status: 'draft',
    subtotal: 2500,
    total: 2500,
    notes: 'Initial pack',
    clientVisible: false,
    sentToClientAt: null,
    revisionNumber: 1,
    revisionHistory: [],
    documentUrl: null,
    documentStoragePath: null,
    documentFilename: null,
    documentMimeType: null,
    documentSizeBytes: null,
    lines: [],
    toJSON() {
      return { ...this };
    },
    async update(payload) {
      Object.assign(this, payload);
      return this;
    }
  };

  const users = {
    [managerId]: { id: managerId, role: 'manager', email: 'manager@example.com', name: 'Manager User', isActive: true },
    [clientId]: { id: clientId, role: 'client', email: 'client@example.com', name: 'Client User', isActive: true }
  };

  return {
    quote,
    estimate,
    notifications,
    models: {
      User: {
        async findByPk(id) {
          return users[id] || null;
        }
      },
      Quote: {
        async findByPk(id) {
          return id === quoteId ? quote : null;
        }
      },
      Estimate: {
        async findByPk(id) {
          return id === estimateId ? estimate : null;
        }
      },
      EstimateLine: {
        async findAll() {
          return [];
        }
      },
      Notification: {
        async create(payload) {
          notifications.push(payload);
          return payload;
        }
      },
      Project: {},
      ProjectMedia: {},
      GroupThread: {},
      GroupMember: {},
      InboxThread: {},
      ServiceOffering: {},
      Material: {},
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

test('manager can send estimate to client review', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);

  const route = loadRoute('routes/manager.js');
  const app = buildExpressApp('/api/manager', route);
  const token = signAccessToken(managerId, 'manager');

  const response = await request(app)
    .post(`/api/manager/estimates/${estimateId}/send-to-client-review`)
    .set('Authorization', `Bearer ${token}`)
    .expect(201);

  assert.equal(response.body?.estimate?.status, 'sent');
  assert.equal(stubs.estimate.clientVisible, true);
  assert.equal(stubs.quote.workflowStatus, 'client_review');
  assert.equal(stubs.notifications.length, 1);
  assert.equal(Array.isArray(stubs.estimate.revisionHistory), true);
  assert.equal(stubs.estimate.revisionHistory.length > 0, true);
  assert.equal(stubs.quote.revisionHistory.length > 0, true);
});

test('manager can upload estimate file metadata and link it to quote', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);

  const route = loadRoute('routes/manager.js');
  const app = buildExpressApp('/api/manager', route);
  const token = signAccessToken(managerId, 'manager');

  const response = await request(app)
    .post(`/api/manager/estimates/${estimateId}/document`)
    .set('Authorization', `Bearer ${token}`)
    .attach('file', Buffer.from('%PDF-1.4 test file'), {
      filename: 'estimate-pack.pdf',
      contentType: 'application/pdf'
    })
    .expect(201);

  const storagePath = response.body?.estimate?.documentStoragePath;
  if (storagePath) {
    await fs.unlink(path.join(__dirname, '..', '..', storagePath)).catch(() => {});
  }

  assert.equal(String(stubs.estimate.documentFilename || ''), 'estimate-pack.pdf');
  assert.equal(String(stubs.estimate.documentUrl || '').startsWith('/uploads/'), true);
  assert.equal(stubs.quote.estimateDocumentUrl, stubs.estimate.documentUrl);
  assert.equal(stubs.estimate.revisionNumber > 1, true);
});
