const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const createQuoteInstance = () => ({
  id: '11111111-1111-4111-8111-111111111111',
  projectType: 'kitchen',
  guestName: 'Olivia Reed',
  status: 'pending',
  workflowStatus: 'submitted',
  priority: 'high',
  location: 'Manchester',
  postcode: 'M20 2AB',
  description: 'Client requests detailed joinery allowance.',
  attachments: [
    {
      id: 'attachment-1',
      filename: 'kitchen-photo.jpg',
      url: '/uploads/kitchen-photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 204800,
      createdAt: '2026-03-29T22:00:00Z',
      updatedAt: '2026-03-29T22:00:00Z'
    }
  ],
  client: { id: 'client-1', name: 'Olivia Reed', email: 'client@example.com', phone: '07395448487' },
  assignedManager: { id: 'manager-1', name: 'Daniel Manager', email: 'manager@example.com' },
  toJSON() {
    return {
      id: this.id,
      projectType: this.projectType,
      guestName: this.guestName,
      status: this.status,
      workflowStatus: this.workflowStatus,
      priority: this.priority,
      location: this.location,
      postcode: this.postcode,
      description: this.description,
      attachments: this.attachments,
      client: this.client,
      assignedManager: this.assignedManager
    };
  }
});

const createStubs = () => {
  const users = {
    'manager-1': {
      id: 'manager-1',
      role: 'manager',
      email: 'manager@example.com',
      name: 'Daniel Manager',
      isActive: true
    }
  };
  const quote = createQuoteInstance();
  const calls = {
    quoteFindAllArgs: null,
    quoteFindByPkArgs: null
  };

  return {
    calls,
    models: {
      User: {
        async findByPk(id) {
          return users[id] || null;
        }
      },
      Quote: {
        async findAll(args) {
          calls.quoteFindAllArgs = args;
          return [quote];
        },
        async findByPk(id, args) {
          calls.quoteFindByPkArgs = args;
          return id === quote.id ? quote : null;
        }
      },
      QuoteAttachment: {},
      NewQuote: {},
      GroupThread: {},
      GroupMember: {},
      Notification: {},
      Project: {},
      ProjectMedia: {},
      ServiceOffering: {},
      Material: {},
      Estimate: {},
      EstimateLine: {},
      sequelize: {}
    }
  };
};

test.afterEach(() => {
  mock.stopAll();
});

test('manager quotes include attachment previews in list and detail responses', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);

  const route = loadRoute('routes/manager.js');
  const app = buildExpressApp('/api/manager', route);
  const token = signAccessToken('manager-1', 'manager');

  const listResponse = await request(app)
    .get('/api/manager/quotes')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  const listQuote = listResponse.body?.quotes?.[0];
  assert.equal(Array.isArray(listQuote?.attachments), true);
  assert.equal(listQuote?.attachments?.length, 1);
  assert.equal(listQuote?.attachments?.[0]?.url, '/uploads/kitchen-photo.jpg');
  assert.equal(listQuote?.attachmentCount, 1);
  assert.equal(Array.isArray(stubs.calls.quoteFindAllArgs?.include), true);
  assert.equal(stubs.calls.quoteFindAllArgs.include.some((entry) => entry?.as === 'attachments'), true);

  const detailResponse = await request(app)
    .get('/api/manager/quotes/11111111-1111-4111-8111-111111111111')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  const detailQuote = detailResponse.body?.quote;
  assert.equal(Array.isArray(detailQuote?.attachments), true);
  assert.equal(detailQuote?.attachments?.[0]?.url, '/uploads/kitchen-photo.jpg');
  assert.equal(stubs.calls.quoteFindByPkArgs?.include?.some((entry) => entry?.as === 'attachments'), true);
});
