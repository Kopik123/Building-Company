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
  assert.equal(stubs.getGroupMemberCalls(), 0);

  const defaultResponse = await request(app)
    .get('/api/client/overview')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(defaultResponse.body?.threads?.length, 1);
  assert.equal(stubs.getGroupMemberCalls(), 1);
});
