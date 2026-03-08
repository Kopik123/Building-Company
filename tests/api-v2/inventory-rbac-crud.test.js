const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { Op } = require('sequelize');
const { buildExpressApp, loadRoute, mock, mockModels, signAccessToken } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const createInventoryStubs = () => {
  const users = {
    '11111111-1111-4111-8111-111111111111': {
      id: '11111111-1111-4111-8111-111111111111',
      role: 'manager',
      email: 'manager@example.com',
      isActive: true
    },
    '22222222-2222-4222-8222-222222222222': {
      id: '22222222-2222-4222-8222-222222222222',
      role: 'employee',
      email: 'employee@example.com',
      isActive: true
    },
    '33333333-3333-4333-8333-333333333333': {
      id: '33333333-3333-4333-8333-333333333333',
      role: 'client',
      email: 'client@example.com',
      isActive: true
    }
  };

  const services = [];
  const materials = [];

  const attachInstanceMethods = (collection, instance) => {
    instance.update = async function update(payload) {
      Object.assign(this, payload);
      return this;
    };
    instance.destroy = async function destroy() {
      const idx = collection.findIndex((item) => item.id === this.id);
      if (idx >= 0) collection.splice(idx, 1);
    };
    return instance;
  };

  const matchesWhere = (item, where = {}) => {
    const entries = Object.entries(where);
    for (const [key, value] of entries) {
      if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, Op.ne)) {
        if (item[key] === value[Op.ne]) return false;
        continue;
      }
      if (item[key] !== value) return false;
    }
    return true;
  };

  const ServiceOffering = {
    async findAndCountAll() {
      return { rows: services, count: services.length };
    },
    async findOne({ where }) {
      return services.find((item) => matchesWhere(item, where)) || null;
    },
    async create(payload) {
      const idSuffix = String(services.length + 1).padStart(12, '0');
      const service = attachInstanceMethods(services, {
        id: `00000000-0000-4000-8000-${idSuffix}`,
        ...payload
      });
      services.push(service);
      return service;
    },
    async findByPk(id) {
      return services.find((item) => item.id === id) || null;
    }
  };

  const Material = {
    async findAndCountAll() {
      return { rows: materials, count: materials.length };
    },
    async findOne({ where }) {
      return materials.find((item) => matchesWhere(item, where)) || null;
    },
    async create(payload) {
      const idSuffix = String(materials.length + 1).padStart(12, '0');
      const material = attachInstanceMethods(materials, {
        id: `10000000-0000-4000-8000-${idSuffix}`,
        ...payload
      });
      materials.push(material);
      return material;
    },
    async findByPk(id) {
      return materials.find((item) => item.id === id) || null;
    }
  };

  const User = {
    async findByPk(id) {
      return users[id] || null;
    }
  };

  return {
    services,
    materials,
    models: {
      User,
      ServiceOffering,
      Material
    }
  };
};

test.afterEach(() => {
  mock.stopAll();
});

test('inventory v2 enforces RBAC and supports service CRUD', async () => {
  const stubs = createInventoryStubs();
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/inventory.js');
  const app = buildExpressApp('/api/v2/inventory', route);

  const managerToken = signAccessToken('11111111-1111-4111-8111-111111111111', 'manager');
  const employeeToken = signAccessToken('22222222-2222-4222-8222-222222222222', 'employee');
  const clientToken = signAccessToken('33333333-3333-4333-8333-333333333333', 'client');

  await request(app)
    .get('/api/v2/inventory/services')
    .set('Authorization', `Bearer ${clientToken}`)
    .expect(403);

  const createResponse = await request(app)
    .post('/api/v2/inventory/services')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      title: 'Premium Bathroom Service',
      slug: 'premium-bathroom-service',
      category: 'bathroom',
      shortDescription: 'Short',
      showOnWebsite: true
    })
    .expect(201);

  const serviceId = createResponse.body?.data?.service?.id;
  assert.ok(serviceId);

  await request(app)
    .patch(`/api/v2/inventory/services/${serviceId}`)
    .set('Authorization', `Bearer ${employeeToken}`)
    .send({ title: 'Premium Bathroom Service Updated' })
    .expect(200);

  await request(app)
    .delete(`/api/v2/inventory/services/${serviceId}`)
    .set('Authorization', `Bearer ${employeeToken}`)
    .expect(403);

  await request(app)
    .delete(`/api/v2/inventory/services/${serviceId}`)
    .set('Authorization', `Bearer ${managerToken}`)
    .expect(200);
});

test('inventory v2 supports material CRUD', async () => {
  const stubs = createInventoryStubs();
  mockModels(stubs.models);

  const route = loadRoute('api/v2/routes/inventory.js');
  const app = buildExpressApp('/api/v2/inventory', route);

  const managerToken = signAccessToken('11111111-1111-4111-8111-111111111111', 'manager');

  const createResponse = await request(app)
    .post('/api/v2/inventory/materials')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      name: 'Tile 60x60',
      sku: 'TILE-60',
      category: 'tiles',
      stockQty: 100,
      minStockQty: 20
    })
    .expect(201);

  const materialId = createResponse.body?.data?.material?.id;
  assert.ok(materialId);

  await request(app)
    .patch(`/api/v2/inventory/materials/${materialId}`)
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      stockQty: 75,
      minStockQty: 25
    })
    .expect(200);

  await request(app)
    .delete(`/api/v2/inventory/materials/${materialId}`)
    .set('Authorization', `Bearer ${managerToken}`)
    .expect(200);
});
