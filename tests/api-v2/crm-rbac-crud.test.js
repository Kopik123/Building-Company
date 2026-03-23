const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { Op } = require('sequelize');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const createCrmStubs = () => {
  const users = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      role: 'manager',
      email: 'manager@example.com',
      name: 'Manager',
      isActive: true
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      role: 'admin',
      email: 'admin@example.com',
      name: 'Admin',
      isActive: true
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      role: 'employee',
      email: 'employee@example.com',
      name: 'Employee',
      isActive: true
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      role: 'client',
      email: 'client@example.com',
      name: 'Client',
      isActive: true
    }
  ];

  const nextId = () => `55555555-5555-4555-8555-${String(users.length + 1).padStart(12, '0')}`;

  const User = {
    async findByPk(id) {
      return users.find((user) => user.id === id) || null;
    },
    async findAndCountAll({ where = {}, attributes = [] }) {
      const allowedRoles = where.role?.[Op.in] || null;
      const rows = users
        .filter((user) => {
          if (where.role === 'client') return user.role === 'client' && user.isActive === where.isActive;
          if (allowedRoles) return allowedRoles.includes(user.role) && user.isActive === where.isActive;
          return user.isActive === where.isActive;
        })
        .map((user) => {
          if (!attributes.length) return user;
          const picked = {};
          attributes.forEach((key) => {
            picked[key] = user[key];
          });
          return picked;
        });
      return { rows, count: rows.length };
    },
    async findOne({ where = {} }) {
      return users.find((user) => user.email === where.email) || null;
    },
    async create(payload) {
      const created = {
        id: nextId(),
        email: payload.email,
        name: payload.name,
        role: payload.role,
        phone: payload.phone || null,
        companyName: null,
        isActive: true,
        createdAt: '2026-03-23T18:30:00Z',
        updatedAt: '2026-03-23T18:30:00Z',
        toJSON() {
          return { ...this };
        }
      };
      users.push(created);
      return created;
    }
  };

  return { users, models: { User } };
};

test.afterEach(() => {
  mock.stopAll();
});

test('crm v2 lists people and lets manager/admin create staff with role guardrails', async () => {
  const stubs = createCrmStubs();
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/crm.js');
  const app = buildExpressApp('/api/v2/crm', route);

  const managerToken = signAccessToken('11111111-1111-4111-8111-111111111111', 'manager');
  const adminToken = signAccessToken('22222222-2222-4222-8222-222222222222', 'admin');
  const employeeToken = signAccessToken('33333333-3333-4333-8333-333333333333', 'employee');
  const clientToken = signAccessToken('44444444-4444-4444-8444-444444444444', 'client');

  await request(app)
    .get('/api/v2/crm/clients')
    .set('Authorization', `Bearer ${employeeToken}`)
    .expect(200);

  await request(app)
    .get('/api/v2/crm/staff')
    .set('Authorization', `Bearer ${clientToken}`)
    .expect(403);

  const employeeCreate = await request(app)
    .post('/api/v2/crm/staff')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      email: 'leah@example.com',
      password: 'StrongPassword123!',
      name: 'Leah Builder',
      role: 'employee'
    })
    .expect(201);

  assert.equal(employeeCreate.body?.data?.staff?.email, 'leah@example.com');
  assert.equal(employeeCreate.body?.data?.staff?.role, 'employee');

  await request(app)
    .post('/api/v2/crm/staff')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      email: 'new-manager@example.com',
      password: 'StrongPassword123!',
      name: 'Not Allowed',
      role: 'manager'
    })
    .expect(403);

  const managerCreate = await request(app)
    .post('/api/v2/crm/staff')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      email: 'new-manager@example.com',
      password: 'StrongPassword123!',
      name: 'Operations Lead',
      role: 'manager'
    })
    .expect(201);

  assert.equal(managerCreate.body?.data?.staff?.role, 'manager');
});
