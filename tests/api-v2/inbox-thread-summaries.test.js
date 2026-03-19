const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

test.afterEach(() => {
  mock.stopAll();
});

test('inbox thread list includes latest preview and unread count for current user', async () => {
  const thread = {
    id: 'thread-1',
    subject: 'Direct manager conversation',
    updatedAt: '2026-03-18T10:00:00Z',
    participantAId: '33333333-3333-4333-8333-333333333333',
    participantBId: '44444444-4444-4444-8444-444444444444',
    participantA: { id: '33333333-3333-4333-8333-333333333333', name: 'Client Test', email: 'client@example.com' },
    participantB: { id: '44444444-4444-4444-8444-444444444444', name: 'Daniel Manager', email: 'manager@example.com' }
  };

  mockModels({
    InboxThread: {
      async findAll() {
        return [thread];
      },
      async count() {
        return 1;
      }
    },
    InboxMessage: {
      async findAll(options = {}) {
        if (options.raw) {
          return [{ threadId: 'thread-1', unreadCount: '2' }];
        }
        return [{
          threadId: 'thread-1',
          id: 'message-1',
          body: 'We can review the revised tile selection this afternoon.',
          createdAt: '2026-03-18T11:00:00Z',
          senderId: '44444444-4444-4444-8444-444444444444',
          recipientId: '33333333-3333-4333-8333-333333333333',
          isRead: false
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
    }
  });

  const route = loadRoute('routes/inbox.js');
  const app = buildExpressApp('/api/inbox', route);
  const token = signAccessToken('33333333-3333-4333-8333-333333333333', 'client');

  const response = await request(app)
    .get('/api/inbox/threads')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(response.body.threads.length, 1);
  assert.equal(response.body.threads[0].latestMessagePreview, 'We can review the revised tile selection this afternoon.');
  assert.equal(response.body.threads[0].unreadCount, 2);
  assert.equal(response.body.threads[0].latestMessageSenderId, '44444444-4444-4444-8444-444444444444');
});

test('inbox thread read endpoint marks all unread messages in a thread as read', async () => {
  let markedPayload = null;
  const threadId = '11111111-1111-4111-8111-111111111111';
  mockModels({
    InboxThread: {
      async findByPk(id) {
        if (id !== threadId) return null;
        return {
          id: threadId,
          participantAId: '33333333-3333-4333-8333-333333333333',
          participantBId: '44444444-4444-4444-8444-444444444444'
        };
      }
    },
    InboxMessage: {
      async update(values, options) {
        markedPayload = { values, options };
        return [3];
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
    }
  });

  const route = loadRoute('routes/inbox.js');
  const app = buildExpressApp('/api/inbox', route);
  const token = signAccessToken('33333333-3333-4333-8333-333333333333', 'client');

  const response = await request(app)
    .post(`/api/inbox/threads/${threadId}/read`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(response.body.markedReadCount, 3);
  assert.deepEqual(markedPayload.values, { isRead: true });
  assert.equal(markedPayload.options.where.threadId, threadId);
  assert.equal(markedPayload.options.where.recipientId, '33333333-3333-4333-8333-333333333333');
  assert.equal(markedPayload.options.where.isRead, false);
});

test('inbox thread create-only mode opens a thread without creating an opening message', async () => {
  let createdMessage = false;
  mockModels({
    InboxThread: {
      async findOrCreate() {
        return [{
          id: 'thread-2',
          participantAId: '33333333-3333-4333-8333-333333333333',
          participantBId: '44444444-4444-4444-8444-444444444444',
          subject: 'Attachment-first thread'
        }];
      }
    },
    InboxMessage: {
      async create() {
        createdMessage = true;
        return { id: 'message-2' };
      }
    },
    User: {
      async findByPk(id) {
        return {
          id,
          email: 'manager@example.com',
          role: 'manager',
          name: 'Daniel Manager',
          isActive: true
        };
      }
    }
  });

  const route = loadRoute('routes/inbox.js');
  const app = buildExpressApp('/api/inbox', route);
  const token = signAccessToken('33333333-3333-4333-8333-333333333333', 'client');

  const response = await request(app)
    .post('/api/inbox/threads')
    .set('Authorization', `Bearer ${token}`)
    .send({
      recipientUserId: '44444444-4444-4444-8444-444444444444',
      subject: 'Attachment-first thread',
      createOnly: true
    })
    .expect(201);

  assert.equal(response.body.thread.id, 'thread-2');
  assert.equal(response.body.message, null);
  assert.equal(createdMessage, false);
});
