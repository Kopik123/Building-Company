const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
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
  CLAIM_SMS_WEBHOOK_URL: process.env.CLAIM_SMS_WEBHOOK_URL,
  CONTACT_TO: process.env.CONTACT_TO,
  CONTACT_FROM: process.env.CONTACT_FROM
};
const originalFetch = global.fetch;

const restoreContactEnv = () => {
  Object.entries(originalContactEnv).forEach(([key, value]) => {
    if (typeof value === 'undefined') {
      delete process.env[key];
      return;
    }
    process.env[key] = value;
  });
};
const uploadCleanupPaths = new Set();

const registerUploadCleanup = (attachments = []) => {
  attachments.forEach((attachment) => {
    if (attachment?.storagePath) uploadCleanupPaths.add(attachment.storagePath);
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
    createPayloads: [],
    updatedQuotes: [],
    createdAttachments: [],
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
      state.createPayloads.push(payload);
      const quote = {
        id: `quote-${state.createdQuotes.length + 1}`,
        publicToken: payload.publicToken || 'public-token-1',
        status: payload.status,
        ...payload,
        async update(patch) {
          Object.assign(this, patch);
          state.updatedQuotes.push({ id: this.id, patch });
          return this;
        }
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

  const QuoteAttachment = {
    async bulkCreate(rows) {
      const attachments = rows.map((row, index) => ({
        id: `quote-attachment-${state.createdAttachments.length + index + 1}`,
        createdAt: '2026-03-24T21:00:00Z',
        updatedAt: '2026-03-24T21:00:00Z',
        ...row
      }));
      state.createdAttachments.push(...attachments);
      registerUploadCleanup(attachments);
      return attachments;
    }
  };

  return {
    state,
    models: {
      sequelize: {
        async transaction(handler) {
          return handler({ id: 'test-transaction' });
        }
      },
      Quote,
      QuoteAttachment,
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
  global.fetch = originalFetch;
  mock.stopAll();
});

test.afterEach(async () => {
  const paths = [...uploadCleanupPaths];
  uploadCleanupPaths.clear();
  await Promise.all(paths.map(async (targetPath) => {
    try {
      await fs.unlink(targetPath);
    } catch (_error) {
      // Uploaded test fixtures are best-effort cleanup only.
    }
  }));
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
      proposalDetails: JSON.stringify({
        version: 1,
        source: 'public_quote_form_v2',
        projectScope: {
          propertyType: 'semi_detached',
          roomsInvolved: ['kitchen', 'utility'],
          occupancyStatus: 'living_in_home',
          planningStage: 'getting_prices',
          targetStartWindow: 'within_3_months',
          siteAccess: 'easy_ground_floor'
        },
        commercial: {
          budgetRange: 'Â£8,000-Â£12,000',
          finishLevel: 'premium'
        },
        logistics: {
          location: 'Manchester and the North West',
          postcode: 'M20 1AA'
        },
        priorities: ['finish_quality', 'storage'],
        brief: {
          summary: 'Kitchen installation and refurbishment with bespoke joinery.',
          mustHaves: 'Island seating and integrated storage.',
          constraints: 'We are living in the home during works.'
        }
      }),
      location: 'Manchester and the North West'
    })
    .expect(201);

  assert.equal(response.body?.quoteId, 'quote-1');
  assert.equal(response.body?.status, 'pending');
  assert.equal(state.createdQuotes.length, 1);
  assert.equal(state.createdQuotes[0].workflowStatus, 'submitted');
  assert.equal(state.createdQuotes[0].sourceChannel, 'public_web');
  assert.equal(state.createdQuotes[0].proposalDetails?.projectScope?.propertyType, 'semi_detached');
  assert.match(state.createdQuotes[0].description || '', /Property type: Semi Detached/i);
  assert.match(state.createdQuotes[0].description || '', /Must haves: Island seating and integrated storage\./i);
  assert.equal(state.createdEvents.length, 1);
  assert.equal(state.notificationBatches.length, 1);
  assert.equal(state.notificationBatches[0][0].type, 'new_quote');
  assert.equal(state.notificationBatches[0][0].quoteId, 'quote-1');
});

test('legacy /api/quotes/guest accepts attached quote photos and returns attachment metadata', async () => {
  const { state, models } = createGuestQuoteModelsStub();
  mockModels(models);

  const quotesRouter = loadRoute('routes/quotes.js');
  const app = buildExpressApp('/api/quotes', quotesRouter);

  const response = await request(app)
    .post('/api/quotes/guest')
    .field('guestName', 'Olivia Reed')
    .field('guestPhone', '07395448487')
    .field('guestEmail', 'olivia@example.com')
    .field('projectType', 'kitchen')
    .field('budgetRange', '£8,000-£12,000')
    .field('description', 'Kitchen installation and refurbishment with bespoke joinery.')
    .field('location', 'Manchester and the North West')
    .attach('files', Buffer.from('fake-image-a'), { filename: 'room-a.jpg', contentType: 'image/jpeg' })
    .attach('files', Buffer.from('fake-image-b'), { filename: 'room-b.png', contentType: 'image/png' })
    .expect(201);

  assert.equal(response.body?.quoteId, 'quote-1');
  assert.equal(response.body?.attachmentCount, 2);
  assert.equal(Array.isArray(response.body?.attachments), true);
  assert.equal(response.body.attachments.length, 2);
  assert.equal(state.createdAttachments.length, 2);
  assert.equal(state.createdEvents[0]?.data?.attachmentCount, 2);
  assert.equal(state.notificationBatches[0][0]?.data?.attachmentCount, 2);
});

test('legacy /api/quotes/guest/:publicToken returns private quote preview data with attachments', async () => {
  mockModels({
    sequelize: {
      async transaction(handler) {
        return handler({ id: 'test-transaction' });
      }
    },
    Quote: {
      async findOne({ where }) {
        if (where?.publicToken !== 'guest-preview-token' || where?.isGuest !== true) {
          return null;
        }

        return {
          toJSON() {
            return {
              id: 'quote-preview-1',
              projectType: 'kitchen',
              location: 'Manchester and the North West',
              status: 'pending',
              workflowStatus: 'submitted',
              guestEmail: 'guest@example.com',
              guestPhone: '07395448487',
              proposalDetails: {
                version: 1,
                source: 'public_quote_form_v2',
                projectScope: {
                  propertyType: 'detached',
                  roomsInvolved: ['kitchen'],
                  occupancyStatus: 'empty_property',
                  planningStage: 'ready_to_start',
                  targetStartWindow: 'asap',
                  siteAccess: 'restricted_parking'
                },
                commercial: {
                  budgetRange: 'Â£12,000-Â£20,000',
                  finishLevel: 'premium'
                },
                logistics: {
                  location: 'Manchester and the North West',
                  postcode: 'M20 1AA'
                },
                priorities: ['speed'],
                brief: {
                  summary: 'Fast kitchen turnaround.',
                  mustHaves: 'Stone worktop.',
                  constraints: 'Parking permits nearby.'
                }
              },
              priority: 'medium',
              createdAt: '2026-03-24T21:30:00Z',
              updatedAt: '2026-03-24T21:45:00Z',
              submittedAt: '2026-03-24T21:30:00Z',
              assignedAt: null,
              convertedAt: null,
              closedAt: null,
              attachments: [
                {
                  id: 'attachment-2',
                  filename: 'quote-photo-b.png',
                  url: '/uploads/quote-photo-b.png',
                  mimeType: 'image/png',
                  sizeBytes: 20480,
                  createdAt: '2026-03-24T21:32:00Z',
                  updatedAt: '2026-03-24T21:32:00Z'
                },
                {
                  id: 'attachment-1',
                  filename: 'quote-photo-a.jpg',
                  url: '/uploads/quote-photo-a.jpg',
                  mimeType: 'image/jpeg',
                  sizeBytes: 10240,
                  createdAt: '2026-03-24T21:31:00Z',
                  updatedAt: '2026-03-24T21:31:00Z'
                }
              ]
            };
          }
        };
      }
    },
    QuoteAttachment: {},
    QuoteClaimToken: {
      async destroy() {},
      async create() {},
      async findOne() {
        return null;
      }
    },
    User: {
      async findAll() {
        return [];
      },
      async findByPk() {
        return null;
      }
    },
    Notification: {
      async bulkCreate() {
        return [];
      }
    },
    QuoteEvent: {
      async create() {
        return null;
      }
    }
  });

  const quotesRouter = loadRoute('routes/quotes.js');
  const app = buildExpressApp('/api/quotes', quotesRouter);

  const response = await request(app)
    .get('/api/quotes/guest/guest-preview-token')
    .expect(200);

  assert.equal(response.body?.quote?.id, 'quote-preview-1');
  assert.equal(response.body?.quote?.attachmentCount, 2);
  assert.equal(response.body?.quote?.proposalDetails?.projectScope?.propertyType, 'detached');
  assert.deepEqual(response.body?.quote?.attachments, [
    {
      name: 'quote-photo-a.jpg',
      url: '/uploads/quote-photo-a.jpg',
      size: 10240,
      mimeType: 'image/jpeg'
    },
    {
      name: 'quote-photo-b.png',
      url: '/uploads/quote-photo-b.png',
      size: 20480,
      mimeType: 'image/png'
    }
  ]);
  assert.equal(response.body?.quote?.canClaim, true);
  assert.deepEqual(response.body?.quote?.claimChannels, ['email', 'phone']);
  assert.equal(response.body?.quote?.maskedGuestEmail, 'gu***@e***.com');
  assert.equal(response.body?.quote?.maskedGuestPhone, '0739***87');
});

test('legacy /api/quotes/guest/:publicToken/attachments appends more guest quote photos and returns the refreshed preview', async () => {
  const notificationBatches = [];
  const createdEvents = [];
  let attachmentId = 3;
  const attachmentsState = [
    {
      id: 'attachment-1',
      filename: 'quote-photo-a.jpg',
      url: '/uploads/quote-photo-a.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 10240,
      createdAt: '2026-03-24T21:31:00Z',
      updatedAt: '2026-03-24T21:31:00Z'
    },
    {
      id: 'attachment-2',
      filename: 'quote-photo-b.png',
      url: '/uploads/quote-photo-b.png',
      mimeType: 'image/png',
      sizeBytes: 20480,
      createdAt: '2026-03-24T21:32:00Z',
      updatedAt: '2026-03-24T21:32:00Z'
    }
  ];

  mockModels({
    sequelize: {
      async transaction(handler) {
        return handler({ id: 'test-transaction' });
      }
    },
    Quote: {
      async findOne({ where }) {
        if (where?.publicToken !== 'guest-preview-token' || where?.isGuest !== true) {
          return null;
        }

        return {
          id: 'quote-preview-1',
          guestName: 'Guest Example',
          guestEmail: 'guest@example.com',
          guestPhone: '07395448487',
          toJSON() {
            return {
              id: 'quote-preview-1',
              guestName: 'Guest Example',
              guestEmail: 'guest@example.com',
              guestPhone: '07395448487',
              projectType: 'kitchen',
              location: 'Manchester and the North West',
              status: 'pending',
              workflowStatus: 'submitted',
              priority: 'medium',
              createdAt: '2026-03-24T21:30:00Z',
              updatedAt: '2026-03-24T21:45:00Z',
              submittedAt: '2026-03-24T21:30:00Z',
              assignedAt: null,
              convertedAt: null,
              closedAt: null,
              attachments: [...attachmentsState]
            };
          }
        };
      }
    },
    QuoteAttachment: {
      async bulkCreate(rows) {
        const created = rows.map((row, index) => ({
          id: `attachment-${attachmentId + index}`,
          createdAt: `2026-03-24T21:4${index + 1}:00Z`,
          updatedAt: `2026-03-24T21:4${index + 1}:00Z`,
          ...row
        }));
        attachmentId += rows.length;
        attachmentsState.push(...created);
        registerUploadCleanup(created);
        return created;
      }
    },
    QuoteClaimToken: {
      async destroy() {},
      async create() {},
      async findOne() {
        return null;
      }
    },
    User: {
      async findAll() {
        return [{ id: 'manager-1', role: 'manager', isActive: true }];
      },
      async findByPk() {
        return null;
      }
    },
    Notification: {
      async bulkCreate(payload) {
        notificationBatches.push(payload);
        return payload;
      }
    },
    QuoteEvent: {
      async create(payload) {
        createdEvents.push(payload);
        return payload;
      }
    }
  });

  const quotesRouter = loadRoute('routes/quotes.js');
  const app = buildExpressApp('/api/quotes', quotesRouter);

  const response = await request(app)
    .post('/api/quotes/guest/guest-preview-token/attachments')
    .attach('files', Buffer.from('follow-up-image-a'), { filename: 'follow-up-a.jpg', contentType: 'image/jpeg' })
    .attach('files', Buffer.from('follow-up-image-b'), { filename: 'follow-up-b.png', contentType: 'image/png' })
    .expect(201);

  assert.equal(response.body?.message, 'Added 2 photos to your quote.');
  assert.equal(response.body?.quote?.attachmentCount, 4);
  assert.equal(response.body?.quote?.attachments?.length, 4);
  assert.equal(response.body?.quote?.attachments?.[2]?.name, 'follow-up-a.jpg');
  assert.equal(response.body?.quote?.attachments?.[3]?.name, 'follow-up-b.png');
  assert.equal(createdEvents.length, 1);
  assert.equal(createdEvents[0]?.eventType, 'quote_attachments_added');
  assert.equal(createdEvents[0]?.data?.totalAttachmentCount, 4);
  assert.equal(notificationBatches.length, 1);
  assert.equal(notificationBatches[0][0]?.title, 'Additional quote photos from Guest Example');
  assert.equal(notificationBatches[0][0]?.data?.totalAttachmentCount, 4);
});

test('legacy /api/quotes/guest/:id/claim/request sends a claim code and returns a masked target hint', async () => {
  const quoteId = '11111111-1111-4111-8111-111111111111';
  let smsRequest = null;
  const destroyedClaims = [];
  const createdClaims = [];

  process.env.CLAIM_SMS_WEBHOOK_URL = 'https://sms.example.test/send';
  global.fetch = async (url, options = {}) => {
    smsRequest = {
      url,
      options
    };
    return {
      ok: true
    };
  };

  mockModels({
    sequelize: {
      async transaction(handler) {
        return handler({ id: 'test-transaction' });
      }
    },
    Quote: {
      async findOne({ where }) {
        assert.equal(where?.id, quoteId);
        assert.equal(where?.isGuest, true);
        return {
          id: quoteId,
          isGuest: true,
          guestEmail: 'guest@example.com',
          guestPhone: '07395448487'
        };
      }
    },
    QuoteAttachment: {},
    QuoteClaimToken: {
      async destroy(payload) {
        destroyedClaims.push(payload);
      },
      async create(payload) {
        createdClaims.push(payload);
        return payload;
      },
      async findOne() {
        return null;
      }
    },
    User: {
      async findAll() {
        return [];
      },
      async findByPk() {
        return null;
      }
    },
    Notification: {
      async bulkCreate() {
        return [];
      }
    },
    QuoteEvent: {
      async create() {
        return null;
      }
    }
  });

  const quotesRouter = loadRoute('routes/quotes.js');
  const app = buildExpressApp('/api/quotes', quotesRouter);

  const response = await request(app)
    .post(`/api/quotes/guest/${quoteId}/claim/request`)
    .send({
      channel: 'phone',
      guestPhone: '07395448487'
    })
    .expect(200);

  assert.equal(response.body?.message, 'Claim verification code sent');
  assert.equal(response.body?.quoteId, quoteId);
  assert.equal(response.body?.channel, 'phone');
  assert.equal(response.body?.maskedTarget, '0739***87');
  assert.match(String(response.body?.claimToken || ''), /^[a-f0-9]{48}$/);
  assert.equal(destroyedClaims.length, 1);
  assert.equal(createdClaims.length, 1);
  assert.equal(createdClaims[0]?.quoteId, quoteId);
  assert.equal(createdClaims[0]?.channel, 'phone');
  assert.equal(createdClaims[0]?.target, '07395448487');
  assert.match(String(createdClaims[0]?.token || ''), /^[a-f0-9]{48}$/);
  assert.ok(smsRequest);
  assert.equal(smsRequest.url, 'https://sms.example.test/send');
  assert.match(String(smsRequest.options?.body || ''), /claim code/i);
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
        location: 'Manchester and the North West',
        proposalDetails: JSON.stringify({
          version: 1,
          source: 'public_quote_form_v2',
          projectScope: {
            propertyType: 'terraced',
            roomsInvolved: ['kitchen'],
            occupancyStatus: 'living_in_home',
            planningStage: 'getting_prices',
            targetStartWindow: 'within_3_months',
            siteAccess: 'easy_ground_floor'
          },
          commercial: {
            budgetRange: 'Â£8,000-Â£12,000',
            finishLevel: 'elevated'
          },
          logistics: {
            location: 'Manchester and the North West',
            postcode: 'M20 2AB'
          },
          priorities: ['finish_quality'],
          brief: {
            summary: 'Kitchen installation and refurbishment with bespoke joinery.',
            mustHaves: 'Tall pantry storage and layered task lighting.',
            constraints: 'Need the kitchen working at weekends.'
          }
        })
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

test('legacy /api/quotes/guest falls back to a legacy-safe create when lifecycle columns reject the first write', async () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);

  const { state, models } = createGuestQuoteModelsStub();
  let createAttempt = 0;
  models.Quote = {
    async create(payload) {
      state.createPayloads.push(payload);
      createAttempt += 1;

      if (createAttempt === 1) {
        throw new Error('column "workflowStatus" of relation "Quotes" does not exist');
      }

      const quote = {
        id: 'quote-compat-1',
        publicToken: payload.publicToken || 'public-token-compat-1',
        status: payload.status,
        ...payload,
        async update(patch) {
          Object.assign(this, patch);
          state.updatedQuotes.push({ id: this.id, patch });
          return this;
        }
      };
      state.createdQuotes.push(quote);
      return quote;
    }
  };
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
        location: 'Manchester and the North West',
        proposalDetails: JSON.stringify({
          version: 1,
          source: 'public_quote_form_v2',
          projectScope: {
            propertyType: 'terraced',
            roomsInvolved: ['kitchen'],
            occupancyStatus: 'living_in_home',
            planningStage: 'getting_prices',
            targetStartWindow: 'within_3_months',
            siteAccess: 'easy_ground_floor'
          },
          commercial: {
            budgetRange: 'Â£8,000-Â£12,000',
            finishLevel: 'elevated'
          },
          logistics: {
            location: 'Manchester and the North West',
            postcode: 'M20 2AB'
          },
          priorities: ['finish_quality'],
          brief: {
            summary: 'Kitchen installation and refurbishment with bespoke joinery.',
            mustHaves: 'Tall pantry storage and layered task lighting.',
            constraints: 'Need the kitchen working at weekends.'
          }
        })
      })
      .expect(201);

    assert.equal(response.body?.quoteId, 'quote-compat-1');
    assert.equal(state.createPayloads.length, 2);
    assert.equal(Object.hasOwn(state.createPayloads[0], 'workflowStatus'), true);
    assert.equal(Object.hasOwn(state.createPayloads[1], 'workflowStatus'), false);
    assert.equal(
      state.createPayloads[0].proposalDetails?.projectScope?.propertyType,
      'terraced'
    );
    assert.equal(Object.hasOwn(state.createPayloads[1], 'proposalDetails'), false);
    assert.equal(state.updatedQuotes.length, 1);
    assert.equal(state.updatedQuotes[0].patch.workflowStatus, 'submitted');
    assert.equal(
      state.updatedQuotes[0].patch.proposalDetails?.projectScope?.propertyType,
      'terraced'
    );
    assert.equal(
      warnings.some((entry) => JSON.stringify(entry).includes('Guest quote compatibility fallback engaged')),
      true
    );
  } finally {
    console.warn = originalWarn;
  }
});
