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

const createGuestQuoteModelsStub = (overrides = {}) => {
  const state = {
    createdQuotes: [],
    createdEvents: [],
    notificationBatches: [],
    managers: [{
      id: 'manager-1',
      role: 'manager',
      isActive: true
    }]
  };

  const Quote = {
    async create(payload) {
      const quote = {
        id: `quote-${state.createdQuotes.length + 1}`,
        publicToken: payload.publicToken || 'public-token-1',
        status: payload.status,
        ...payload
      };
      state.createdQuotes.push(quote);
      return quote;
    }
  };

  const QuoteEvent = {
    async create(payload) {
      state.createdEvents.push(payload);
      return payload;
    }
  };

  const User = {
    async findAll() {
      return state.managers;
    },
    async findByPk() {
      return null;
    }
  };

  const Notification = {
    async bulkCreate(payload) {
      state.notificationBatches.push(payload);
      return payload;
    }
  };

  return {
    state,
    models: {
      Quote,
      QuoteClaimToken: {
        async destroy() {},
        async create() {},
        async findOne() {
          return null;
        }
      },
      User,
      Notification,
      QuoteEvent,
      ...overrides
    }
  };
};

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

  loadRoute('utils/folderGallery.js');
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

test('legacy /api/gallery/services returns raw folder names in alphabetical order and skips empty folders', async () => {
  mockModels(createGalleryModelsStub([]));
  const folderFsMock = {
    promises: {
      async readdir(targetPath, options) {
        if (String(targetPath).endsWith('\\Gallery') && options?.withFileTypes) {
          return [
            { name: 'premium', isDirectory: () => true },
            { name: 'optimized', isDirectory: () => true },
            { name: 'kitchen', isDirectory: () => true },
            { name: 'interior', isDirectory: () => true },
            { name: 'bathroom', isDirectory: () => true },
            { name: 'exterior', isDirectory: () => true }
          ];
        }

        if (String(targetPath).endsWith('\\Gallery\\bathroom')) {
          return ['The Slate Suite.png', 'Rustic Harmony.png'];
        }

        if (String(targetPath).endsWith('\\Gallery\\exterior')) {
          return ['White brickslips.png', 'Brick veneers.jpg', 'charcoal brickslips.png'];
        }

        if (String(targetPath).endsWith('\\Gallery\\interior')) {
          return ['notes.txt'];
        }

        if (String(targetPath).endsWith('\\Gallery\\kitchen')) {
          return ['Obsidian Oak.png', 'Alabaster Horizon.png'];
        }

        return [];
      }
    }
  };
  mock('fs', folderFsMock);
  mock('node:fs', folderFsMock);

  loadRoute('utils/folderGallery.js');
  loadRoute('utils/publicGallery.js');
  const createLegacyGalleryRouter = loadRoute('routes/gallery.js');
  const app = buildExpressApp('/api/gallery', createLegacyGalleryRouter({ galleryPath: 'C:\\fake\\Gallery' }));

  const response = await request(app)
    .get('/api/gallery/services')
    .expect(200);

  assert.equal(response.headers['x-cache'], 'MISS');
  assert.deepEqual(response.body, {
    services: [
      {
        id: 'bathroom',
        name: 'bathroom',
        images: [
          {
            src: '/Gallery/bathroom/Rustic%20Harmony.png',
            label: 'Rustic Harmony'
          },
          {
            src: '/Gallery/bathroom/The%20Slate%20Suite.png',
            label: 'The Slate Suite'
          }
        ]
      },
      {
        id: 'exterior',
        name: 'exterior',
        images: [
          {
            src: '/Gallery/exterior/Brick%20veneers.jpg',
            label: 'Brick Veneers'
          },
          {
            src: '/Gallery/exterior/charcoal%20brickslips.png',
            label: 'Charcoal Brickslips'
          },
          {
            src: '/Gallery/exterior/White%20brickslips.png',
            label: 'White Brickslips'
          }
        ]
      },
      {
        id: 'kitchen',
        name: 'kitchen',
        images: [
          {
            src: '/Gallery/kitchen/Alabaster%20Horizon.png',
            label: 'Alabaster Horizon'
          },
          {
            src: '/Gallery/kitchen/Obsidian%20Oak.png',
            label: 'Obsidian Oak'
          }
        ]
      }
    ]
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

test('legacy /api/quotes/guest creates a guest quote and manager notifications from the public form payload', async () => {
  const { state, models } = createGuestQuoteModelsStub();
  mockModels(models);

  const quotesRouter = loadRoute('routes/quotes.js');
  const app = buildExpressApp('/api/quotes', quotesRouter);

  const response = await request(app)
    .post('/api/quotes/guest')
    .send({
      guestName: 'Olivia Reed',
      guestPhone: '07395448487',
      guestEmail: 'olivia@example.com',
      projectType: 'kitchen',
      budgetRange: '£8,000-£12,000',
      description: 'Kitchen installation and refurbishment with bespoke joinery.',
      location: 'Manchester and the North West'
    })
    .expect(201);

  assert.equal(response.body?.quoteId, 'quote-1');
  assert.equal(response.body?.status, 'pending');
  assert.equal(state.createdQuotes.length, 1);
  assert.equal(state.createdQuotes[0].workflowStatus, 'submitted');
  assert.equal(state.createdQuotes[0].sourceChannel, 'public_web');
  assert.equal(state.createdEvents.length, 1);
  assert.equal(state.notificationBatches.length, 1);
  assert.equal(state.notificationBatches[0][0].type, 'new_quote');
  assert.equal(state.notificationBatches[0][0].quoteId, 'quote-1');
});

test('legacy /api/quotes/guest still succeeds when quote side effects fail', async () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);

  const { state, models } = createGuestQuoteModelsStub({
    QuoteEvent: {
      async create() {
        throw new Error('Quote event store unavailable');
      }
    },
    Notification: {
      async bulkCreate() {
        throw new Error('Notification insert failed');
      }
    }
  });
  mockModels(models);

  const quotesRouter = loadRoute('routes/quotes.js');
  const app = buildExpressApp('/api/quotes', quotesRouter);

  try {
    const response = await request(app)
      .post('/api/quotes/guest')
      .send({
        guestName: 'Olivia Reed',
        guestPhone: '07395448487',
        guestEmail: 'olivia@example.com',
        projectType: 'kitchen',
        budgetRange: '£8,000-£12,000',
        description: 'Kitchen installation and refurbishment with bespoke joinery.',
        location: 'Manchester and the North West'
      })
      .expect(201);

    assert.equal(response.body?.quoteId, 'quote-1');
    assert.equal(state.createdQuotes.length, 1);
    assert.equal(warnings.length >= 2, true);
    assert.equal(
      warnings.some((entry) => JSON.stringify(entry).includes('quote_event_create')),
      true
    );
    assert.equal(
      warnings.some((entry) => JSON.stringify(entry).includes('manager_notification_create')),
      true
    );
  } finally {
    console.warn = originalWarn;
  }
});
