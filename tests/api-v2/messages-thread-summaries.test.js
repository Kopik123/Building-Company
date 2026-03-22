const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

test.afterEach(() => {
  mock.stopAll();
});

test('api v2 thread list includes latest preview, message count and membership role metadata', async () => {
  const thread = {
    id: 'group-thread-1',
    name: 'Kitchen delivery thread',
    updatedAt: '2026-03-22T10:00:00Z',
    project: {
      id: 'project-1',
      title: 'Prestige Kitchen',
      location: 'Stockport',
      status: 'in_progress'
    },
    quote: null,
    creator: { id: 'manager-1', name: 'Daniel', email: 'manager@example.com' },
    members: [
      {
        id: 'member-1',
        userId: 'manager-1',
        role: 'admin',
        user: { id: 'manager-1', name: 'Daniel', email: 'manager@example.com', role: 'manager' }
      },
      {
        id: 'member-2',
        userId: 'client-1',
        role: 'member',
        user: { id: 'client-1', name: 'Client Test', email: 'client@example.com', role: 'client' }
      }
    ]
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
          createdAt: '2026-03-22T12:00:00Z',
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

  const route = loadRoute('api/v2/routes/messages.js');
  const app = buildExpressApp('/api/v2/messages', route);
  const token = signAccessToken('client-1', 'client');

  const response = await request(app)
    .get('/api/v2/messages/threads')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(response.body?.data?.threads?.length, 1);
  assert.equal(response.body?.data?.threads?.[0]?.latestMessagePreview, 'Stone samples booked for Friday delivery and install sequencing.');
  assert.equal(response.body?.data?.threads?.[0]?.messageCount, 4);
  assert.equal(response.body?.data?.threads?.[0]?.memberCount, 2);
  assert.equal(response.body?.data?.threads?.[0]?.currentUserMembershipRole, 'member');
  assert.equal(response.body?.data?.threads?.[0]?.latestMessageSender?.name, 'Daniel');
});

test('api v2 message create returns sender details for optimistic web-v2 rendering', async () => {
  const threadId = '11111111-1111-4111-8111-111111111111';

  mockModels({
    GroupMember: {
      async findOne() {
        return { id: 'member-1', groupThreadId: threadId, userId: 'client-1', role: 'member' };
      }
    },
    GroupThread: {},
    GroupMessage: {
      async create(payload) {
        return {
          id: 'group-message-1',
          createdAt: '2026-03-22T13:30:00Z',
          ...payload,
          toJSON() {
            return {
              id: this.id,
              createdAt: this.createdAt,
              groupThreadId: this.groupThreadId,
              senderId: this.senderId,
              body: this.body,
              attachments: this.attachments
            };
          }
        };
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

  const route = loadRoute('api/v2/routes/messages.js');
  const app = buildExpressApp('/api/v2/messages', route);
  const token = signAccessToken('client-1', 'client');

  const response = await request(app)
    .post(`/api/v2/messages/threads/${threadId}/messages`)
    .set('Authorization', `Bearer ${token}`)
    .send({ body: 'Please confirm the Friday access window.' })
    .expect(201);

  assert.equal(response.body?.data?.message?.body, 'Please confirm the Friday access window.');
  assert.equal(response.body?.data?.message?.sender?.id, 'client-1');
  assert.equal(response.body?.data?.message?.sender?.email, 'client@example.com');
  assert.equal(response.body?.data?.message?.sender?.role, 'client');
});
