const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { Op } = require('sequelize');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const createStubs = () => {
  const threadId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const users = {
    '11111111-1111-4111-8111-111111111111': {
      id: '11111111-1111-4111-8111-111111111111',
      role: 'manager',
      email: 'manager@example.com',
      name: 'Manager',
      isActive: true
    }
  };

  const timeline = [
    { id: 'm1', groupThreadId: threadId, senderId: users['11111111-1111-4111-8111-111111111111'].id, body: '1', createdAt: new Date('2026-01-01T10:00:01.000Z') },
    { id: 'm2', groupThreadId: threadId, senderId: users['11111111-1111-4111-8111-111111111111'].id, body: '2', createdAt: new Date('2026-01-01T10:00:02.000Z') },
    { id: 'm3', groupThreadId: threadId, senderId: users['11111111-1111-4111-8111-111111111111'].id, body: '3', createdAt: new Date('2026-01-01T10:00:03.000Z') },
    { id: 'm4', groupThreadId: threadId, senderId: users['11111111-1111-4111-8111-111111111111'].id, body: '4', createdAt: new Date('2026-01-01T10:00:04.000Z') },
    { id: 'm5', groupThreadId: threadId, senderId: users['11111111-1111-4111-8111-111111111111'].id, body: '5', createdAt: new Date('2026-01-01T10:00:05.000Z') }
  ];

  return {
    threadId,
    models: {
      User: {
        async findByPk(id) {
          return users[id] || null;
        }
      },
      GroupMember: {
        async findOne() {
          return { id: 'membership-1' };
        },
        async findAll() {
          return [];
        },
        async count() {
          return 0;
        }
      },
      GroupThread: {},
      GroupMessage: {
        async findAll({ where = {}, order = [], limit = 20 }) {
          let rows = timeline.filter((message) => message.groupThreadId === where.groupThreadId);

          const cursorClauses = where[Op.or];
          if (Array.isArray(cursorClauses) && cursorClauses.length) {
            rows = rows.filter((message) => {
              return cursorClauses.some((clause) => {
                if (clause.createdAt && clause.createdAt[Op.lt]) {
                  return message.createdAt < clause.createdAt[Op.lt];
                }
                if (clause.createdAt && clause.id && clause.id[Op.lt]) {
                  return message.createdAt.getTime() === new Date(clause.createdAt).getTime() && message.id < clause.id[Op.lt];
                }
                return false;
              });
            });
          }

          const descending = Array.isArray(order) && order.some((item) => Array.isArray(item) && item[1] === 'DESC');
          rows = rows
            .slice()
            .sort((a, b) => {
              if (a.createdAt.getTime() === b.createdAt.getTime()) {
                return descending ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id);
              }
              return descending
                ? b.createdAt.getTime() - a.createdAt.getTime()
                : a.createdAt.getTime() - b.createdAt.getTime();
            })
            .slice(0, limit)
            .map((message) => ({
              ...message,
              sender: users[message.senderId]
            }));

          return rows;
        },
        async count({ where = {} }) {
          return timeline.filter((message) => message.groupThreadId === where.groupThreadId).length;
        }
      }
    }
  };
};

test.afterEach(() => {
  mock.stopAll();
});

test('messages v2 cursor pagination returns stable nextCursor without duplicates', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/messages.js');
  const app = buildExpressApp('/api/v2/messages', route);
  const token = signAccessToken('11111111-1111-4111-8111-111111111111', 'manager');

  const firstPage = await request(app)
    .get(`/api/v2/messages/threads/${stubs.threadId}/messages?limit=2`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(firstPage.body?.meta?.mode, 'cursor');
  assert.equal(firstPage.body?.data?.messages?.length, 2);
  assert.ok(firstPage.body?.meta?.nextCursor);

  const firstPageIds = firstPage.body.data.messages.map((item) => item.id);

  const secondPage = await request(app)
    .get(`/api/v2/messages/threads/${stubs.threadId}/messages?limit=2&cursor=${encodeURIComponent(firstPage.body.meta.nextCursor)}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(secondPage.body?.data?.messages?.length, 2);
  const secondPageIds = secondPage.body.data.messages.map((item) => item.id);
  const overlap = secondPageIds.filter((id) => firstPageIds.includes(id));
  assert.equal(overlap.length, 0);
});
