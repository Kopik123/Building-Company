const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');
const { buildExpressApp, loadRoute, mock, mockModels } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const createUser = ({ id, email, password, role = 'client', name = 'Test User', isActive = true }) => ({
  id,
  email,
  password,
  role,
  name,
  isActive,
  phone: null,
  companyName: null,
  async validatePassword(input) {
    return input === this.password;
  },
  async update(payload) {
    Object.assign(this, payload);
    return this;
  },
  toJSON() {
    const clone = { ...this };
    delete clone.password;
    return clone;
  }
});

const createStubs = () => {
  const users = [
    createUser({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'client@example.com',
      password: 'Pass1234!',
      role: 'client',
      name: 'Client Test'
    })
  ];
  const sessions = [];

  return {
    users,
    sessions,
    models: {
      User: {
        async findOne({ where }) {
          return users.find((user) => user.email === where?.email) || null;
        },
        async findByPk(id) {
          return users.find((user) => user.id === id) || null;
        },
        async create(payload) {
          const user = createUser({
            id: `user-${users.length + 1}`,
            role: payload.role || 'client',
            ...payload
          });
          users.push(user);
          return user;
        }
      },
      SessionRefreshToken: {
        async create(payload) {
          const session = {
            id: `session-${sessions.length + 1}`,
            ...payload,
            async update(updatePayload) {
              Object.assign(this, updatePayload);
              return this;
            }
          };
          sessions.push(session);
          return session;
        }
      }
    }
  };
};

test.afterEach(() => {
  mock.stopAll();
});

test('legacy auth login returns both legacy and v2 session tokens', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);
  delete require.cache[require.resolve(path.resolve(__dirname, '..', '..', 'utils', 'sessionTokens.js'))];

  const route = loadRoute('routes/auth.js');
  const app = buildExpressApp('/api/auth', route);

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'client@example.com', password: 'Pass1234!' })
    .expect(200);

  assert.ok(response.body?.token);
  assert.ok(response.body?.v2Session?.accessToken);
  assert.ok(response.body?.v2Session?.refreshToken);
  assert.equal(stubs.sessions.length, 1);
});

test('legacy auth register returns both legacy and v2 session tokens', async () => {
  const stubs = createStubs();
  mockModels(stubs.models);
  delete require.cache[require.resolve(path.resolve(__dirname, '..', '..', 'utils', 'sessionTokens.js'))];

  const route = loadRoute('routes/auth.js');
  const app = buildExpressApp('/api/auth', route);

  const response = await request(app)
    .post('/api/auth/register')
    .send({ email: 'newclient@example.com', password: 'Pass1234!', name: 'New Client' })
    .expect(201);

  assert.ok(response.body?.token);
  assert.ok(response.body?.v2Session?.accessToken);
  assert.ok(response.body?.v2Session?.refreshToken);
  assert.equal(stubs.sessions.length, 1);
});

test('legacy auth keeps older users with null isActive signed in across /me', async () => {
  const stubs = createStubs();
  stubs.users[0].isActive = null;
  mockModels(stubs.models);
  delete require.cache[require.resolve(path.resolve(__dirname, '..', '..', 'utils', 'sessionTokens.js'))];

  const route = loadRoute('routes/auth.js');
  const app = buildExpressApp('/api/auth', route);

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: 'client@example.com', password: 'Pass1234!' })
    .expect(200);

  const meResponse = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${loginResponse.body.token}`)
    .expect(200);

  assert.equal(meResponse.body?.user?.email, 'client@example.com');
});
