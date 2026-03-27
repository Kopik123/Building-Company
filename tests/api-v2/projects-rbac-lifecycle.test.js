const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const MANAGER_ID = '11111111-1111-4111-8111-111111111111';
const EMPLOYEE_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_EMPLOYEE_ID = '44444444-4444-4444-8444-444444444444';
const CLIENT_ID = '55555555-5555-4555-8555-555555555555';
const PROJECT_ID = '33333333-3333-4333-8333-333333333333';

const createProject = (overrides = {}) => ({
  id: PROJECT_ID,
  title: 'Lifecycle Project',
  status: 'planning',
  projectStage: 'briefing',
  isActive: true,
  assignedManagerId: MANAGER_ID,
  acceptedEstimateId: null,
  currentMilestone: null,
  workPackage: null,
  dueDate: null,
  async update(payload) {
    Object.assign(this, payload);
    return this;
  },
  async destroy() {
    this.destroyed = true;
  },
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      status: this.status,
      projectStage: this.projectStage,
      isActive: this.isActive,
      assignedManagerId: this.assignedManagerId,
      acceptedEstimateId: this.acceptedEstimateId,
      currentMilestone: this.currentMilestone,
      workPackage: this.workPackage,
      dueDate: this.dueDate
    };
  },
  ...overrides
});

const createStubs = (overrides = {}) => {
  const project = createProject(overrides.project);
  const counts = {
    estimates: 0,
    threads: 0,
    convertedQuotes: 0,
    ...(overrides.counts || {})
  };
  const state = {
    createdPayload: null,
    syncedThreadUpdates: []
  };

  const usersById = {
    [MANAGER_ID]: {
      id: MANAGER_ID,
      role: 'manager',
      email: 'manager@example.com',
      name: 'Manager',
      isActive: true
    },
    [EMPLOYEE_ID]: {
      id: EMPLOYEE_ID,
      role: 'employee',
      email: 'owner@example.com',
      name: 'Owner Employee',
      isActive: true
    },
    [OTHER_EMPLOYEE_ID]: {
      id: OTHER_EMPLOYEE_ID,
      role: 'employee',
      email: 'other@example.com',
      name: 'Other Employee',
      isActive: true
    },
    [CLIENT_ID]: {
      id: CLIENT_ID,
      role: 'client',
      email: 'client@example.com',
      name: 'Client',
      isActive: true
    }
  };

  return {
    project,
    state,
    models: {
      User: {
        async findByPk(id) {
          return usersById[id] || null;
        }
      },
      Project: {
        async findByPk(id) {
          return id === project.id ? project : null;
        },
        async create(payload) {
          state.createdPayload = payload;
          return createProject({
            id: '66666666-6666-4666-8666-666666666666',
            ...payload
          });
        }
      },
      ProjectMedia: {
        async findAll() {
          return [];
        }
      },
      Quote: {
        async count() {
          return counts.convertedQuotes;
        },
        async findByPk(id) {
          if (overrides.quote && id === overrides.quote.id) return overrides.quote;
          return null;
        }
      },
      Estimate: {
        async count() {
          return counts.estimates;
        }
      },
      GroupThread: {
        async count() {
          return counts.threads;
        },
        async update(payload, options) {
          state.syncedThreadUpdates.push({ payload, options });
          return [1];
        }
      },
      ActivityEvent: {}
    }
  };
};

test.afterEach(() => {
  mock.stopAll();
});

test('projects v2 lets a manager update lifecycle fields like status, stage and archive state', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/projects.js');
  const app = buildExpressApp('/api/v2/projects', route);
  const token = signAccessToken(MANAGER_ID, 'manager');

  const response = await request(app)
    .patch(`/api/v2/projects/${PROJECT_ID}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      status: 'completed',
      projectStage: 'handover',
      currentMilestone: 'Final snagging',
      dueDate: '2026-04-12',
      isActive: false
    })
    .expect(200);

  assert.equal(response.body?.data?.project?.status, 'completed');
  assert.equal(response.body?.data?.project?.projectStage, 'handover');
  assert.equal(response.body?.data?.project?.currentMilestone, 'Final snagging');
  assert.equal(response.body?.data?.project?.dueDate, '2026-04-12');
  assert.equal(response.body?.data?.project?.isActive, false);
});

test('projects v2 seeds linked quote defaults and syncs quote chat links on create', async () => {
  const stubs = createStubs({
    quote: {
      id: '77777777-7777-4777-8777-777777777777',
      clientId: CLIENT_ID,
      assignedManagerId: EMPLOYEE_ID,
      location: 'Leeds',
      description: 'Linked quote scope',
      currentEstimateId: '88888888-8888-4888-8888-888888888888'
    }
  });
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/projects.js');
  const app = buildExpressApp('/api/v2/projects', route);
  const token = signAccessToken(MANAGER_ID, 'manager');

  const response = await request(app)
    .post('/api/v2/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Seeded project',
      quoteId: '77777777-7777-4777-8777-777777777777',
      projectStage: 'scope_locked'
    })
    .expect(201);

  assert.equal(stubs.state.createdPayload?.clientId, CLIENT_ID);
  assert.equal(stubs.state.createdPayload?.assignedManagerId, EMPLOYEE_ID);
  assert.equal(stubs.state.createdPayload?.location, 'Leeds');
  assert.equal(stubs.state.createdPayload?.description, 'Linked quote scope');
  assert.equal(stubs.state.createdPayload?.acceptedEstimateId, '88888888-8888-4888-8888-888888888888');
  assert.equal(response.body?.data?.project?.projectStage, 'scope_locked');
  assert.equal(stubs.state.syncedThreadUpdates.length, 1);
  assert.deepEqual(stubs.state.syncedThreadUpdates[0], {
    payload: { projectId: '66666666-6666-4666-8666-666666666666' },
    options: {
      where: {
        projectId: null,
        quoteId: '77777777-7777-4777-8777-777777777777'
      }
    }
  });
});

test('projects v2 lets an employee owner update their own project route', async () => {
  const stubs = createStubs({
    project: {
      assignedManagerId: EMPLOYEE_ID
    }
  });
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/projects.js');
  const app = buildExpressApp('/api/v2/projects', route);
  const token = signAccessToken(EMPLOYEE_ID, 'employee');

  const response = await request(app)
    .patch(`/api/v2/projects/${PROJECT_ID}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      projectStage: 'installation',
      workPackage: 'Stone and carpentry fit-out'
    })
    .expect(200);

  assert.equal(response.body?.data?.project?.projectStage, 'installation');
  assert.equal(response.body?.data?.project?.workPackage, 'Stone and carpentry fit-out');
});

test('projects v2 blocks an unassigned employee from mutating another project route', async () => {
  const stubs = createStubs({
    project: {
      assignedManagerId: MANAGER_ID
    }
  });
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/projects.js');
  const app = buildExpressApp('/api/v2/projects', route);
  const token = signAccessToken(OTHER_EMPLOYEE_ID, 'employee');

  const response = await request(app)
    .patch(`/api/v2/projects/${PROJECT_ID}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ projectStage: 'installation' })
    .expect(403);

  assert.equal(response.body?.error?.code, 'project_forbidden');
  assert.equal(stubs.project.projectStage, 'briefing');
});

test('projects v2 blocks deletion once linked delivery records exist', async () => {
  const stubs = createStubs({
    counts: {
      estimates: 1,
      threads: 1,
      convertedQuotes: 0
    }
  });
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/projects.js');
  const app = buildExpressApp('/api/v2/projects', route);
  const token = signAccessToken(MANAGER_ID, 'manager');

  const response = await request(app)
    .delete(`/api/v2/projects/${PROJECT_ID}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(409);

  assert.equal(response.body?.error?.code, 'project_delete_blocked');
  assert.equal(stubs.project.destroyed, undefined);
});

test('projects v2 lets an employee owner delete a dependency-free draft project', async () => {
  const stubs = createStubs({
    project: {
      assignedManagerId: EMPLOYEE_ID
    }
  });
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/projects.js');
  const app = buildExpressApp('/api/v2/projects', route);
  const token = signAccessToken(EMPLOYEE_ID, 'employee');

  const response = await request(app)
    .delete(`/api/v2/projects/${PROJECT_ID}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(response.body?.data?.deleted, true);
  assert.equal(response.body?.data?.projectId, PROJECT_ID);
  assert.equal(stubs.project.destroyed, true);
});
