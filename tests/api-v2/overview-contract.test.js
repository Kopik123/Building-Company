const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');
const { Op } = require('sequelize');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const threadSummariesPath = path.join(__dirname, '..', '..', 'utils', 'threadSummaries.js');

const toModel = (payload) => ({
  ...payload,
  toJSON() {
    return payload;
  }
});

const readOpValue = (candidate, symbol) => {
  if (!candidate || typeof candidate !== 'object') return undefined;
  if (Object.prototype.hasOwnProperty.call(candidate, symbol)) return candidate[symbol];
  const matchingSymbol = Object.getOwnPropertySymbols(candidate).find((entry) => entry === symbol);
  return matchingSymbol ? candidate[matchingSymbol] : undefined;
};

const createOverviewStubs = () => {
  const users = {
    'manager-1': {
      id: 'manager-1',
      name: 'Daniel Manager',
      email: 'manager@example.com',
      role: 'manager',
      phone: '+44 7000 000 001',
      companyName: null,
      isActive: true,
      createdAt: '2026-03-20T08:00:00Z',
      updatedAt: '2026-03-26T09:00:00Z'
    },
    'client-1': {
      id: 'client-1',
      name: 'Marta Client',
      email: 'client@example.com',
      role: 'client',
      phone: '+44 7000 000 002',
      companyName: 'Client Co',
      isActive: true,
      createdAt: '2026-03-20T08:00:00Z',
      updatedAt: '2026-03-26T09:00:00Z'
    },
    'client-2': {
      id: 'client-2',
      name: 'Second Client',
      email: 'second@example.com',
      role: 'client',
      phone: '+44 7000 000 003',
      companyName: 'Second Co',
      isActive: true,
      createdAt: '2026-03-20T08:00:00Z',
      updatedAt: '2026-03-26T09:00:00Z'
    },
    'employee-1': {
      id: 'employee-1',
      name: 'Leah Builder',
      email: 'employee@example.com',
      role: 'employee',
      phone: '+44 7000 000 004',
      companyName: null,
      isActive: true,
      createdAt: '2026-03-20T08:00:00Z',
      updatedAt: '2026-03-26T09:00:00Z'
    }
  };

  const projects = [
    {
      id: 'project-1',
      title: 'Prestige Kitchen',
      location: 'Manchester',
      status: 'in_progress',
      clientId: 'client-1',
      assignedManagerId: 'manager-1',
      quoteId: 'quote-1',
      acceptedEstimateId: null,
      description: 'Premium kitchen fit-out.',
      budgetEstimate: 'GBP 32000.00',
      startDate: '2026-03-20',
      endDate: null,
      showInGallery: true,
      galleryOrder: 1,
      isActive: true,
      createdAt: '2026-03-20T08:00:00Z',
      updatedAt: '2026-03-26T09:00:00Z',
      client: users['client-1'],
      assignedManager: users['manager-1'],
      quote: {
        id: 'quote-1',
        projectType: 'kitchen',
        location: 'Manchester',
        status: 'pending',
        workflowStatus: 'submitted',
        priority: 'high'
      }
    },
    {
      id: 'project-2',
      title: 'Bathroom Refresh',
      location: 'Leeds',
      status: 'completed',
      clientId: 'client-2',
      assignedManagerId: 'manager-1',
      quoteId: 'quote-2',
      acceptedEstimateId: null,
      description: 'Completed bathroom refresh.',
      budgetEstimate: 'GBP 18000.00',
      startDate: '2026-03-01',
      endDate: '2026-03-22',
      showInGallery: false,
      galleryOrder: 0,
      isActive: true,
      createdAt: '2026-03-01T08:00:00Z',
      updatedAt: '2026-03-22T09:00:00Z',
      client: users['client-2'],
      assignedManager: users['manager-1'],
      quote: {
        id: 'quote-2',
        projectType: 'bathroom',
        location: 'Leeds',
        status: 'responded',
        workflowStatus: 'approved_ready_for_project',
        priority: 'medium'
      }
    }
  ];

  const estimates = {
    'quote-1': {
      id: 'estimate-1',
      quoteId: 'quote-1',
      projectId: null,
      title: 'Kitchen Offer',
      status: 'sent',
      decisionStatus: 'pending',
      versionNumber: 1,
      isCurrentVersion: true,
      notes: null,
      clientMessage: 'Please review the offer.',
      subtotal: 12500,
      total: 12500,
      sentAt: '2026-03-26T08:00:00Z',
      viewedAt: null,
      respondedAt: null,
      approvedAt: null,
      declinedAt: null,
      createdAt: '2026-03-26T08:00:00Z',
      updatedAt: '2026-03-26T08:00:00Z',
      creator: users['manager-1']
    }
  };

  const quoteAttachments = {
    'quote-1': [
      {
        name: 'brief-photo.png',
        url: '/uploads/brief-photo.png',
        size: 2048,
        mimeType: 'image/png',
        createdAt: '2026-03-26T08:05:00Z'
      }
    ],
    'quote-2': []
  };

  const quotes = [
    {
      id: 'quote-1',
      projectType: 'kitchen',
      location: 'Manchester',
      status: 'pending',
      workflowStatus: 'submitted',
      priority: 'high',
      description: 'Kitchen intake.',
      isGuest: false,
      guestName: null,
      guestEmail: null,
      guestPhone: null,
      contactMethod: 'email',
      postcode: null,
      budgetRange: '£12,000-£20,000',
      contactEmail: 'client@example.com',
      contactPhone: '+44 7000 000 002',
      assignedManagerId: 'manager-1',
      clientId: 'client-1',
      sourceChannel: 'client_portal',
      currentEstimateId: 'estimate-1',
      convertedProjectId: null,
      submittedAt: '2026-03-26T07:30:00Z',
      assignedAt: '2026-03-26T07:45:00Z',
      convertedAt: null,
      closedAt: null,
      lossReason: null,
      createdAt: '2026-03-26T07:30:00Z',
      updatedAt: '2026-03-26T09:00:00Z',
      client: users['client-1'],
      assignedManager: users['manager-1']
    },
    {
      id: 'quote-2',
      projectType: 'bathroom',
      location: 'Leeds',
      status: 'responded',
      workflowStatus: 'approved_ready_for_project',
      priority: 'medium',
      description: 'Bathroom intake.',
      isGuest: false,
      guestName: null,
      guestEmail: null,
      guestPhone: null,
      contactMethod: 'phone',
      postcode: null,
      budgetRange: '£8,000-£12,000',
      contactEmail: 'second@example.com',
      contactPhone: '+44 7000 000 003',
      assignedManagerId: 'manager-1',
      clientId: 'client-2',
      sourceChannel: 'client_portal',
      currentEstimateId: null,
      convertedProjectId: null,
      submittedAt: '2026-03-21T07:30:00Z',
      assignedAt: '2026-03-21T07:45:00Z',
      convertedAt: null,
      closedAt: null,
      lossReason: null,
      createdAt: '2026-03-21T07:30:00Z',
      updatedAt: '2026-03-21T08:00:00Z',
      client: users['client-2'],
      assignedManager: users['manager-1']
    }
  ];

  const groupMemberships = [
    {
      userId: 'manager-1',
      thread: toModel({
        id: 'group-thread-1',
        name: 'Prestige Kitchen route',
        subject: null,
        createdAt: '2026-03-26T08:10:00Z',
        updatedAt: '2026-03-26T09:10:00Z',
        creator: users['manager-1'],
        quote: null,
        project: {
          id: 'project-1',
          title: 'Prestige Kitchen',
          location: 'Manchester',
          status: 'in_progress',
          quoteId: 'quote-1',
          clientId: 'client-1',
          assignedManagerId: 'manager-1'
        },
        members: [
          { userId: 'manager-1', role: 'admin', user: users['manager-1'] },
          { userId: 'client-1', role: 'member', user: users['client-1'] }
        ]
      })
    },
    {
      userId: 'client-1',
      thread: toModel({
        id: 'group-thread-1',
        name: 'Prestige Kitchen route',
        subject: null,
        createdAt: '2026-03-26T08:10:00Z',
        updatedAt: '2026-03-26T09:10:00Z',
        creator: users['manager-1'],
        quote: null,
        project: {
          id: 'project-1',
          title: 'Prestige Kitchen',
          location: 'Manchester',
          status: 'in_progress',
          quoteId: 'quote-1',
          clientId: 'client-1',
          assignedManagerId: 'manager-1'
        },
        members: [
          { userId: 'manager-1', role: 'admin', user: users['manager-1'] },
          { userId: 'client-1', role: 'member', user: users['client-1'] }
        ]
      })
    }
  ];

  const directThreads = [
    toModel({
      id: 'direct-thread-1',
      subject: 'Kitchen follow-up',
      participantAId: 'manager-1',
      participantBId: 'client-1',
      createdAt: '2026-03-26T08:20:00Z',
      updatedAt: '2026-03-26T09:05:00Z',
      participantA: users['manager-1'],
      participantB: users['client-1']
    })
  ];

  const notifications = [
    {
      id: 'notification-1',
      userId: 'manager-1',
      type: 'quote',
      title: 'New quote update',
      body: 'Client added more detail.',
      isRead: false,
      createdAt: '2026-03-26T09:15:00Z',
      updatedAt: '2026-03-26T09:15:00Z'
    },
    {
      id: 'notification-2',
      userId: 'client-1',
      type: 'project',
      title: 'Manager replied',
      body: 'The manager replied on your project route.',
      isRead: false,
      createdAt: '2026-03-26T09:16:00Z',
      updatedAt: '2026-03-26T09:16:00Z'
    }
  ];

  const materials = [
    {
      id: 'material-1',
      name: 'Brass trim',
      sku: 'BRASS-1',
      category: 'hardware',
      unit: 'pcs',
      stockQty: 2,
      minStockQty: 4,
      unitCost: 18,
      supplier: 'Trim House',
      notes: null,
      isActive: true,
      createdAt: '2026-03-20T08:00:00Z',
      updatedAt: '2026-03-26T09:00:00Z'
    },
    {
      id: 'material-2',
      name: 'Oak veneer',
      sku: 'OAK-1',
      category: 'joinery',
      unit: 'pcs',
      stockQty: 10,
      minStockQty: 4,
      unitCost: 22,
      supplier: 'Wood House',
      notes: null,
      isActive: true,
      createdAt: '2026-03-20T08:00:00Z',
      updatedAt: '2026-03-26T09:00:00Z'
    }
  ];

  const services = [
    {
      id: 'service-1',
      slug: 'kitchens',
      title: 'Kitchens',
      shortDescription: 'Kitchen design and build.',
      fullDescription: null,
      category: 'kitchen',
      basePriceFrom: 12000,
      heroImageUrl: null,
      isFeatured: false,
      showOnWebsite: true,
      displayOrder: 1,
      isActive: true,
      createdAt: '2026-03-20T08:00:00Z',
      updatedAt: '2026-03-26T09:00:00Z'
    },
    {
      id: 'service-2',
      slug: 'bathrooms',
      title: 'Bathrooms',
      shortDescription: 'Bathroom design and build.',
      fullDescription: null,
      category: 'bathroom',
      basePriceFrom: 9000,
      heroImageUrl: null,
      isFeatured: false,
      showOnWebsite: true,
      displayOrder: 2,
      isActive: true,
      createdAt: '2026-03-20T08:00:00Z',
      updatedAt: '2026-03-26T09:00:00Z'
    }
  ];

  const newQuotes = [
    {
      id: 'new-quote-1',
      quoteRef: 'LL-M202AB-8487',
      clientId: 'client-1',
      clientName: 'Marta Client',
      clientEmail: 'client@example.com',
      clientPhone: '+44 7000 000 002',
      projectType: 'kitchen',
      location: 'Manchester and the North West',
      postcode: 'M20 2AB',
      budgetRange: '??8,000-??12,000',
      proposalDetails: {
        source: 'client_quote_form_v2'
      },
      description: 'Fresh staged quote from signed-in client.',
      attachments: [
        {
          name: 'staged-brief-photo.png',
          filename: 'staged-brief-photo.png',
          url: '/uploads/staged-brief-photo.png',
          storagePath: 'uploads/staged-brief-photo.png',
          mimeType: 'image/png',
          sizeBytes: 4096,
          mediaType: 'image',
          createdAt: '2026-03-29T19:00:00Z',
          updatedAt: '2026-03-29T19:00:00Z'
        }
      ],
      sourceChannel: 'client_quote_portal',
      client: users['client-1'],
      createdAt: '2026-03-29T19:00:00Z',
      updatedAt: '2026-03-29T19:00:00Z'
    }
  ];

  const projectMediaCounts = {
    'project-1': { imageCount: 2, documentCount: 1 },
    'project-2': { imageCount: 0, documentCount: 2 }
  };

  const filterQuotes = (where = {}) => quotes.filter((quote) => {
    if (where.clientId && quote.clientId !== where.clientId) return false;
    const allowedStatuses = readOpValue(where.status, Op.in);
    if (Array.isArray(allowedStatuses) && !allowedStatuses.includes(quote.status)) return false;
    return true;
  });

  const filterProjects = (where = {}) => projects.filter((project) => {
    if (where.clientId && project.clientId !== where.clientId) return false;
    if (Object.prototype.hasOwnProperty.call(where, 'isActive') && project.isActive !== where.isActive) return false;
    const allowedStatuses = readOpValue(where.status, Op.in);
    if (Array.isArray(allowedStatuses) && !allowedStatuses.includes(project.status)) return false;
    return true;
  });

  const matchesDirectThreadWhere = (thread, where = {}) => {
    const alternatives = readOpValue(where, Op.or);
    if (!Array.isArray(alternatives) || !alternatives.length) return true;
    return alternatives.some((candidate) =>
      Object.entries(candidate).every(([key, value]) => thread[key] === value)
    );
  };

  return {
    models: {
      Estimate: {},
      GroupMessage: {},
      GroupThread: {},
      InboxMessage: {},
      QuoteAttachment: {},
      Material: {
        async findAll() {
          return materials;
        }
      },
      Notification: {
        async findAll({ where = {} }) {
          return notifications.filter((notification) => {
            if (where.userId && notification.userId !== where.userId) return false;
            return true;
          });
        },
        async count({ where = {} }) {
          return notifications.filter((notification) => {
            if (where.userId && notification.userId !== where.userId) return false;
            if (Object.prototype.hasOwnProperty.call(where, 'isRead') && notification.isRead !== where.isRead) return false;
            return true;
          }).length;
        }
      },
      Project: {
        async findAll({ where = {}, limit }) {
          return filterProjects(where)
            .slice(0, limit || filterProjects(where).length)
            .map((project) => toModel(project));
        },
        async count({ where = {} }) {
          return filterProjects(where).length;
        }
      },
      ProjectMedia: {
        async findAll({ where = {} }) {
          const projectIds = readOpValue(where.projectId, Op.in) || [];
          return projectIds.flatMap((projectId) => {
            const counts = projectMediaCounts[projectId] || { imageCount: 0, documentCount: 0 };
            return [
              { projectId, mediaType: 'image', count: counts.imageCount },
              { projectId, mediaType: 'document', count: counts.documentCount }
            ];
          });
        }
      },
      Quote: {
        async findAll({ where = {}, limit }) {
          return filterQuotes(where)
            .slice(0, limit || filterQuotes(where).length)
            .map((quote) => toModel({
              ...quote,
              attachments: quoteAttachments[quote.id] || [],
              currentEstimate: estimates[quote.id] || null
            }));
        },
        async count({ where = {} }) {
          return filterQuotes(where).length;
        }
      },
      NewQuote: {
        async findAll({ where = {}, limit }) {
          return newQuotes
            .filter((quote) => {
              if (where.clientId && quote.clientId != where.clientId) return false;
              return true;
            })
            .slice(0, limit || newQuotes.length)
            .map((quote) => toModel(quote));
        },
        async count({ where = {} }) {
          return newQuotes.filter((quote) => {
            if (where.clientId && quote.clientId != where.clientId) return false;
            return true;
          }).length;
        }
      },
      ServiceOffering: {
        async findAll({ limit }) {
          return services.slice(0, limit || services.length);
        }
      },
      User: {
        async findByPk(id) {
          return users[id] || null;
        },
        async count({ where = {} }) {
          return Object.values(users).filter((user) => {
            if (where.role) {
              const allowedRoles = readOpValue(where.role, Op.in);
              if (Array.isArray(allowedRoles)) {
                if (!allowedRoles.includes(user.role)) return false;
              } else if (user.role !== where.role) {
                return false;
              }
            }
            if (Object.prototype.hasOwnProperty.call(where, 'isActive') && user.isActive !== where.isActive) return false;
            return true;
          }).length;
        }
      },
      GroupMember: {
        async findAll({ where = {}, limit }) {
          return groupMemberships
            .filter((membership) => membership.userId === where.userId)
            .slice(0, limit || groupMemberships.length);
        },
        async count({ where = {} }) {
          return groupMemberships.filter((membership) => membership.userId === where.userId).length;
        }
      },
      InboxThread: {
        async findAll({ where = {}, limit }) {
          return directThreads
            .filter((thread) => matchesDirectThreadWhere(thread, where))
            .slice(0, limit || directThreads.length);
        },
        async count({ where = {} }) {
          return directThreads.filter((thread) => matchesDirectThreadWhere(thread, where)).length;
        }
      }
    }
  };
};

test.afterEach(() => {
  mock.stopAll();
});

test('overview v2 aggregates manager workspace metrics and recent records into one payload', async () => {
  const stubs = createOverviewStubs();
  mockModels(stubs.models);
  mock(threadSummariesPath, {
    attachGroupThreadSummaries: async ({ threads }) =>
      threads.map((thread) => ({
        ...thread,
        latestMessagePreview: 'Stone samples booked for Friday.',
        latestMessageAt: '2026-03-26T09:12:00Z',
        latestMessageSender: {
          id: 'manager-1',
          name: 'Daniel Manager',
          email: 'manager@example.com',
          role: 'manager',
          phone: null,
          companyName: null,
          isActive: true,
          createdAt: null,
          updatedAt: null
        },
        messageCount: 3
      })),
    attachInboxThreadSummaries: async ({ threads }) =>
      threads.map((thread) => ({
        ...thread,
        latestMessagePreview: 'Please confirm the delivery slot.',
        latestMessageAt: '2026-03-26T09:05:00Z',
        latestMessageSenderId: 'client-1',
        unreadCount: 1
      }))
  });

  const route = loadRoute('api/v2/routes/overview.js');
  const app = buildExpressApp('/api/v2/overview', route);
  const managerToken = signAccessToken('manager-1', 'manager');

  const response = await request(app)
    .get('/api/v2/overview')
    .set('Authorization', `Bearer ${managerToken}`)
    .expect(200);

  const overview = response.body?.data?.overview;
  assert.ok(overview);
  assert.equal(overview.metrics.projectCount, 2);
  assert.equal(overview.metrics.activeProjectCount, 1);
  assert.equal(overview.metrics.quoteCount, 2);
  assert.equal(overview.metrics.openQuoteCount, 1);
  assert.equal(overview.metrics.clientCount, 2);
  assert.equal(overview.metrics.staffCount, 2);
  assert.equal(overview.metrics.lowStockMaterialCount, 1);
  assert.equal(overview.projects[0].imageCount, 2);
  assert.equal(overview.quotes[0].attachmentCount, 1);
  assert.equal(overview.lowStockMaterials.length, 1);
  assert.equal(overview.publicServices.length, 0);
  assert.equal(overview.crm.clientCount, 2);
  assert.equal(overview.directThreads[0].counterparty.email, 'client@example.com');
});

test('overview v2 keeps client payloads scoped to the current customer and exposes public services instead of staff-only counts', async () => {
  const stubs = createOverviewStubs();
  mockModels(stubs.models);
  mock(threadSummariesPath, {
    attachGroupThreadSummaries: async ({ threads }) => threads.map((thread) => ({
      ...thread,
      latestMessagePreview: 'Project update',
      latestMessageAt: '2026-03-26T09:12:00Z',
      latestMessageSender: {
        id: 'manager-1',
        name: 'Daniel Manager',
        email: 'manager@example.com',
        role: 'manager',
        phone: null,
        companyName: null,
        isActive: true,
        createdAt: null,
        updatedAt: null
      },
      messageCount: 2
    })),
    attachInboxThreadSummaries: async ({ threads }) => threads.map((thread) => ({
      ...thread,
      latestMessagePreview: 'Private quote update',
      latestMessageAt: '2026-03-26T09:05:00Z',
      latestMessageSenderId: 'manager-1',
      unreadCount: 1
    }))
  });

  const route = loadRoute('api/v2/routes/overview.js');
  const app = buildExpressApp('/api/v2/overview', route);
  const clientToken = signAccessToken('client-1', 'client');

  const response = await request(app)
    .get('/api/v2/overview')
    .set('Authorization', `Bearer ${clientToken}`)
    .expect(200);

  const overview = response.body?.data?.overview;
  assert.ok(overview);
  assert.equal(overview.metrics.projectCount, 1);
  assert.equal(overview.metrics.quoteCount, 2);
  assert.equal(overview.metrics.openQuoteCount, 2);
  assert.equal(overview.metrics.clientCount, 0);
  assert.equal(overview.metrics.staffCount, 0);
  assert.equal(overview.metrics.lowStockMaterialCount, 0);
  assert.equal(overview.metrics.publicServiceCount, 2);
  assert.equal(overview.projects.length, 1);
  assert.equal(overview.quotes.length, 2);
  assert.ok(overview.quotes.some((quote) => quote.recordType === 'new_quote'));
  assert.equal(overview.lowStockMaterials.length, 0);
  assert.equal(overview.publicServices.length, 2);
  assert.equal(overview.crm.clientCount, 0);
});
