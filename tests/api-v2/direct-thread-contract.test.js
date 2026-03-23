const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');
const { UPLOADS_DIR } = require('../../utils/upload');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

test.afterEach(() => {
  mock.stopAll();
});

test('api v2 direct thread list includes latest preview, unread count and counterparty', async () => {
  const threadId = '11111111-1111-4111-8111-111111111111';
  const currentUserId = '33333333-3333-4333-8333-333333333333';
  const managerUserId = '44444444-4444-4444-8444-444444444444';

  const thread = {
    id: threadId,
    subject: 'Direct manager conversation',
    updatedAt: '2026-03-23T09:00:00Z',
    participantAId: currentUserId,
    participantBId: managerUserId,
    participantA: { id: currentUserId, name: 'Client Test', email: 'client@example.com', role: 'client' },
    participantB: { id: managerUserId, name: 'Daniel Manager', email: 'manager@example.com', role: 'manager' }
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
          return [{ threadId, unreadCount: '2' }];
        }
        return [{
          threadId,
          id: 'message-1',
          body: 'We can review the revised tile selection this afternoon.',
          createdAt: '2026-03-23T10:00:00Z',
          senderId: managerUserId,
          recipientId: currentUserId,
          isRead: false
        }];
      }
    },
    User: {
      async findByPk(id) {
        if (id !== currentUserId) return null;
        return {
          id,
          email: 'client@example.com',
          role: 'client',
          name: 'Client Test',
          isActive: true
        };
      }
    },
    GroupMember: {},
    GroupThread: {},
    GroupMessage: {},
    Project: {},
    Quote: {}
  });

  const route = loadRoute('api/v2/routes/messages.js');
  const app = buildExpressApp('/api/v2/messages', route);
  const token = signAccessToken(currentUserId, 'client');

  const response = await request(app)
    .get('/api/v2/messages/direct-threads')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(response.body?.data?.threads?.length, 1);
  assert.equal(response.body?.data?.threads?.[0]?.latestMessagePreview, 'We can review the revised tile selection this afternoon.');
  assert.equal(response.body?.data?.threads?.[0]?.unreadCount, 2);
  assert.equal(response.body?.data?.threads?.[0]?.counterparty?.email, 'manager@example.com');
});

test('api v2 direct thread create-only mode opens a private thread without an opening message', async () => {
  const clientUserId = '33333333-3333-4333-8333-333333333333';
  const managerUserId = '44444444-4444-4444-8444-444444444444';
  let createdMessage = false;

  const threadRecord = {
    id: '22222222-2222-4222-8222-222222222222',
    participantAId: clientUserId,
    participantBId: managerUserId,
    subject: 'Attachment-first private route',
    participantA: { id: clientUserId, name: 'Client Test', email: 'client@example.com', role: 'client' },
    participantB: { id: managerUserId, name: 'Daniel Manager', email: 'manager@example.com', role: 'manager' }
  };

  mockModels({
    InboxThread: {
      async findOrCreate() {
        return [threadRecord];
      },
      async findByPk(id) {
        return id === threadRecord.id ? threadRecord : null;
      }
    },
    InboxMessage: {
      async create() {
        createdMessage = true;
        return { id: 'message-1' };
      },
      async findAll() {
        return [];
      }
    },
    User: {
      async findByPk(id) {
        const users = {
          [clientUserId]: { id: clientUserId, email: 'client@example.com', role: 'client', name: 'Client Test', isActive: true },
          [managerUserId]: { id: managerUserId, email: 'manager@example.com', role: 'manager', name: 'Daniel Manager', isActive: true }
        };
        return users[id] || null;
      }
    },
    GroupMember: {},
    GroupThread: {},
    GroupMessage: {},
    Project: {},
    Quote: {}
  });

  const route = loadRoute('api/v2/routes/messages.js');
  const app = buildExpressApp('/api/v2/messages', route);
  const token = signAccessToken(clientUserId, 'client');

  const response = await request(app)
    .post('/api/v2/messages/direct-threads')
    .set('Authorization', `Bearer ${token}`)
    .send({
      recipientUserId: managerUserId,
      subject: 'Attachment-first private route',
      createOnly: true
    })
    .expect(201);

  assert.equal(response.body?.data?.thread?.id, threadRecord.id);
  assert.equal(response.body?.data?.message, null);
  assert.equal(createdMessage, false);
});

test('api v2 direct thread read marks unread private messages for the current user', async () => {
  const threadId = '33333333-3333-4333-8333-333333333333';
  const currentUserId = '33333333-3333-4333-8333-333333333333';
  let markedPayload = null;

  mockModels({
    InboxThread: {
      async findByPk(id) {
        if (id !== threadId) return null;
        return {
          id: threadId,
          participantAId: currentUserId,
          participantBId: '22222222-2222-4222-8222-222222222222'
        };
      }
    },
    InboxMessage: {
      async update(values, options) {
        markedPayload = { values, options };
        return [4];
      }
    },
    User: {
      async findByPk(id) {
        return {
          id,
          email: 'manager@example.com',
          role: 'manager',
          name: 'Manager Test',
          isActive: true
        };
      }
    },
    GroupMember: {},
    GroupThread: {},
    GroupMessage: {},
    Project: {},
    Quote: {}
  });

  const route = loadRoute('api/v2/routes/messages.js');
  const app = buildExpressApp('/api/v2/messages', route);
  const token = signAccessToken(currentUserId, 'manager');

  const response = await request(app)
    .patch(`/api/v2/messages/direct-threads/${threadId}/read`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(response.body?.data?.markedReadCount, 4);
  assert.deepEqual(markedPayload.values, { isRead: true });
  assert.equal(markedPayload.options.where.threadId, threadId);
  assert.equal(markedPayload.options.where.recipientId, currentUserId);
  assert.equal(markedPayload.options.where.isRead, false);
});

test('api v2 direct thread attachment upload stores metadata and returns sender for optimistic UI', async () => {
  const threadId = '44444444-4444-4444-8444-444444444444';
  const currentUserId = '33333333-3333-4333-8333-333333333333';
  let createdPayload = null;

  mockModels({
    InboxThread: {
      async findByPk(id) {
        if (id !== threadId) return null;
        return {
          id: threadId,
          participantAId: currentUserId,
          participantBId: '22222222-2222-4222-8222-222222222222'
        };
      }
    },
    InboxMessage: {
      async create(payload) {
        createdPayload = payload;
        return {
          id: 'message-upload-1',
          createdAt: '2026-03-23T12:00:00Z',
          ...payload,
          toJSON() {
            return {
              id: this.id,
              createdAt: this.createdAt,
              threadId: this.threadId,
              senderId: this.senderId,
              recipientId: this.recipientId,
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
          email: 'manager@example.com',
          role: 'manager',
          name: 'Manager Test',
          isActive: true
        };
      }
    },
    GroupMember: {},
    GroupThread: {},
    GroupMessage: {},
    Project: {},
    Quote: {}
  });

  const route = loadRoute('api/v2/routes/messages.js');
  const app = buildExpressApp('/api/v2/messages', route);
  const token = signAccessToken(currentUserId, 'manager');

  const response = await request(app)
    .post(`/api/v2/messages/direct-threads/${threadId}/messages/upload`)
    .set('Authorization', `Bearer ${token}`)
    .attach('files', Buffer.from('attachment-body'), {
      filename: 'private-note.txt',
      contentType: 'text/plain'
    })
    .expect(201);

  assert.equal(response.body?.data?.message?.attachments?.length, 1);
  assert.equal(response.body?.data?.message?.attachments?.[0]?.name, 'private-note.txt');
  assert.equal(response.body?.data?.message?.sender?.id, currentUserId);
  assert.equal(createdPayload.attachments.length, 1);
  assert.equal(createdPayload.body, 'Sent 1 file(s)');

  const storedFileName = path.basename(response.body.data.message.attachments[0].url);
  await fs.unlink(path.join(UPLOADS_DIR, storedFileName));
});
