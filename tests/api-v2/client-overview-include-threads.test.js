const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const createStubs = () => {
  const users = {
    '33333333-3333-4333-8333-333333333333': {
      id: '33333333-3333-4333-8333-333333333333',
      role: 'client',
      email: 'client@example.com',
      name: 'Client Test',
      isActive: true
    }
  };

  let groupMemberCalls = 0;

  const projectInstance = {
    id: 'project-1',
    title: 'Client Project',
    status: 'planning',
    media: [],
    toJSON() {
      return {
        id: this.id,
        title: this.title,
        status: this.status,
        media: this.media
      };
    }
  };

  return {
    getGroupMemberCalls: () => groupMemberCalls,
    models: {
      User: {
        async findByPk(id) {
          return users[id] || null;
        }
      },
      Project: {
        async findAll() {
          return [projectInstance];
        }
      },
      ProjectMedia: {},
      Quote: {
        async findAll() {
          return [];
        }
      },
      NewQuote: {
        async findAll() {
          return [{
            id: 'new-quote-1',
            quoteRef: 'LL-M202AB-8487',
            clientId: '33333333-3333-4333-8333-333333333333',
            clientName: 'Client Test',
            clientEmail: 'client@example.com',
            clientPhone: '+44 7000 000 002',
            projectType: 'kitchen',
            location: 'Manchester and the North West',
            postcode: 'M20 2AB',
            budgetRange: '?8,000-?12,000',
            proposalDetails: null,
            description: 'Kitchen refresh',
            attachments: [{
              name: 'brief-photo.png',
              filename: 'brief-photo.png',
              url: '/uploads/brief-photo.png',
              storagePath: 'uploads/brief-photo.png',
              mimeType: 'image/png',
              sizeBytes: 2048,
              mediaType: 'image',
              createdAt: '2026-03-29T20:00:00Z',
              updatedAt: '2026-03-29T20:00:00Z'
            }],
            sourceChannel: 'client_quote_portal',
            createdAt: '2026-03-29T20:00:00Z',
            updatedAt: '2026-03-29T20:00:00Z',
            toJSON() {
              return { ...this };
            }
          }];
        }
      },
      GroupMember: {
        async findAll() {
          groupMemberCalls += 1;
          return [{ thread: { id: 'thread-1', name: 'Thread' } }];
        }
      },
      GroupThread: {},
      Notification: {
        async count() {
          return 0;
        }
      },
      ServiceOffering: {
        async findAll() {
          return [];
        }
      }
    }
  };
};

test.afterEach(() => {
  mock.stopAll();
});

test('client overview supports includeThreads=false without loading memberships', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);

  const route = loadRoute('routes/client.js');
  const app = buildExpressApp('/api/client', route);
  const token = signAccessToken('33333333-3333-4333-8333-333333333333', 'client');

  const hiddenThreadsResponse = await request(app)
    .get('/api/client/overview?includeThreads=false')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.deepEqual(hiddenThreadsResponse.body?.threads, []);
  assert.equal(hiddenThreadsResponse.body?.metrics?.quoteCount, 1);
  assert.equal(hiddenThreadsResponse.body?.quotes?.length, 1);
  assert.equal(hiddenThreadsResponse.body?.quotes?.[0]?.recordType, 'new_quote');
  assert.equal(stubs.getGroupMemberCalls(), 0);

  const defaultResponse = await request(app)
    .get('/api/client/overview')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(defaultResponse.body?.threads?.length, 1);
  assert.equal(stubs.getGroupMemberCalls(), 1);
});
