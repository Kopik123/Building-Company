const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { clearPublicCaches } = require('../../utils/publicCache');
const { loadRoute, mock, mockModels } = require('./_helpers');

const createModelsStub = () => ({
  Project: {
    async findAll() {
      return [
        {
          id: 'legacy-project-1',
          title: 'Legacy project',
          location: 'Manchester',
          media: [
            {
              url: '/uploads/legacy-cover.jpg',
              mediaType: 'image',
              showInGallery: true,
              isCover: true,
              galleryOrder: 3,
              filename: 'legacy-cover.jpg'
            },
            {
              url: '/uploads/legacy-detail.jpg',
              mediaType: 'image',
              showInGallery: true,
              isCover: false,
              galleryOrder: 1,
              filename: 'legacy-detail.jpg'
            }
          ]
        }
      ];
    }
  },
  ProjectMedia: {},
  ServiceOffering: {},
  User: {},
  SessionRefreshToken: {},
  Quote: {},
  QuoteClaimToken: {},
  Notification: {},
  MessageThread: {},
  Message: {},
  MaterialInventory: {},
  ProjectTimelineEvent: {},
  ProjectDocument: {},
  ProjectAssignment: {},
  DevicePushToken: {}
});

test.afterEach(() => {
  clearPublicCaches();
  mock.stopAll();
});

test('createApp keeps the legacy gallery contract unchanged', async () => {
  mockModels(createModelsStub());

  const { createApp } = loadRoute('app.js');
  const app = createApp();

  const first = await request(app)
    .get('/api/gallery/projects')
    .expect(200);

  assert.equal(first.headers['x-cache'], 'MISS');
  assert.deepEqual(first.body, {
    projects: [
      {
        id: 'legacy-project-1',
        name: 'Legacy project',
        location: 'Manchester',
        images: ['/uploads/legacy-cover.jpg', '/uploads/legacy-detail.jpg']
      }
    ]
  });

  const second = await request(app)
    .get('/api/gallery/projects')
    .expect(200);

  assert.equal(second.headers['x-cache'], 'HIT');
});

test('createApp keeps legacy contact validation and api 404 responses', async () => {
  mockModels(createModelsStub());

  const { createApp } = loadRoute('app.js');
  const app = createApp();

  const contact = await request(app)
    .post('/api/contact')
    .send({ name: '', email: '', message: '' })
    .expect(400);

  assert.equal(contact.body?.error, 'Name, email and message are required.');

  const missingRoute = await request(app)
    .get('/api/not-a-route')
    .expect(404);

  assert.equal(missingRoute.body?.error, 'API route not found');
});

test('createApp exposes a simple healthz endpoint for process checks', async () => {
  mockModels(createModelsStub());

  const { createApp } = loadRoute('app.js');
  const app = createApp();

  const response = await request(app)
    .get('/healthz')
    .expect(200);

  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.body?.status, 'ok');
  assert.equal(response.body?.service, 'building-company');
  assert.equal(typeof response.body?.uptimeSeconds, 'number');
});
