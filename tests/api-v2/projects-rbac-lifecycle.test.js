const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const createProject = () => ({
  id: '33333333-3333-4333-8333-333333333333',
  title: 'Lifecycle Project',
  status: 'planning',
  isActive: true,
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
      isActive: this.isActive
    };
  }
});

const createStubs = (overrides = {}) => {
  const project = createProject();
  const counts = {
    estimates: 0,
    threads: 0,
    convertedQuotes: 0,
    ...(overrides.counts || {})
  };

  return {
    project,
    models: {
      User: {
        async findByPk(id) {
          if (id === '11111111-1111-4111-8111-111111111111') {
            return {
              id,
              role: 'manager',
              email: 'manager@example.com',
              name: 'Manager',
              isActive: true
            };
          }
          return null;
        }
      },
      Project: {
        async findByPk(id) {
          return id === project.id ? project : null;
        }
      },
      ProjectMedia: {},
      Quote: {
        async count() {
          return counts.convertedQuotes;
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
        }
      }
    }
  };
};

test.afterEach(() => {
  mock.stopAll();
});

test('projects v2 lets a manager update lifecycle fields like status and archive state', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/projects.js');
  const app = buildExpressApp('/api/v2/projects', route);
  const token = signAccessToken('11111111-1111-4111-8111-111111111111', 'manager');

  const response = await request(app)
    .patch('/api/v2/projects/33333333-3333-4333-8333-333333333333')
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'completed', isActive: false })
    .expect(200);

  assert.equal(response.body?.data?.project?.status, 'completed');
  assert.equal(response.body?.data?.project?.isActive, false);
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
  const token = signAccessToken('11111111-1111-4111-8111-111111111111', 'manager');

  const response = await request(app)
    .delete('/api/v2/projects/33333333-3333-4333-8333-333333333333')
    .set('Authorization', `Bearer ${token}`)
    .expect(409);

  assert.equal(response.body?.error?.code, 'project_delete_blocked');
  assert.equal(stubs.project.destroyed, undefined);
});

test('projects v2 lets a manager delete a dependency-free draft project', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/projects.js');
  const app = buildExpressApp('/api/v2/projects', route);
  const token = signAccessToken('11111111-1111-4111-8111-111111111111', 'manager');

  const response = await request(app)
    .delete('/api/v2/projects/33333333-3333-4333-8333-333333333333')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(response.body?.data?.deleted, true);
  assert.equal(response.body?.data?.projectId, '33333333-3333-4333-8333-333333333333');
  assert.equal(stubs.project.destroyed, true);
});
