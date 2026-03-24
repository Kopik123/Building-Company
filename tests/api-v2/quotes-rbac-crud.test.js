const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { Op } = require('sequelize');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const createQuoteStubs = () => {
  const users = {
    '11111111-1111-4111-8111-111111111111': {
      id: '11111111-1111-4111-8111-111111111111',
      role: 'manager',
      email: 'manager@example.com',
      name: 'Manager',
      phone: '+44 7000 000 001',
      isActive: true
    },
    '22222222-2222-4222-8222-222222222222': {
      id: '22222222-2222-4222-8222-222222222222',
      role: 'admin',
      email: 'admin@example.com',
      name: 'Admin',
      phone: '+44 7000 000 002',
      isActive: true
    },
    '33333333-3333-4333-8333-333333333333': {
      id: '33333333-3333-4333-8333-333333333333',
      role: 'client',
      email: 'client@example.com',
      name: 'Client',
      phone: '+44 7000 000 003',
      companyName: 'Client Co',
      isActive: true
    }
  };

  const quotes = [];
  const estimates = [];
  const projects = [];
  const quoteEvents = [];
  const notifications = [];
  const groupThreads = [];
  const groupMembers = [];

  const readOpValue = (candidate, symbol) => {
    if (!candidate || typeof candidate !== 'object') return undefined;
    if (Object.prototype.hasOwnProperty.call(candidate, symbol)) return candidate[symbol];
    const matchingSymbol = Object.getOwnPropertySymbols(candidate).find((entry) => entry === symbol);
    return matchingSymbol ? candidate[matchingSymbol] : undefined;
  };

  const attachQuoteMethods = (quote) => ({
    ...quote,
    async update(payload) {
      Object.assign(quote, payload, { updatedAt: '2026-03-24T09:10:00Z' });
      Object.assign(this, quote);
      return this;
    },
    toJSON() {
      return {
        ...this,
        client: this.clientId ? users[this.clientId] || null : null,
        assignedManager: this.assignedManagerId ? users[this.assignedManagerId] || null : null,
        currentEstimate: this.currentEstimateId ? estimates.find((estimate) => estimate.id === this.currentEstimateId) || null : null
      };
    }
  });

  const attachEstimateMethods = (estimate) => ({
    ...estimate,
    async update(payload) {
      Object.assign(estimate, payload, { updatedAt: '2026-03-24T09:20:00Z' });
      Object.assign(this, estimate);
      return this;
    },
    toJSON() {
      return {
        ...this,
        creator: users[this.createdById] || null
      };
    }
  });

  const Quote = {
    async findAndCountAll({ where = {} }) {
      const rows = quotes
        .filter((quote) => {
          if (where.clientId && quote.clientId !== where.clientId) return false;
          if (where.status && quote.status !== where.status) return false;
          if (where.workflowStatus && quote.workflowStatus !== where.workflowStatus) return false;
          if (where.priority && quote.priority !== where.priority) return false;
          return true;
        })
        .map((quote) => attachQuoteMethods(quote));
      return { rows, count: rows.length };
    },
    async findByPk(id) {
      const quote = quotes.find((item) => item.id === id) || null;
      return quote ? attachQuoteMethods(quote) : null;
    },
    async create(payload) {
      const created = attachQuoteMethods({
        id: `60000000-0000-4000-8000-${String(quotes.length + 1).padStart(12, '0')}`,
        clientId: payload.clientId || null,
        isGuest: typeof payload.isGuest === 'boolean' ? payload.isGuest : !payload.clientId,
        guestName: payload.guestName || null,
        guestEmail: payload.guestEmail || null,
        guestPhone: payload.guestPhone || null,
        contactMethod: payload.contactMethod || null,
        publicToken: payload.publicToken || null,
        projectType: payload.projectType,
        location: payload.location,
        postcode: payload.postcode || null,
        budgetRange: payload.budgetRange || null,
        description: payload.description,
        contactEmail: payload.contactEmail || null,
        contactPhone: payload.contactPhone || null,
        status: payload.status || 'pending',
        workflowStatus: payload.workflowStatus || 'submitted',
        sourceChannel: payload.sourceChannel || null,
        assignedManagerId: payload.assignedManagerId || null,
        currentEstimateId: payload.currentEstimateId || null,
        convertedProjectId: payload.convertedProjectId || null,
        submittedAt: payload.submittedAt || '2026-03-24T09:00:00Z',
        assignedAt: payload.assignedAt || null,
        convertedAt: payload.convertedAt || null,
        closedAt: payload.closedAt || null,
        lossReason: payload.lossReason || null,
        priority: payload.priority || 'medium',
        createdAt: '2026-03-24T09:00:00Z',
        updatedAt: '2026-03-24T09:00:00Z'
      });
      quotes.push(created);
      return created;
    }
  };

  const Estimate = {
    async findAll({ where = {} }) {
      return estimates
        .filter((estimate) => {
          if (where.quoteId && estimate.quoteId !== where.quoteId) return false;
          const notEqualStatus = readOpValue(where.status, Op.ne);
          if (notEqualStatus && estimate.status === notEqualStatus) return false;
          return true;
        })
        .map((estimate) => attachEstimateMethods(estimate));
    },
    async findByPk(id) {
      const estimate = estimates.find((item) => item.id === id) || null;
      return estimate ? attachEstimateMethods(estimate) : null;
    },
    async findOne({ where = {} }) {
      const estimate = estimates.find((item) => {
        if (where.quoteId && item.quoteId !== where.quoteId) return false;
        if (Object.prototype.hasOwnProperty.call(where, 'isCurrentVersion') && item.isCurrentVersion !== where.isCurrentVersion) return false;
        return true;
      }) || null;
      return estimate ? attachEstimateMethods(estimate) : null;
    },
    async create(payload) {
      const created = attachEstimateMethods({
        id: `70000000-0000-4000-8000-${String(estimates.length + 1).padStart(12, '0')}`,
        quoteId: payload.quoteId || null,
        projectId: payload.projectId || null,
        createdById: payload.createdById,
        title: payload.title,
        status: payload.status || 'draft',
        decisionStatus: payload.decisionStatus || 'pending',
        versionNumber: payload.versionNumber || 1,
        isCurrentVersion: typeof payload.isCurrentVersion === 'boolean' ? payload.isCurrentVersion : true,
        notes: payload.notes || null,
        clientMessage: payload.clientMessage || null,
        subtotal: payload.subtotal || 0,
        total: payload.total || 0,
        sentAt: payload.sentAt || null,
        viewedAt: payload.viewedAt || null,
        respondedAt: payload.respondedAt || null,
        approvedAt: payload.approvedAt || null,
        declinedAt: payload.declinedAt || null,
        createdAt: '2026-03-24T09:05:00Z',
        updatedAt: '2026-03-24T09:05:00Z'
      });
      estimates.push(created);
      return created;
    },
    async update(payload, { where = {} } = {}) {
      let updatedCount = 0;
      estimates.forEach((estimate) => {
        if (where.quoteId && estimate.quoteId !== where.quoteId) return;
        Object.assign(estimate, payload);
        updatedCount += 1;
      });
      return [updatedCount];
    }
  };

  const EstimateLine = {
    async create() {
      return { id: `estimate-line-${Date.now()}` };
    }
  };

  const QuoteEvent = {
    async create(payload) {
      quoteEvents.push({ id: `event-${quoteEvents.length + 1}`, ...payload });
      return quoteEvents.at(-1);
    },
    async findAll({ where = {} }) {
      return quoteEvents
        .filter((event) => {
          if (event.quoteId !== where.quoteId) return false;
          const allowedVisibilities = readOpValue(where.visibility, Op.in);
          if (Array.isArray(allowedVisibilities) && !allowedVisibilities.includes(event.visibility)) return false;
          return true;
        })
        .map((event) => ({
          ...event,
          actor: event.actorUserId ? users[event.actorUserId] || null : null
        }));
    }
  };

  const GroupThread = {
    async findOne({ where = {} }) {
      return groupThreads.find((thread) => thread.quoteId === where.quoteId && thread.projectId === where.projectId) || null;
    },
    async create(payload) {
      const created = { id: `group-thread-${groupThreads.length + 1}`, ...payload };
      groupThreads.push(created);
      return created;
    }
  };

  const GroupMember = {
    async findOrCreate({ where, defaults }) {
      const existing = groupMembers.find((member) => member.groupThreadId === where.groupThreadId && member.userId === where.userId);
      if (existing) return [existing, false];
      groupMembers.push(defaults);
      return [defaults, true];
    }
  };

  const Notification = {
    async bulkCreate(rows) {
      notifications.push(...rows);
      return rows;
    },
    async create(row) {
      notifications.push(row);
      return row;
    }
  };

  const Project = {
    async create(payload) {
      const created = { id: `project-${projects.length + 1}`, ...payload };
      projects.push(created);
      return created;
    }
  };

  const User = {
    async findByPk(id) {
      return users[id] || null;
    },
    async findAll({ where = {} } = {}) {
      return Object.values(users).filter((user) => {
        const excludedId = readOpValue(where.id, Op.ne);
        const includedRoles = readOpValue(where.role, Op.in);
        if (excludedId && user.id === excludedId) return false;
        if (Array.isArray(includedRoles) && !includedRoles.includes(user.role)) return false;
        if (Object.prototype.hasOwnProperty.call(where, 'isActive') && user.isActive !== where.isActive) return false;
        return true;
      });
    }
  };

  return {
    quotes,
    estimates,
    quoteEvents,
    notifications,
    projects,
    models: {
      Quote,
      Estimate,
      EstimateLine,
      QuoteEvent,
      GroupThread,
      GroupMember,
      Notification,
      Project,
      User
    }
  };
};

test.afterEach(() => {
  mock.stopAll();
});

test('quotes v2 supports client submit, manager assignment, estimate approval and project conversion', async () => {
  const stubs = createQuoteStubs();
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/quotes.js');
  const app = buildExpressApp('/api/v2/quotes', route);

  const managerToken = signAccessToken('11111111-1111-4111-8111-111111111111', 'manager');
  const clientToken = signAccessToken('33333333-3333-4333-8333-333333333333', 'client');

  const clientCreateResponse = await request(app)
    .post('/api/v2/quotes')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({
      projectType: 'bathroom',
      location: 'Manchester',
      description: 'Client-led marble bathroom refurbishment.',
      guestPhone: '+44 7000 100 200'
    })
    .expect(201);

  const quoteId = clientCreateResponse.body?.data?.quote?.id;
  assert.ok(quoteId);
  assert.equal(clientCreateResponse.body?.data?.quote?.clientId, '33333333-3333-4333-8333-333333333333');
  assert.equal(clientCreateResponse.body?.data?.quote?.workflowStatus, 'submitted');

  const assignResponse = await request(app)
    .post(`/api/v2/quotes/${quoteId}/assign`)
    .set('Authorization', `Bearer ${managerToken}`)
    .send({})
    .expect(200);

  assert.equal(assignResponse.body?.data?.quote?.workflowStatus, 'assigned');

  const draftEstimateResponse = await request(app)
    .post(`/api/v2/quotes/${quoteId}/estimates`)
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      title: 'Bathroom Offer',
      total: 12500,
      description: 'Premium bathroom fit-out'
    })
    .expect(201);

  const estimateId = draftEstimateResponse.body?.data?.estimate?.id;
  assert.ok(estimateId);

  const sendEstimateResponse = await request(app)
    .post(`/api/v2/quotes/estimates/${estimateId}/send`)
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      clientMessage: 'Please review the current offer.'
    })
    .expect(200);

  assert.equal(sendEstimateResponse.body?.data?.quote?.workflowStatus, 'estimate_sent');

  const respondResponse = await request(app)
    .post(`/api/v2/quotes/estimates/${estimateId}/respond`)
    .set('Authorization', `Bearer ${clientToken}`)
    .send({
      decision: 'accepted',
      note: 'Looks good to proceed.'
    })
    .expect(200);

  assert.equal(respondResponse.body?.data?.quote?.workflowStatus, 'approved_ready_for_project');

  const convertResponse = await request(app)
    .post(`/api/v2/quotes/${quoteId}/convert-to-project`)
    .set('Authorization', `Bearer ${managerToken}`)
    .send({})
    .expect(201);

  assert.ok(convertResponse.body?.data?.project?.id);
  assert.equal(convertResponse.body?.data?.quote?.workflowStatus, 'converted_to_project');
  assert.equal(stubs.projects.length, 1);
  assert.equal(stubs.quoteEvents.length >= 4, true);
});
