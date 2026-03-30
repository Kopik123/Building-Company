const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { Op } = require('sequelize');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const makeModel = (data) => ({
  ...data,
  toJSON() {
    return { ...data };
  }
});

const createStubs = () => {
  const users = new Map([
    ['11111111-1111-4111-8111-111111111111', { id: '11111111-1111-4111-8111-111111111111', role: 'manager', email: 'manager@example.com', name: 'Daniel Manager', isActive: true }],
    ['22222222-2222-4222-8222-222222222222', { id: '22222222-2222-4222-8222-222222222222', role: 'client', email: 'client@example.com', name: 'Marta Client', isActive: true }],
    ['33333333-3333-4333-8333-333333333333', { id: '33333333-3333-4333-8333-333333333333', role: 'employee', email: 'staff@example.com', name: 'Leah Builder', isActive: true }]
  ]);

  const project = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    title: 'Prestige Kitchen',
    location: 'Stockport',
    status: 'in_progress',
    quoteId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    clientId: '22222222-2222-4222-8222-222222222222',
    assignedManagerId: '11111111-1111-4111-8111-111111111111'
  };
  const quote = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    projectType: 'kitchen',
    location: 'Stockport',
    status: 'in_progress'
  };

  const threads = [];
  const members = [];
  let threadCounter = 1;
  let memberCounter = 1;

  const buildThreadRecord = (thread) => makeModel({
    ...thread,
    creator: users.get(thread.createdBy),
    project,
    quote,
    members: members
      .filter((member) => member.groupThreadId === thread.id)
      .map((member) => ({ ...member, user: users.get(member.userId) }))
  });

  const buildMemberRecord = (member) => ({
    ...member,
    async destroy() {
      const index = members.findIndex((item) => item.id === member.id);
      if (index >= 0) members.splice(index, 1);
    }
  });

  return {
    models: {
      User: {
        async findByPk(id) {
          return users.get(id) || null;
        },
        async findAll({ where = {} } = {}) {
          const ids = new Set(where.id?.[Op.in] || []);
          return Array.from(users.values()).filter((user) => ids.has(user.id));
        }
      },
      Project: {
        async findByPk(id) {
          if (id !== project.id) return null;
          return { ...project, quote };
        }
      },
      Quote: {},
      GroupMessage: {},
      GroupThread: {
        async create(payload) {
          const thread = {
            id: `thread-${threadCounter++}`,
            updatedAt: '2026-03-17T18:00:00Z',
            createdAt: '2026-03-17T18:00:00Z',
            ...payload
          };
          threads.push(thread);
          return makeModel(thread);
        },
        async findByPk(id) {
          const thread = threads.find((item) => item.id === id);
          return thread ? buildThreadRecord(thread) : null;
        }
      },
      GroupMember: {
        async create(payload) {
          const member = { id: `member-${memberCounter++}`, ...payload };
          members.push(member);
          return makeModel(member);
        },
        async bulkCreate(payloads) {
          payloads.forEach((payload) => {
            members.push({ id: `member-${memberCounter++}`, ...payload });
          });
          return [];
        },
        async findOne({ where = {} }) {
          const member = members.find((entry) =>
            (!where.groupThreadId || entry.groupThreadId === where.groupThreadId)
            && (!where.userId || entry.userId === where.userId)
          );
          return member ? buildMemberRecord(member) : null;
        },
        async count({ where = {} }) {
          return members.filter((member) =>
            (!where.groupThreadId || member.groupThreadId === where.groupThreadId)
            && (!where.role || member.role === where.role)
          ).length;
        }
      }
    },
    state: { threads, members, project }
  };
};

test.afterEach(() => {
  mock.stopAll();
});

test('group route can create a project chat with seeded participants', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);

  const route = loadRoute('routes/group.js');
  const app = buildExpressApp('/api/group', route);
  const token = signAccessToken('11111111-1111-4111-8111-111111111111', 'manager');

  const response = await request(app)
    .post('/api/group/threads')
    .set('Authorization', `Bearer ${token}`)
    .send({
      projectId: stubs.state.project.id,
      name: 'Kitchen delivery thread',
      participantUserIds: ['33333333-3333-4333-8333-333333333333'],
      includeProjectClient: true,
      includeAssignedStaff: true
    })
    .expect(201);

  assert.equal(response.body?.thread?.name, 'Kitchen delivery thread');
  assert.equal(response.body?.thread?.projectId, stubs.state.project.id);
  assert.equal(response.body?.thread?.currentUserMembershipRole, 'admin');
  assert.equal(response.body?.thread?.memberCount, 3);
  assert.deepEqual(
    response.body.thread.members.map((member) => member.user.email).sort(),
    ['client@example.com', 'manager@example.com', 'staff@example.com']
  );
});

test('group route allows an admin to remove a project chat participant', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);

  stubs.state.threads.push({
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Kitchen delivery thread',
    projectId: stubs.state.project.id,
    quoteId: stubs.state.project.quoteId,
    createdBy: '11111111-1111-4111-8111-111111111111'
  });
  stubs.state.members.push(
    { id: 'member-1', groupThreadId: '44444444-4444-4444-8444-444444444444', userId: '11111111-1111-4111-8111-111111111111', role: 'admin' },
    { id: 'member-2', groupThreadId: '44444444-4444-4444-8444-444444444444', userId: '22222222-2222-4222-8222-222222222222', role: 'member' }
  );

  const route = loadRoute('routes/group.js');
  const app = buildExpressApp('/api/group', route);
  const token = signAccessToken('11111111-1111-4111-8111-111111111111', 'manager');

  await request(app)
    .delete('/api/group/threads/44444444-4444-4444-8444-444444444444/members/22222222-2222-4222-8222-222222222222')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(
    stubs.state.members.some((member) => member.userId === '22222222-2222-4222-8222-222222222222'),
    false
  );
});
