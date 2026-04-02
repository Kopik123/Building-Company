const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const mock = require('mock-require');

const databaseModulePath = path.join(__dirname, '..', '..', 'config', 'database.js');

const loadDatabaseConfig = (databaseUrl) => {
  delete require.cache[require.resolve(databaseModulePath)];
  mock.stopAll();

  const calls = [];
  class SequelizeStub {
    constructor(...args) {
      calls.push(args);
    }
  }

  mock('sequelize', { Sequelize: SequelizeStub });

  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = databaseUrl;

  try {
    require(databaseModulePath);
  } finally {
    if (typeof previousUrl === 'undefined') {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousUrl;
    }
    delete require.cache[require.resolve(databaseModulePath)];
    mock.stopAll();
  }

  return calls;
};

test('database config maps SQLite memory URLs to SQLite storage config', () => {
  const calls = loadDatabaseConfig('sqlite://:memory:');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], [{
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  }]);
});

test('database config keeps postgres URLs on the postgres dialect path', () => {
  const calls = loadDatabaseConfig('postgresql://user:pass@localhost:5432/building_company');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'postgresql://user:pass@localhost:5432/building_company');
  assert.deepEqual(calls[0][1], {
    dialect: 'postgres',
    logging: false
  });
});
