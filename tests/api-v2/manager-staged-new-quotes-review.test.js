const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const request = require('supertest');
const { body, param, query, validationResult } = require('express-validator');
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const asyncHandler = require('../../utils/asyncHandler');
const { mock, mockModels, loadRoute } = require('./_helpers');

const createUserRecord = (payload) => {
  const user = {
    crmLifecycleStatus: 'lead',
    crmLifecycleUpdatedAt: null,
    ...payload
  };

  return {
    ...user,
    async update(updatePayload) {
      Object.assign(user, updatePayload);
      Object.assign(this, user);
      return this;
    },
    toJSON() {
      return { ...user };
    }
  };
};

const createStagedQuoteRecord = (payload, collection) => {
  const quote = {
    createdAt: '2026-03-30T10:00:00Z',
    updatedAt: '2026-03-30T10:00:00Z',
    attachments: [],
    ...payload
  };

  return {
    ...quote,
    client: quote.client || null,
    async update(updatePayload) {
      Object.assign(quote, updatePayload, { updatedAt: '2026-03-30T10:10:00Z' });
      Object.assign(this, quote, { client: quote.client || null });
      return this;
    },
    async destroy() {
      const index = collection.findIndex((entry) => entry.id === quote.id);
      if (index >= 0) collection.splice(index, 1);
    },
    toJSON() {
      return {
        ...quote,
        client: quote.client || null
      };
    }
  };
};

const buildRouteApp = ({ users, stagedQuotes, projects, projectMedia, notifications, activityEvents, groupThreads, groupMembers }) => {
  mockModels({
    ActivityEvent: {
      async create(payload) {
        activityEvents.push(payload);
        return payload;
      }
    }
  });
  const createQuoteRoutes = loadRoute('routes/manager/quote-routes.js');
  const managerGuard = [
    (req, _res, next) => {
      req.user = { id: 'manager-1', role: 'manager', name: 'Daniel Manager' };
      next();
    }
  ];

  const router = createQuoteRoutes({
    body,
    param,
    query,
    validationResult,
    asyncHandler,
    managerGuard,
    Quote: {
      async findByPk() {
        return null;
      },
      async findAll() {
        return [];
      }
    },
    QuoteAttachment: {},
    NewQuote: {
      async findByPk(id) {
        const found = stagedQuotes.find((entry) => entry.id === id) || null;
        return found ? createStagedQuoteRecord(found, stagedQuotes) : null;
      },
      async findAll() {
        return stagedQuotes.map((entry) => createStagedQuoteRecord(entry, stagedQuotes));
      }
    },
    User: {
      async findByPk(id) {
        return users[id] || null;
      }
    },
    GroupThread: {
      async create(payload) {
        const created = { id: `thread-${groupThreads.length + 1}`, ...payload };
        groupThreads.push(created);
        return created;
      }
    },
    GroupMember: {
      async findOrCreate({ where, defaults }) {
        const existing = groupMembers.find((entry) => entry.groupThreadId === where.groupThreadId && entry.userId === where.userId);
        if (existing) return [existing, false];
        const created = { ...defaults };
        groupMembers.push(created);
        return [created, true];
      },
      async create(payload) {
        groupMembers.push(payload);
        return payload;
      }
    },
    Notification: {
      async create(payload) {
        notifications.push(payload);
        return payload;
      },
      async bulkCreate(rows) {
        notifications.push(...rows);
        return rows;
      }
    },
    Project: {
      async create(payload) {
        const created = { id: `project-${projects.length + 1}`, ...payload };
        projects.push(created);
        return created;
      }
    },
    ProjectMedia: {
      async bulkCreate(rows) {
        projectMedia.push(...rows);
        return rows;
      }
    },
    Op,
    fn,
    col,
    sqlWhere,
    MAX_PAGE_SIZE: 100,
    escapeLike(value) {
      return String(value || '').replace(/[\\%_]/g, '\\$&');
    },
    getPagination() {
      return { page: 1, pageSize: 25, offset: 0 };
    },
    paginationDto(total, page, pageSize) {
      return { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
    }
  });

  const app = express();
  app.use(express.json());
  app.use('/api/manager', router);
  return app;
};

test('legacy manager staged accept reuses shared workflow and converts staged quote into a project', async () => {
  const users = {
    'manager-1': createUserRecord({ id: 'manager-1', role: 'manager', name: 'Daniel Manager', email: 'manager@example.com', isActive: true }),
    'client-1': createUserRecord({ id: 'client-1', role: 'client', name: 'Marta Client', email: 'client@example.com', phone: '07395448487', isActive: true })
  };
  const stagedQuotes = [
    {
      id: '90000000-0000-4000-8000-000000000101',
      quoteRef: 'LL-M202AB-101',
      clientId: 'client-1',
      clientName: 'Marta Client',
      clientEmail: 'client@example.com',
      clientPhone: '07395448487',
      projectType: 'kitchen',
      location: 'Manchester',
      postcode: 'M20 2AB',
      budgetRange: '£8,000-£12,000',
      description: 'Kitchen quote ready for manager acceptance.',
      attachments: [
        {
          filename: 'quote-photo.jpg',
          url: '/uploads/quote-photo.jpg',
          storagePath: 'uploads/quote-photo.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1024,
          createdAt: '2026-03-30T10:00:00Z',
          updatedAt: '2026-03-30T10:00:00Z'
        }
      ],
      client: users['client-1']
    }
  ];
  const projects = [];
  const projectMedia = [];
  const notifications = [];
  const activityEvents = [];
  const groupThreads = [];
  const groupMembers = [];

  const app = buildRouteApp({ users, stagedQuotes, projects, projectMedia, notifications, activityEvents, groupThreads, groupMembers });
  const response = await request(app)
    .post('/api/manager/quotes/90000000-0000-4000-8000-000000000101/accept')
    .expect(201);

  assert.equal(response.body?.deleted, true);
  assert.equal(response.body?.converted, true);
  assert.equal(projects.length, 1);
  assert.equal(projectMedia.length, 1);
  assert.equal(groupThreads.length, 1);
  assert.equal(groupMembers.length, 2);
  assert.equal(stagedQuotes.length, 0);
  assert.equal(notifications.some((entry) => entry.type === 'project_created' && String(entry.title || '').startsWith('Project created:')), true);
  assert.equal(activityEvents.some((entry) => entry.eventType === 'project_created_from_new_quote' && entry.title === 'Project created from staged quote'), true);
  assert.equal(users['client-1'].crmLifecycleStatus, 'active_project');
});

test('legacy manager staged reject reuses shared workflow and removes staged quote from storage', async () => {
  const users = {
    'manager-1': createUserRecord({ id: 'manager-1', role: 'manager', name: 'Daniel Manager', email: 'manager@example.com', isActive: true }),
    'client-1': createUserRecord({ id: 'client-1', role: 'client', name: 'Marta Client', email: 'client@example.com', phone: '07395448487', isActive: true })
  };
  const stagedQuotes = [
    {
      id: '90000000-0000-4000-8000-000000000102',
      quoteRef: 'LL-LS14AB-102',
      clientId: 'client-1',
      clientName: 'Marta Client',
      clientEmail: 'client@example.com',
      clientPhone: '07395448487',
      projectType: 'bathroom',
      location: 'Leeds',
      postcode: 'LS1 4AB',
      budgetRange: '£6,000-£8,000',
      description: 'Bathroom quote that should be rejected.',
      attachments: [
        {
          filename: 'reject-photo.jpg',
          url: '/uploads/reject-photo.jpg',
          storagePath: 'uploads/reject-photo.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1024,
          createdAt: '2026-03-30T10:00:00Z',
          updatedAt: '2026-03-30T10:00:00Z'
        }
      ],
      client: users['client-1']
    }
  ];
  const projects = [];
  const projectMedia = [];
  const notifications = [];
  const activityEvents = [];
  const groupThreads = [];
  const groupMembers = [];

  const app = buildRouteApp({ users, stagedQuotes, projects, projectMedia, notifications, activityEvents, groupThreads, groupMembers });
  const response = await request(app)
    .post('/api/manager/quotes/90000000-0000-4000-8000-000000000102/reject')
    .expect(200);

  assert.equal(response.body?.deleted, true);
  assert.equal(response.body?.rejected, true);
  assert.equal(stagedQuotes.length, 0);
  assert.equal(notifications.some((entry) => entry.type === 'quote_rejected' && String(entry.title || '').startsWith('Quote request not progressed:')), true);
  assert.equal(activityEvents.some((entry) => entry.eventType === 'new_quote_rejected' && entry.title === 'Staged quote rejected'), true);
  assert.equal(projects.length, 0);
  assert.equal(groupThreads.length, 0);
  assert.equal(groupMembers.length, 0);
});


test.afterEach(() => {
  mock.stopAll();
});
