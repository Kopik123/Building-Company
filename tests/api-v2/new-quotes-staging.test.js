const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const test = require('node:test');
const request = require('supertest');
const { Op } = require('sequelize');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const trackedUploadPaths = new Set();

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

const createStubs = () => {
  const users = {
    'manager-1': createUserRecord({
      id: 'manager-1',
      role: 'manager',
      email: 'manager@example.com',
      name: 'Daniel Manager',
      phone: '+44 7000 000 001',
      isActive: true
    }),
    'admin-1': createUserRecord({
      id: 'admin-1',
      role: 'admin',
      email: 'admin@example.com',
      name: 'Alice Admin',
      phone: '+44 7000 000 002',
      isActive: true
    }),
    'client-1': createUserRecord({
      id: 'client-1',
      role: 'client',
      email: 'client@example.com',
      name: 'Marta Client',
      phone: '07395448487',
      companyName: 'Client Co',
      isActive: true
    })
  };

  const newQuotes = [];
  const projects = [];
  const projectMedia = [];
  const notifications = [];
  const activityEvents = [];
  const groupThreads = [];
  const groupMembers = [];

  const readOpValue = (candidate, symbol) => {
    if (!candidate || typeof candidate !== 'object') return undefined;
    if (Object.prototype.hasOwnProperty.call(candidate, symbol)) return candidate[symbol];
    const matchingSymbol = Object.getOwnPropertySymbols(candidate).find((entry) => entry === symbol);
    return matchingSymbol ? candidate[matchingSymbol] : undefined;
  };

  const attachNewQuoteMethods = (quote) => ({
    ...quote,
    client: users[quote.clientId] || null,
    async update(payload) {
      Object.assign(quote, payload, { updatedAt: '2026-03-29T21:10:00Z' });
      Object.assign(this, quote, { client: users[quote.clientId] || null });
      return this;
    },
    async destroy() {
      const index = newQuotes.findIndex((item) => item.id === quote.id);
      if (index >= 0) newQuotes.splice(index, 1);
    },
    toJSON() {
      return {
        ...quote,
        client: users[quote.clientId] ? users[quote.clientId].toJSON() : null
      };
    }
  });

  return {
    newQuotes,
    projects,
    projectMedia,
    notifications,
    activityEvents,
    groupThreads,
    groupMembers,
    users,
    models: {
      User: {
        async findByPk(id) {
          return users[id] || null;
        },
        async findAll({ where = {} } = {}) {
          const allowedRoles = readOpValue(where.role, Op.in);
          return Object.values(users).filter((user) => {
            if (Array.isArray(allowedRoles) && !allowedRoles.includes(user.role)) return false;
            if (Object.prototype.hasOwnProperty.call(where, 'isActive') && user.isActive !== where.isActive) return false;
            return true;
          });
        }
      },
      NewQuote: {
        async findAndCountAll({ where = {}, limit, offset = 0 } = {}) {
          const rows = newQuotes
            .filter((quote) => {
              if (where.clientId && quote.clientId !== where.clientId) return false;
              if (where.projectType && quote.projectType !== where.projectType) return false;
              return true;
            })
            .slice(offset, offset + (limit || newQuotes.length))
            .map((quote) => attachNewQuoteMethods(quote));
          return { rows, count: rows.length };
        },
        async findAll({ where = {}, limit } = {}) {
          return newQuotes
            .filter((quote) => {
              if (where.clientId && quote.clientId !== where.clientId) return false;
              return true;
            })
            .slice(0, limit || newQuotes.length)
            .map((quote) => attachNewQuoteMethods(quote));
        },
        async findByPk(id) {
          const found = newQuotes.find((quote) => quote.id === id) || null;
          return found ? attachNewQuoteMethods(found) : null;
        },
        async count({ where = {} } = {}) {
          return newQuotes.filter((quote) => {
            if (where.postcode && quote.postcode !== where.postcode) return false;
            if (where.clientId && quote.clientId !== where.clientId) return false;
            if (where.contactPhone && quote.contactPhone !== where.contactPhone) return false;
            if (where.guestPhone && quote.guestPhone !== where.guestPhone) return false;
            if (where.contactEmail && quote.contactEmail !== where.contactEmail) return false;
            if (where.guestEmail && quote.guestEmail !== where.guestEmail) return false;
            return true;
          }).length;
        },
        async create(payload) {
          const created = {
            id: `90000000-0000-4000-8000-${String(newQuotes.length + 1).padStart(12, '0')}`,
            createdAt: '2026-03-29T21:00:00Z',
            updatedAt: '2026-03-29T21:00:00Z',
            ...payload
          };
          newQuotes.push(created);
          (Array.isArray(created.attachments) ? created.attachments : []).forEach((attachment) => {
            if (attachment?.storagePath) trackedUploadPaths.add(attachment.storagePath);
          });
          return attachNewQuoteMethods(created);
        }
      },
      Project: {
        async create(payload) {
          const created = {
            id: `project-${projects.length + 1}`,
            createdAt: '2026-03-29T21:20:00Z',
            updatedAt: '2026-03-29T21:20:00Z',
            ...payload
          };
          projects.push(created);
          return created;
        }
      },
      ProjectMedia: {
        async bulkCreate(rows) {
          rows.forEach((row) => {
            projectMedia.push(row);
            if (row?.storagePath) trackedUploadPaths.add(row.storagePath);
          });
          return rows;
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
          const existing = groupMembers.find((member) => member.groupThreadId === where.groupThreadId && member.userId === where.userId);
          if (existing) return [existing, false];
          const created = { ...defaults };
          groupMembers.push(created);
          return [created, true];
        }
      },
      Notification: {
        async bulkCreate(rows) {
          notifications.push(...rows);
          return rows;
        },
        async create(payload) {
          notifications.push(payload);
          return payload;
        }
      },
      ActivityEvent: {
        async create(payload) {
          activityEvents.push(payload);
          return payload;
        }
      }
    }
  };
};

test.afterEach(() => {
  mock.stopAll();
});

test.afterEach(async () => {
  const paths = [...trackedUploadPaths];
  trackedUploadPaths.clear();
  await Promise.all(paths.map(async (targetPath) => {
    try {
      await fs.unlink(targetPath);
    } catch (_error) {
      // Best-effort cleanup for uploaded test files only.
    }
  }));
});

test('new quotes v2 stores uploaded client photos on the server and exposes them to client and manager review', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/new-quotes.js');
  const app = buildExpressApp('/api/v2/new-quotes', route);
  const clientToken = signAccessToken('client-1', 'client');
  const managerToken = signAccessToken('manager-1', 'manager');

  const createResponse = await request(app)
    .post('/api/v2/new-quotes')
    .set('Authorization', `Bearer ${clientToken}`)
    .field('projectType', 'kitchen')
    .field('location', 'Manchester and the North West')
    .field('postcode', 'M20 2AB')
    .field('budgetRange', '£8,000-£12,000')
    .field('description', 'Kitchen refresh with pantry storage and better lighting.')
    .field('proposalDetails', JSON.stringify({
      projectScope: { propertyType: 'semi_detached' },
      logistics: { location: 'Manchester and the North West', postcode: 'M20 2AB' },
      commercial: { budgetRange: '£8,000-£12,000' },
      brief: { summary: 'Kitchen refresh with pantry storage and better lighting.' }
    }))
    .attach('files', Buffer.from('fake-image-a'), { filename: 'kitchen-a.jpg', contentType: 'image/jpeg' })
    .attach('files', Buffer.from('fake-image-b'), { filename: 'kitchen-b.png', contentType: 'image/png' })
    .expect(201);

  const created = createResponse.body?.data?.newQuote;
  assert.ok(created?.id);
  assert.equal(created?.recordType, 'new_quote');
  assert.equal(created?.attachmentCount, 2);
  assert.equal(created?.canClaim, false);
  assert.equal(created?.accountLinked, true);
  assert.equal(created?.attachments?.length, 2);
  assert.equal(created?.attachments?.every((attachment) => String(attachment.url || '').startsWith('/uploads/')), true);

  const storedPaths = stubs.newQuotes[0]?.attachments?.map((attachment) => attachment.storagePath).filter(Boolean) || [];
  assert.equal(storedPaths.length, 2);
  await Promise.all(storedPaths.map(async (targetPath) => fs.access(targetPath)));

  const clientListResponse = await request(app)
    .get('/api/v2/new-quotes')
    .set('Authorization', `Bearer ${clientToken}`)
    .expect(200);

  assert.equal(clientListResponse.body?.data?.newQuotes?.length, 1);
  assert.equal(clientListResponse.body?.data?.newQuotes?.[0]?.attachmentCount, 2);

  const managerListResponse = await request(app)
    .get('/api/v2/new-quotes')
    .set('Authorization', `Bearer ${managerToken}`)
    .expect(200);

  assert.equal(managerListResponse.body?.data?.newQuotes?.length, 1);
  assert.equal(managerListResponse.body?.data?.newQuotes?.[0]?.attachments?.length, 2);
});

test('new quotes v2 lets a manager accept staged requests into projects with carried media rows', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/new-quotes.js');
  const app = buildExpressApp('/api/v2/new-quotes', route);
  const clientToken = signAccessToken('client-1', 'client');
  const managerToken = signAccessToken('manager-1', 'manager');

  const createResponse = await request(app)
    .post('/api/v2/new-quotes')
    .set('Authorization', `Bearer ${clientToken}`)
    .field('projectType', 'kitchen')
    .field('location', 'Manchester')
    .field('postcode', 'M20 2AB')
    .field('description', 'Kitchen refresh ready for project conversion.')
    .field('proposalDetails', JSON.stringify({
      logistics: { location: 'Manchester', postcode: 'M20 2AB' },
      brief: { summary: 'Kitchen refresh ready for project conversion.' }
    }))
    .attach('files', Buffer.from('fake-image-a'), { filename: 'conversion-a.jpg', contentType: 'image/jpeg' })
    .expect(201);

  const newQuoteId = createResponse.body?.data?.newQuote?.id;
  assert.ok(newQuoteId);

  const acceptResponse = await request(app)
    .post(`/api/v2/new-quotes/${newQuoteId}/accept`)
    .set('Authorization', `Bearer ${managerToken}`)
    .send({})
    .expect(201);

  assert.equal(acceptResponse.body?.data?.accepted, true);
  assert.equal(acceptResponse.body?.data?.deleted, true);
  assert.ok(acceptResponse.body?.data?.project?.id);
  assert.equal(stubs.projects.length, 1);
  assert.equal(stubs.projectMedia.length, 1);
  assert.equal(stubs.groupThreads.length, 1);
  assert.equal(stubs.groupMembers.length, 2);
  assert.equal(stubs.notifications.some((item) => item.type === 'project_created'), true);
  assert.equal(stubs.activityEvents.some((item) => item.eventType === 'project_created_from_new_quote'), true);
  assert.equal(stubs.newQuotes.length, 0);
  assert.equal(stubs.users['client-1'].crmLifecycleStatus, 'active_project');
});

test('new quotes v2 removes rejected staged requests from storage and deletes uploaded files from disk', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/new-quotes.js');
  const app = buildExpressApp('/api/v2/new-quotes', route);
  const clientToken = signAccessToken('client-1', 'client');
  const managerToken = signAccessToken('manager-1', 'manager');

  const createResponse = await request(app)
    .post('/api/v2/new-quotes')
    .set('Authorization', `Bearer ${clientToken}`)
    .field('projectType', 'bathroom')
    .field('location', 'Leeds')
    .field('postcode', 'LS1 4AB')
    .field('description', 'Bathroom quote that will be rejected.')
    .field('proposalDetails', JSON.stringify({
      logistics: { location: 'Leeds', postcode: 'LS1 4AB' },
      brief: { summary: 'Bathroom quote that will be rejected.' }
    }))
    .attach('files', Buffer.from('fake-image-a'), { filename: 'reject-a.jpg', contentType: 'image/jpeg' })
    .expect(201);

  const newQuoteId = createResponse.body?.data?.newQuote?.id;
  const storedPath = stubs.newQuotes[0]?.attachments?.[0]?.storagePath;
  assert.ok(storedPath);
  await fs.access(storedPath);

  const rejectResponse = await request(app)
    .post(`/api/v2/new-quotes/${newQuoteId}/reject`)
    .set('Authorization', `Bearer ${managerToken}`)
    .send({})
    .expect(200);

  assert.equal(rejectResponse.body?.data?.rejected, true);
  assert.equal(rejectResponse.body?.data?.deleted, true);
  assert.equal(stubs.newQuotes.length, 0);
  assert.equal(stubs.notifications.some((item) => item.type === 'quote_rejected'), true);
  assert.equal(stubs.activityEvents.some((item) => item.eventType === 'new_quote_rejected'), true);
  await assert.rejects(() => fs.access(storedPath));
});
