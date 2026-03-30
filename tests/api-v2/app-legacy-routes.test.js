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

test('public quote API paths are excluded from the global limiter and use a dedicated quote limiter', async () => {
  mockModels(createModelsStub());

  const capturedRateLimitOptions = [];
  mock('express-rate-limit', (options = {}) => {
    capturedRateLimitOptions.push(options);
    return (_req, _res, next) => next();
  });

  const { createApp, isPublicQuoteApiPath } = loadRoute('app.js');
  createApp();

  assert.equal(isPublicQuoteApiPath('/api/quotes/guest'), true);
  assert.equal(isPublicQuoteApiPath('/api/quotes/guest/abc123/attachments'), true);
  assert.equal(isPublicQuoteApiPath('/api/v2/public/quotes'), true);
  assert.equal(isPublicQuoteApiPath('/api/v2/public/quotes/abc123/claim/request'), true);
  assert.equal(isPublicQuoteApiPath('/api/manager/projects'), false);

  const globalLimiterOptions = capturedRateLimitOptions.find((entry) => entry.max === 150);
  const publicQuoteLimiterOptions = capturedRateLimitOptions.find((entry) => entry.max === 50);
  const authLimiterOptions = capturedRateLimitOptions.find((entry) => entry.max === 20);
  const claimLimiterOptions = capturedRateLimitOptions.find((entry) => entry.max === 10 && entry.windowMs === 15 * 60 * 1000);

  assert.ok(globalLimiterOptions?.skip, 'global limiter should skip public quote paths');
  assert.equal(globalLimiterOptions.skip({ originalUrl: '/api/v2/public/quotes' }), true);
  assert.equal(globalLimiterOptions.skip({ originalUrl: '/api/quotes/guest/abc123/attachments' }), true);
  assert.equal(globalLimiterOptions.skip({ originalUrl: '/api/manager/projects' }), false);
  assert.equal(publicQuoteLimiterOptions?.windowMs, 15 * 60 * 1000);
  assert.equal(authLimiterOptions?.windowMs, 15 * 60 * 1000);
  assert.equal(claimLimiterOptions?.windowMs, 15 * 60 * 1000);
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

test('createApp caches versioned frontend assets while keeping html and mutable media fresh contracts stable', async () => {
  mockModels(createModelsStub());

  const { createApp } = loadRoute('app.js');
  const app = createApp();

  const cssResponse = await request(app)
    .get('/styles/base.css')
    .expect(200);

  const imageResponse = await request(app)
    .get('/mainbackground.png')
    .expect(200);

  const htmlResponse = await request(app)
    .get('/index.html')
    .expect(200);

  assert.equal(cssResponse.headers['cache-control'], 'public, max-age=31536000, immutable');
  assert.equal(imageResponse.headers['cache-control'], 'public, max-age=604800, stale-while-revalidate=86400');
  assert.equal(htmlResponse.headers['cache-control'], 'no-store');
  assert.match(htmlResponse.text, /\/styles\/base\.css\?v=/);
  assert.match(htmlResponse.text, /\/site\.js\?v=/);
  assert.match(htmlResponse.text, /\/assets\/optimized\/brand\/title\.png\?v=/);
});

test('createApp exposes the web-v2 rollout shell under /app-v2 with client-side route fallback', async () => {
  mockModels(createModelsStub());

  const { createApp } = loadRoute('app.js');
  const app = createApp();

  const routeResponse = await request(app)
    .get('/app-v2')
    .expect(200);

  const nestedRouteResponse = await request(app)
    .get('/app-v2/projects')
    .expect(200);

  assert.equal(routeResponse.headers['cache-control'], 'no-store');
  assert.match(routeResponse.text, /levels\+lines Control Panel v2/i);
  assert.match(routeResponse.text, /\/app-v2\/assets\//);
  assert.match(nestedRouteResponse.text, /<div id="root"><\/div>/);
});
