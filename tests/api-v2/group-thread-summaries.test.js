const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

test.afterEach(() => {
  mock.stopAll();
});

test('group thread list includes latest preview and message count', async () => {
  const thread = {
    id: 'group-thread-1',
    name: 'Kitchen delivery thread',
    updatedAt: '2026-03-18T12:00:00Z',
    members: [
      { id: 'member-1', userId: 'manager-1', role: 'admin', user: { id: 'manager-1', name: 'Daniel', email: 'manager@example.com', role: 'manager' } },
      { id: 'member-2', userId: 'client-1', role: 'member', user: { id: 'client-1', name: 'Client Test', email: 'client@example.com', role: 'client' } }
    ],
    creator: { id: 'manager-1', name: 'Daniel', email: 'manager@example.com' },
    project: { id: 'project-1', title: 'Prestige Kitchen', location: 'Stockport', status: 'in_progress' },
    quote: null
  };

  mockModels({
    GroupMember: {
      async findAll() {
        return [{ thread }];
      },
      async count() {
        return 1;
      }
    },
    GroupThread: {},
    GroupMessage: {
      async findAll(options = {}) {
        if (options.raw) {
          return [{ groupThreadId: 'group-thread-1', messageCount: '4' }];
        }
        return [{
          groupThreadId: 'group-thread-1',
          id: 'group-message-1',
          body: 'Stone samples booked for Friday delivery and install sequencing.',
          createdAt: '2026-03-18T13:00:00Z',
          senderId: 'manager-1',
          sender: { id: 'manager-1', name: 'Daniel', email: 'manager@example.com', role: 'manager' }
        }];
      }
    },
    User: {
      async findByPk(id) {
        return {
          id,
          email: 'client@example.com',
          role: 'client',
          name: 'Client Test',
          isActive: true
        };
      }
    },
    Project: {},
    Quote: {}
  });

  const route = loadRoute('routes/group.js');
  const app = buildExpressApp('/api/group', route);
  const token = signAccessToken('client-1', 'client');

  const response = await request(app)
    .get('/api/group/threads')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(response.body.threads.length, 1);
  assert.equal(response.body.threads[0].latestMessagePreview, 'Stone samples booked for Friday delivery and install sequencing.');
  assert.equal(response.body.threads[0].messageCount, 4);
  assert.equal(response.body.threads[0].latestMessageSender?.name, 'Daniel');
});
