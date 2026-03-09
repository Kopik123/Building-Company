const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { Op } = require('sequelize');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const createProjectInstance = () => ({
  id: 'project-1',
  title: 'Manager Project',
  location: 'Manchester',
  status: 'planning',
  client: { id: 'client-1', email: 'client@example.com', name: 'Client' },
  assignedManager: { id: 'manager-1', email: 'manager@example.com', name: 'Manager' },
  media: [
    { id: 'm-image', mediaType: 'image', filename: 'a.jpg', galleryOrder: 0, isCover: true },
    { id: 'm-doc', mediaType: 'document', filename: 'a.pdf', galleryOrder: 0, isCover: false }
  ],
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      location: this.location,
      status: this.status,
      client: this.client,
      assignedManager: this.assignedManager,
      media: this.media
    };
  }
});

const createStubs = () => {
  const users = {
    '11111111-1111-4111-8111-111111111111': {
      id: '11111111-1111-4111-8111-111111111111',
      role: 'manager',
      email: 'manager@example.com',
      name: 'Manager',
      isActive: true
    }
  };
  const project = createProjectInstance();

  return {
    models: {
      User: {
        async findByPk(id) {
          return users[id] || null;
        }
      },
      Quote: {},
      GroupThread: {},
      GroupMember: {},
      Notification: {},
      ServiceOffering: {},
      Material: {},
      sequelize: {},
      Project: {
        async findAndCountAll() {
          return { rows: [project], count: 1 };
        }
      },
      ProjectMedia: {
        async findAll({ where = {} }) {
          const ids = where?.projectId?.[Op.in] || [];
          if (!ids.includes(project.id)) return [];
          return [
            { projectId: project.id, mediaType: 'image', count: '1' },
            { projectId: project.id, mediaType: 'document', count: '1' }
          ];
        }
      }
    }
  };
};

test.afterEach(() => {
  mock.stopAll();
});

test('manager projects supports includeMedia=false with count fields only', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);

  const route = loadRoute('routes/manager.js');
  const app = buildExpressApp('/api/manager', route);
  const token = signAccessToken('11111111-1111-4111-8111-111111111111', 'manager');

  const leanResponse = await request(app)
    .get('/api/manager/projects?includeMedia=false')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  const leanProject = leanResponse.body?.projects?.[0];
  assert.equal(leanProject?.media, undefined);
  assert.equal(leanProject?.imageCount, 1);
  assert.equal(leanProject?.documentCount, 1);

  const fullResponse = await request(app)
    .get('/api/manager/projects?includeMedia=true')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  const fullProject = fullResponse.body?.projects?.[0];
  assert.equal(Array.isArray(fullProject?.media), true);
  assert.equal(fullProject?.media?.length, 2);
});
