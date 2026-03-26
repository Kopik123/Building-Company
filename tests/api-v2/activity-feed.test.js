const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { Op } = require('sequelize');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const createActivityStubs = () => {
  const users = {
    '11111111-1111-4111-8111-111111111111': {
      id: '11111111-1111-4111-8111-111111111111',
      role: 'manager',
      email: 'manager@example.com',
      name: 'Manager',
      isActive: true
    },
    '33333333-3333-4333-8333-333333333333': {
      id: '33333333-3333-4333-8333-333333333333',
      role: 'client',
      email: 'client@example.com',
      name: 'Client',
      isActive: true
    }
  };

  const activity = [
    {
      id: 'activity-1',
      actorUserId: '11111111-1111-4111-8111-111111111111',
      entityType: 'project',
      entityId: '44444444-4444-4444-8444-444444444444',
      visibility: 'internal',
      eventType: 'project_created',
      title: 'Project created',
      message: 'Project created for the bathroom quote.',
      clientId: '33333333-3333-4333-8333-333333333333',
      projectId: '44444444-4444-4444-8444-444444444444',
      quoteId: '55555555-5555-4555-8555-555555555555',
      createdAt: '2026-03-26T20:00:00Z',
      updatedAt: '2026-03-26T20:00:00Z',
      data: null
    },
    {
      id: 'activity-2',
      actorUserId: '33333333-3333-4333-8333-333333333333',
      entityType: 'quote',
      entityId: '55555555-5555-4555-8555-555555555555',
      visibility: 'client',
      eventType: 'estimate_accepted',
      title: 'Estimate accepted',
      message: 'Client accepted the current estimate.',
      clientId: '33333333-3333-4333-8333-333333333333',
      projectId: null,
      quoteId: '55555555-5555-4555-8555-555555555555',
      createdAt: '2026-03-26T21:00:00Z',
      updatedAt: '2026-03-26T21:00:00Z',
      data: null
    }
  ];

  const matchesVisibility = (row, clause) => {
    if (!clause) return true;
    const allowed = clause[Op.in];
    return Array.isArray(allowed) ? allowed.includes(row.visibility) : row.visibility === clause;
  };

  const ActivityEvent = {
    async findAndCountAll({ where = {} }) {
      const rows = activity
        .filter((row) => {
          if (where.clientId && row.clientId !== where.clientId) return false;
          if (where.projectId && row.projectId !== where.projectId) return false;
          if (where.quoteId && row.quoteId !== where.quoteId) return false;
          if (!matchesVisibility(row, where.visibility)) return false;
          return true;
        })
        .map((row) => ({
          ...row,
          actor: row.actorUserId ? users[row.actorUserId] || null : null
        }));
      return { rows, count: rows.length };
    }
  };

  return {
    models: {
      User: {
        async findByPk(id) {
          return users[id] || null;
        }
      },
      ActivityEvent
    }
  };
};

test.afterEach(() => {
  mock.stopAll();
});

test('activity v2 returns company/project/client feeds with role-aware visibility', async () => {
  const stubs = createActivityStubs();
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/activity.js');
  const app = buildExpressApp('/api/v2/activity', route);

  const managerToken = signAccessToken('11111111-1111-4111-8111-111111111111', 'manager');
  const clientToken = signAccessToken('33333333-3333-4333-8333-333333333333', 'client');

  const managerResponse = await request(app)
    .get('/api/v2/activity')
    .set('Authorization', `Bearer ${managerToken}`)
    .expect(200);

  assert.equal(managerResponse.body?.data?.activity?.length, 2);

  const projectResponse = await request(app)
    .get('/api/v2/activity/projects/44444444-4444-4444-8444-444444444444')
    .set('Authorization', `Bearer ${managerToken}`)
    .expect(200);

  assert.equal(projectResponse.body?.data?.activity?.length, 1);

  const filteredProjectResponse = await request(app)
    .get('/api/v2/activity')
    .set('Authorization', `Bearer ${managerToken}`)
    .query({ projectId: '44444444-4444-4444-8444-444444444444' })
    .expect(200);

  assert.equal(filteredProjectResponse.body?.data?.activity?.length, 1);

  const clientResponse = await request(app)
    .get('/api/v2/activity')
    .set('Authorization', `Bearer ${clientToken}`)
    .expect(200);

  assert.equal(clientResponse.body?.data?.activity?.length, 1);
  assert.equal(clientResponse.body?.data?.activity?.[0]?.visibility, 'client');
});
