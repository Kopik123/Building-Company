const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');
const { buildExpressApp, loadRoute, mock, mockModels } = require('./_helpers');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';
const sessionTokensPath = path.join(__dirname, '..', '..', 'utils', 'sessionTokens.js');

const loadFreshAuthRoute = () => {
  delete require.cache[require.resolve(sessionTokensPath)];
  return loadRoute('api/v2/routes/auth.js');
};

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

const createAuthStubs = () => {
  const users = [
    createUser({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'manager@example.com',
      password: 'Pass1234!',
      role: 'manager',
      name: 'Manager Test'
    }),
    createUser({
      id: '22222222-2222-4222-8222-222222222222',
      email: 'client@example.com',
      password: 'Pass1234!',
      role: 'client',
      name: 'Client Test'
    })
  ];
  let nextUserCounter = 3;
  const sessions = [];
  const findUserByEmail = (email) => users.find((user) => user.email === email) || null;
  const findUserById = (id) => users.find((user) => user.id === id) || null;

  const sessionMatches = (session, where = {}) => {
    if (typeof where.userId !== 'undefined' && session.userId !== where.userId) return false;
    if (typeof where.tokenHash !== 'undefined' && session.tokenHash !== where.tokenHash) return false;
    if (typeof where.revokedAt !== 'undefined' && session.revokedAt !== where.revokedAt) return false;
    return true;
  };

  const SessionRefreshToken = {
    async create(payload) {
      const session = {
        id: `session-${sessions.length + 1}`,
        ...payload,
        revokedAt: payload.revokedAt || null,
        replacedByTokenId: payload.replacedByTokenId || null,
        async update(updatePayload) {
          Object.assign(this, updatePayload);
          return this;
        }
      };
      sessions.push(session);
      return session;
    },
    async findOne({ where, include }) {
      const session = sessions.find((item) => sessionMatches(item, where)) || null;
      if (!session) return null;
      if (include && include.length) {
        session.user = findUserById(session.userId);
      }
      return session;
    },
    async update(payload, { where }) {
      let updated = 0;
      sessions.forEach((session) => {
        if (!sessionMatches(session, where)) return;
        Object.assign(session, payload);
        updated += 1;
      });
      return [updated];
    }
  };

  const User = {
    async findOne({ where }) {
      if (where?.email) return findUserByEmail(where.email);
      return null;
    },
    async findByPk(id) {
      return findUserById(id);
    },
    async create(payload) {
      const counter = String(nextUserCounter);
      const user = createUser({
        id: `${counter.repeat(8).slice(0, 8)}-${counter.repeat(4).slice(0, 4)}-4${counter.repeat(3).slice(0, 3)}-8${counter.repeat(3).slice(0, 3)}-${counter.repeat(12).slice(0, 12)}`,
        email: payload.email,
        password: payload.password,
        role: payload.role || 'client',
        name: payload.name || 'Created User'
      });
      user.phone = payload.phone || null;
      user.companyName = payload.companyName || null;
      users.push(user);
      nextUserCounter += 1;
      return user;
    }
  };

  return {
    users,
    sessions,
    models: { User, SessionRefreshToken }
  };
};

test('auth v2 flows stay stable for mobile-ready register/login/refresh/password behavior', async (suite) => {
  await suite.test('register creates a client session directly for mobile clients', async () => {
    try {
      const stubs = createAuthStubs();
      mockModels(stubs.models);

      const authRoute = loadFreshAuthRoute();
      const app = buildExpressApp('/api/v2/auth', authRoute);

      const response = await request(app)
        .post('/api/v2/auth/register')
        .send({
          name: 'Mobile Client',
          email: 'mobile-client@example.com',
          password: 'Pass1234!',
          phone: '+44 7000 000 777',
          companyName: 'Client Co'
        })
        .expect(201);

      assert.equal(response.body?.data?.user?.role, 'client');
      assert.ok(response.body?.data?.accessToken);
      assert.ok(response.body?.data?.refreshToken);
      assert.ok(response.body?.data?.legacyToken);
    } finally {
      mock.stopAll();
    }
  });

  await suite.test('login -> me -> refresh -> logout flow works', async () => {
    try {
      const stubs = createAuthStubs();
      mockModels(stubs.models);

      const authRoute = loadFreshAuthRoute();
      const app = buildExpressApp('/api/v2/auth', authRoute);

      const loginResponse = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'MANAGER@example.com', password: 'Pass1234!' })
        .expect(200);

      assert.ok(loginResponse.body?.data?.accessToken);
      assert.ok(loginResponse.body?.data?.refreshToken);
      assert.ok(loginResponse.body?.data?.legacyToken);
      assert.equal(loginResponse.body?.data?.user?.email, 'manager@example.com');

      const meResponse = await request(app)
        .get('/api/v2/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
        .expect(200);
      assert.equal(meResponse.body?.data?.user?.role, 'manager');

      const refreshResponse = await request(app)
        .post('/api/v2/auth/refresh')
        .send({ refreshToken: loginResponse.body.data.refreshToken })
        .expect(200);

      assert.ok(refreshResponse.body?.data?.accessToken);
      assert.notEqual(refreshResponse.body?.data?.refreshToken, loginResponse.body.data.refreshToken);
      assert.ok(refreshResponse.body?.data?.legacyToken);

      const logoutResponse = await request(app)
        .post('/api/v2/auth/logout')
        .set('Authorization', `Bearer ${refreshResponse.body.data.accessToken}`)
        .send({ refreshToken: refreshResponse.body.data.refreshToken })
        .expect(200);
      assert.equal(logoutResponse.body?.data?.loggedOut, true);
      assert.equal(logoutResponse.body?.data?.revokedCount, 1);

      await request(app)
        .post('/api/v2/auth/refresh')
        .send({ refreshToken: refreshResponse.body.data.refreshToken })
        .expect(401);
    } finally {
      mock.stopAll();
    }
  });

  await suite.test('invalid credentials are rejected', async () => {
    try {
      const stubs = createAuthStubs();
      mockModels(stubs.models);

      const authRoute = loadFreshAuthRoute();
      const app = buildExpressApp('/api/v2/auth', authRoute);

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'manager@example.com', password: 'wrong' })
        .expect(401);

      assert.equal(response.body?.error?.code, 'invalid_credentials');
    } finally {
      mock.stopAll();
    }
  });

  await suite.test('login and refresh keep legacy users with null isActive compatible', async () => {
    try {
      const stubs = createAuthStubs();
      stubs.users[0].isActive = null;
      mockModels(stubs.models);

      const authRoute = loadFreshAuthRoute();
      const app = buildExpressApp('/api/v2/auth', authRoute);

      const loginResponse = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'manager@example.com', password: 'Pass1234!' })
        .expect(200);

      await request(app)
        .get('/api/v2/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
        .expect(200);

      await request(app)
        .post('/api/v2/auth/refresh')
        .send({ refreshToken: loginResponse.body.data.refreshToken })
        .expect(200);
    } finally {
      mock.stopAll();
    }
  });

  await suite.test('password change revokes existing refresh sessions', async () => {
    try {
      const stubs = createAuthStubs();
      mockModels(stubs.models);

      const authRoute = loadFreshAuthRoute();
      const app = buildExpressApp('/api/v2/auth', authRoute);

      const loginResponse = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'client@example.com', password: 'Pass1234!' })
        .expect(200);

      await request(app)
        .patch('/api/v2/auth/password')
        .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
        .send({ currentPassword: 'Pass1234!', newPassword: 'NewPass5678!' })
        .expect(200);

      await request(app)
        .post('/api/v2/auth/refresh')
        .send({ refreshToken: loginResponse.body.data.refreshToken })
        .expect(401);
    } finally {
      mock.stopAll();
    }
  });
});
