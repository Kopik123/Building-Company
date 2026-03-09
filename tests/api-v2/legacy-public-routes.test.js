const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { clearPublicCaches } = require('../../utils/publicCache');
const { buildExpressApp, loadRoute, mock, mockModels } = require('./_helpers');

const originalContactEnv = {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  CONTACT_TO: process.env.CONTACT_TO,
  CONTACT_FROM: process.env.CONTACT_FROM
};

const restoreContactEnv = () => {
  Object.entries(originalContactEnv).forEach(([key, value]) => {
    if (typeof value === 'undefined') {
      delete process.env[key];
      return;
    }
    process.env[key] = value;
  });
};

const createGalleryModelsStub = (projects) => ({
  Project: {
    async findAll() {
      return projects;
    }
  },
  ProjectMedia: {}
});

test.afterEach(() => {
  clearPublicCaches();
  restoreContactEnv();
  mock.stopAll();
});

test('legacy /api/gallery returns managed projects with flattened image list', async () => {
  mockModels(createGalleryModelsStub([
    {
      id: 'gallery-project-1',
      title: 'Gallery project',
      location: 'Sale',
      media: [
        {
          url: '/uploads/gallery-cover.jpg',
          mediaType: 'image',
          showInGallery: true,
          isCover: true,
          galleryOrder: 5,
          filename: 'gallery-cover.jpg'
        },
        {
          url: '/uploads/gallery-detail.jpg',
          mediaType: 'image',
          showInGallery: true,
          isCover: false,
          galleryOrder: 1,
          filename: 'gallery-detail.jpg'
        }
      ]
    }
  ]));

  loadRoute('utils/publicGallery.js');
  const createLegacyGalleryRouter = loadRoute('routes/gallery.js');
  const app = buildExpressApp('/api/gallery', createLegacyGalleryRouter({ galleryPath: 'C:\\fake\\Gallery' }));

  const response = await request(app)
    .get('/api/gallery')
    .expect(200);

  assert.match(response.headers['cache-control'], /public, max-age=\d+, stale-while-revalidate=\d+/);
  assert.deepEqual(response.body, {
    images: ['/uploads/gallery-cover.jpg', '/uploads/gallery-detail.jpg'],
    projects: [
      {
        id: 'gallery-project-1',
        name: 'Gallery project',
        location: 'Sale',
        images: ['/uploads/gallery-cover.jpg', '/uploads/gallery-detail.jpg']
      }
    ]
  });
});

test('legacy /api/gallery falls back to filesystem images when no managed projects exist', async () => {
  mockModels(createGalleryModelsStub([]));
  mock('fs', {
    promises: {
      async readdir() {
        return ['site-shot-20240102.jpg', 'notes.txt', 'site-shot-20240215.webp'];
      }
    }
  });

  loadRoute('utils/publicGallery.js');
  const createLegacyGalleryRouter = loadRoute('routes/gallery.js');
  const app = buildExpressApp('/api/gallery', createLegacyGalleryRouter({ galleryPath: 'C:\\fake\\Gallery' }));

  const response = await request(app)
    .get('/api/gallery')
    .expect(200);

  assert.deepEqual(response.body, {
    images: ['site-shot-20240215.webp', 'site-shot-20240102.jpg'],
    projects: []
  });
});

test('legacy /api/contact sends email for a valid enquiry', async () => {
  let transporterConfig = null;
  let sentMail = null;

  process.env.SMTP_HOST = 'smtp.example.test';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_SECURE = 'false';
  process.env.CONTACT_TO = 'studio@example.test';
  process.env.CONTACT_FROM = 'no-reply@example.test';
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;

  mock('nodemailer', {
    createTransport(config) {
      transporterConfig = config;
      return {
        async sendMail(payload) {
          sentMail = payload;
        }
      };
    }
  });

  const createContactRouter = loadRoute('routes/contact.js');
  const app = buildExpressApp('/api/contact', createContactRouter());

  const response = await request(app)
    .post('/api/contact')
    .send({
      name: 'Olivia Reed',
      email: 'olivia@example.com',
      phone: '+447000111222',
      location: 'Manchester',
      projectType: 'bathroom',
      budget: '£8,000-£20,000',
      message: 'Looking for a private consultation.'
    })
    .expect(200);

  assert.deepEqual(response.body, { ok: true });
  assert.equal(transporterConfig?.host, 'smtp.example.test');
  assert.equal(sentMail?.to, 'studio@example.test');
  assert.equal(sentMail?.replyTo, 'olivia@example.com');
  assert.match(sentMail?.subject || '', /Olivia Reed/);
  assert.match(sentMail?.text || '', /private consultation/i);
});

test('legacy /api/contact returns 503 when email service is not configured', async () => {
  delete process.env.SMTP_HOST;
  delete process.env.CONTACT_TO;

  const createContactRouter = loadRoute('routes/contact.js');
  const app = buildExpressApp('/api/contact', createContactRouter());

  const response = await request(app)
    .post('/api/contact')
    .send({
      name: 'Olivia Reed',
      email: 'olivia@example.com',
      message: 'Please call me back.'
    })
    .expect(503);

  assert.equal(response.body?.error, 'Email service is not configured yet.');
});
