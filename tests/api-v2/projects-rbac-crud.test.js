const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { Op } = require('sequelize');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const createProjectInstance = (store, payload) => {
  const idSuffix = String(store.length + 1).padStart(12, '0');
  const project = {
    id: `20000000-0000-4000-8000-${idSuffix}`,
    title: payload.title,
    location: payload.location || null,
    status: payload.status || 'planning',
    clientId: payload.clientId || null,
    assignedManagerId: payload.assignedManagerId || null,
    quoteId: payload.quoteId || null,
    description: payload.description || null,
    budgetEstimate: payload.budgetEstimate || null,
    startDate: payload.startDate || null,
    endDate: payload.endDate || null,
    showInGallery: Boolean(payload.showInGallery),
    galleryOrder: Number(payload.galleryOrder || 0),
    isActive: typeof payload.isActive === 'boolean' ? payload.isActive : true,
    media: [],
    quote: null,
    client: null,
    assignedManager: null,
    async update(updatePayload) {
      Object.assign(this, updatePayload);
      return this;
    },
    toJSON() {
      return {
        id: this.id,
        title: this.title,
        location: this.location,
        status: this.status,
        clientId: this.clientId,
        assignedManagerId: this.assignedManagerId,
        quoteId: this.quoteId,
        description: this.description,
        budgetEstimate: this.budgetEstimate,
        startDate: this.startDate,
        endDate: this.endDate,
        showInGallery: this.showInGallery,
        galleryOrder: this.galleryOrder,
        isActive: this.isActive,
        media: this.media,
        quote: this.quote,
        client: this.client,
        assignedManager: this.assignedManager
      };
    }
  };
  return project;
};

const createProjectStubs = () => {
  const users = {
    '11111111-1111-4111-8111-111111111111': {
      id: '11111111-1111-4111-8111-111111111111',
      role: 'manager',
      email: 'manager@example.com',
      isActive: true
    },
    '22222222-2222-4222-8222-222222222222': {
      id: '22222222-2222-4222-8222-222222222222',
      role: 'employee',
      email: 'employee@example.com',
      isActive: true
    },
    '33333333-3333-4333-8333-333333333333': {
      id: '33333333-3333-4333-8333-333333333333',
      role: 'client',
      email: 'client@example.com',
      isActive: true
    },
    '44444444-4444-4444-8444-444444444444': {
      id: '44444444-4444-4444-8444-444444444444',
      role: 'client',
      email: 'other@example.com',
      isActive: true
    }
  };

  const projects = [];

  const matchesWhere = (project, where = {}) =>
    Object.entries(where).every(([key, value]) => {
      if (value && typeof value === 'object') return true;
      return project[key] === value;
    });

  const Project = {
    async findAndCountAll({ where = {} }) {
      const rows = projects.filter((project) => matchesWhere(project, where));
      return { rows, count: rows.length };
    },
    async findByPk(id) {
      return projects.find((project) => project.id === id) || null;
    },
    async create(payload) {
      const project = createProjectInstance(projects, payload);
      projects.push(project);
      return project;
    }
  };

  const ProjectMedia = {
    async findAll({ where = {} }) {
      const projectIds = where?.projectId?.[Op.in] || [];
      const counts = new Map();

      projectIds.forEach((projectId) => {
        const project = projects.find((item) => item.id === projectId);
        const media = Array.isArray(project?.media) ? project.media : [];
        const imageCount = media.filter((item) => item.mediaType === 'image').length;
        const documentCount = media.filter((item) => item.mediaType === 'document').length;
        counts.set(projectId, { imageCount, documentCount });
      });

      const rows = [];
      counts.forEach((value, projectId) => {
        rows.push({ projectId, mediaType: 'image', count: String(value.imageCount) });
        rows.push({ projectId, mediaType: 'document', count: String(value.documentCount) });
      });
      return rows;
    }
  };

  const User = {
    async findByPk(id) {
      return users[id] || null;
    }
  };

  return {
    projects,
    models: {
      User,
      Project,
      ProjectMedia,
      Quote: {}
    }
  };
};

test.afterEach(() => {
  mock.stopAll();
});

test('projects v2 RBAC + CRUD for staff/client', async () => {
  const stubs = createProjectStubs();
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/projects.js');
  const app = buildExpressApp('/api/v2/projects', route);

  const managerToken = signAccessToken('11111111-1111-4111-8111-111111111111', 'manager');
  const employeeToken = signAccessToken('22222222-2222-4222-8222-222222222222', 'employee');
  const clientToken = signAccessToken('33333333-3333-4333-8333-333333333333', 'client');
  const otherClientToken = signAccessToken('44444444-4444-4444-8444-444444444444', 'client');

  await request(app)
    .post('/api/v2/projects')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ title: 'Client cannot create' })
    .expect(403);

  const createResponse = await request(app)
    .post('/api/v2/projects')
    .set('Authorization', `Bearer ${employeeToken}`)
    .send({
      title: 'Client Bathroom Project',
      status: 'planning',
      clientId: '33333333-3333-4333-8333-333333333333',
      location: 'Manchester'
    })
    .expect(201);

  const projectId = createResponse.body?.data?.project?.id;
  assert.ok(projectId);

  const clientListResponse = await request(app)
    .get('/api/v2/projects')
    .set('Authorization', `Bearer ${clientToken}`)
    .expect(200);
  assert.equal(clientListResponse.body?.data?.projects?.length, 1);

  stubs.projects[0].media = [
    { id: 'media-image', mediaType: 'image' },
    { id: 'media-doc', mediaType: 'document' }
  ];
  const leanListResponse = await request(app)
    .get('/api/v2/projects?includeMedia=false')
    .set('Authorization', `Bearer ${clientToken}`)
    .expect(200);
  const leanProject = leanListResponse.body?.data?.projects?.[0];
  assert.equal(leanProject?.media, undefined);
  assert.equal(leanProject?.imageCount, 1);
  assert.equal(leanProject?.documentCount, 1);

  await request(app)
    .get(`/api/v2/projects/${projectId}`)
    .set('Authorization', `Bearer ${otherClientToken}`)
    .expect(404);

  await request(app)
    .patch(`/api/v2/projects/${projectId}`)
    .set('Authorization', `Bearer ${managerToken}`)
    .send({ status: 'in_progress' })
    .expect(200);

  const updated = stubs.projects.find((project) => project.id === projectId);
  assert.equal(updated.status, 'in_progress');
});
