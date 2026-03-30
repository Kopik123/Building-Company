const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');
const mock = require('mock-require');

test.afterEach(() => {
  mock.stopAll();
});

test('ensure-indexes script fails fast with the migration-style DATABASE_URL preflight message', () => {
  const rootDir = path.resolve(__dirname, '..', '..');
  const scriptPath = path.join(rootDir, 'scripts', 'ensure-indexes.js');
  const env = { ...process.env };
  delete env.DATABASE_URL;

  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: rootDir,
    env,
    encoding: 'utf8'
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL is required to run migrations/);
  assert.match(result.stderr, /DEV_DATABASE_URL/);
  assert.doesNotMatch(result.stderr, /config[\\/]+database\.js/);
});

test('ensure-indexes script runs ensureIndexes and closes sequelize', async () => {
  const rootDir = path.resolve(__dirname, '..', '..');
  const scriptPath = path.join(rootDir, 'scripts', 'ensure-indexes.js');
  const modelsPath = path.join(rootDir, 'models', 'index.js');
  const resolvedScriptPath = require.resolve(scriptPath);
  let ensured = false;
  let closed = false;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  delete require.cache[resolvedScriptPath];
  try {
    process.env.DATABASE_URL = 'postgresql://dev-user:dev-pass@localhost:5432/building_company_dev';
    mock(modelsPath, {
      ensureIndexes: async () => {
        ensured = true;
      },
      sequelize: {
        close: async () => {
          closed = true;
        }
      }
    });

    const script = require(scriptPath);
    await script.run();

    assert.equal(ensured, true);
    assert.equal(closed, true);
  } finally {
    delete require.cache[resolvedScriptPath];
    if (typeof originalDatabaseUrl === 'undefined') {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  }
});
