const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { buildExpressApp, loadRoute, mock, mockModels } = require('./_helpers');

const originalFetch = global.fetch;

const createGuestQuoteModelsStub = (overrides = {}) => {
  const state = {
    createdQuotes: [],
    createdAttachments: [],
    createdEvents: [],
    notificationBatches: [],
    managers: [
      {
        id: 'manager-1',
        role: 'manager',
        isActive: true
      }
    ]
  };

  const Quote = {
    async create(payload) {
      const quote = {
        id: `quote-${state.createdQuotes.length + 1}`,
        publicToken: payload.publicToken || 'public-token-1234567890',
        status: payload.status,
        ...payload,
        async update(patch) {
          Object.assign(this, patch);
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

  return {
    state,
    models: {
      sequelize: {
        async transaction(handler) {
          return handler({ id: 'test-transaction' });
        }
      },
      Quote,
      QuoteAttachment: {
        async bulkCreate(rows) {
          const attachments = rows.map((row, index) => ({
            id: `quote-attachment-${state.createdAttachments.length + index + 1}`,
            createdAt: '2026-03-26T20:00:00Z',
            updatedAt: '2026-03-26T20:00:00Z',
            ...row
          }));
          state.createdAttachments.push(...attachments);
          return attachments;
        }
      },
      QuoteClaimToken: {
        async destroy() {},
        async create(payload) {
          return payload;
        },
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
  global.fetch = originalFetch;
  mock.stopAll();
});

test('v2 public quotes creates a guest quote through the live public contract path', async () => {
  const { state, models } = createGuestQuoteModelsStub();
  mockModels(models);

  loadRoute('routes/quotes.js');
  const route = loadRoute('api/v2/routes/public-quotes.js');
  const app = buildExpressApp('/api/v2/public/quotes', route);

  const response = await request(app)
    .post('/api/v2/public/quotes')
    .send({
      guestName: 'Olivia Reed',
      guestPhone: '07395448487',
      guestEmail: 'olivia@example.com',
      projectType: 'kitchen',
      budgetRange: '£8,000-£12,000',
      description: 'Kitchen installation and refurbishment with bespoke joinery.',
      location: 'Manchester and the North West',
      proposalDetails: {
        version: 1,
        source: 'public_quote_form_v2',
        projectScope: {
          propertyType: 'semi_detached',
          roomsInvolved: ['kitchen'],
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
          postcode: 'M20 2AB'
        },
        priorities: ['finish_quality', 'storage'],
        brief: {
          summary: 'Kitchen installation and refurbishment with bespoke joinery.',
          mustHaves: 'Pantry wall and better task lighting.',
          constraints: 'Family stays in the home during works.'
        }
      }
    })
    .expect(201);

  assert.equal(response.body?.quoteId, 'quote-1');
  assert.match(String(response.body?.publicToken || ''), /^[a-f0-9]{32}$/);
  assert.equal(state.createdQuotes.length, 1);
  assert.equal(
    state.createdQuotes[0]?.proposalDetails?.projectScope?.propertyType,
    'semi_detached'
  );
  assert.match(
    String(state.createdQuotes[0]?.description || ''),
    /Property type: Semi Detached/i
  );
  assert.equal(state.createdEvents[0]?.eventType, 'quote_submitted');
});

test('v2 public quotes returns guest preview data from the private public token route', async () => {
  mockModels({
    sequelize: {
      async transaction(handler) {
        return handler({ id: 'test-transaction' });
      }
    },
    Quote: {
      async findOne({ where }) {
        if (where?.publicToken !== 'guest-preview-token-1234' || where?.isGuest !== true) {
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
              priority: 'medium',
              proposalDetails: {
                version: 1,
                source: 'public_quote_form_v2',
                projectScope: {
                  propertyType: 'detached',
                  roomsInvolved: ['kitchen'],
                  occupancyStatus: 'empty_property',
                  planningStage: 'ready_to_start',
                  targetStartWindow: 'within_1_month',
                  siteAccess: 'easy_ground_floor'
                },
                commercial: {
                  budgetRange: 'Â£20,000-Â£35,000',
                  finishLevel: 'bespoke'
                },
                logistics: {
                  location: 'Manchester and the North West',
                  postcode: 'M20 2AB'
                },
                priorities: ['finish_quality'],
                brief: {
                  summary: 'Kitchen remodelling with island.',
                  mustHaves: 'Stone worktop and hidden storage.',
                  constraints: 'Need a fixed appliance delivery date.'
                }
              },
              createdAt: '2026-03-26T21:30:00Z',
              updatedAt: '2026-03-26T21:45:00Z',
              submittedAt: '2026-03-26T21:30:00Z',
              assignedAt: null,
              convertedAt: null,
              closedAt: null,
              attachments: [
                {
                  id: 'attachment-1',
                  filename: 'quote-photo-a.jpg',
                  url: '/uploads/quote-photo-a.jpg',
                  mimeType: 'image/jpeg',
                  sizeBytes: 10240,
                  createdAt: '2026-03-26T21:31:00Z',
                  updatedAt: '2026-03-26T21:31:00Z'
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

  loadRoute('routes/quotes.js');
  const route = loadRoute('api/v2/routes/public-quotes.js');
  const app = buildExpressApp('/api/v2/public/quotes', route);

  const response = await request(app)
    .get('/api/v2/public/quotes/guest-preview-token-1234')
    .expect(200);

  assert.equal(response.body?.quote?.id, 'quote-preview-1');
  assert.equal(response.body?.quote?.attachmentCount, 1);
  assert.equal(response.body?.quote?.canClaim, true);
  assert.deepEqual(response.body?.quote?.claimChannels, ['email', 'phone']);
  assert.equal(response.body?.quote?.proposalDetails?.projectScope?.propertyType, 'detached');
});

test('v2 public quotes sends a guest claim code through the v2 contract path', async () => {
  const quoteId = '11111111-1111-4111-8111-111111111111';
  let smsRequest = null;

  process.env.CLAIM_SMS_WEBHOOK_URL = 'https://sms.example.test/send';
  global.fetch = async (url, options = {}) => {
    smsRequest = { url, options };
    return { ok: true };
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
      async destroy() {},
      async create(payload) {
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

  loadRoute('routes/quotes.js');
  const route = loadRoute('api/v2/routes/public-quotes.js');
  const app = buildExpressApp('/api/v2/public/quotes', route);

  const response = await request(app)
    .post(`/api/v2/public/quotes/${quoteId}/claim/request`)
    .send({
      channel: 'phone',
      guestPhone: '07395448487'
    })
    .expect(200);

  assert.equal(response.body?.message, 'Claim verification code sent');
  assert.equal(response.body?.quoteId, quoteId);
  assert.equal(response.body?.channel, 'phone');
  assert.equal(response.body?.maskedTarget, '0739***87');
  assert.ok(smsRequest);
  assert.equal(smsRequest.url, 'https://sms.example.test/send');
});
