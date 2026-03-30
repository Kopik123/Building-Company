const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');

test('migrate script fails fast with a helpful message when DATABASE_URL is missing', () => {
  const rootDir = path.resolve(__dirname, '..', '..');
  const scriptPath = path.join(rootDir, 'scripts', 'migrate.js');
  const env = { ...process.env };
  delete env.DATABASE_URL;

  const result = spawnSync(process.execPath, [scriptPath, '--status'], {
    cwd: rootDir,
    env,
    encoding: 'utf8'
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL is required to run migrations/);
  assert.match(result.stderr, /DEV_DATABASE_URL/);
  assert.match(result.stderr, /npm run migrate:status/);
  assert.doesNotMatch(result.stderr, /config[\\/]+database\.js/);
});

test('migrate helpers promote DEV_DATABASE_URL into DATABASE_URL for CLI-only fallback', () => {
  const modulePath = path.resolve(__dirname, '..', '..', 'scripts', 'migrate.js');
  const resolvedModulePath = require.resolve(modulePath);
  delete require.cache[resolvedModulePath];
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalDevDatabaseUrl = process.env.DEV_DATABASE_URL;

  try {
    delete process.env.DATABASE_URL;
    process.env.DEV_DATABASE_URL = 'postgresql://dev-user:dev-pass@localhost:5432/building_company_dev';

    const migrate = require(modulePath);

    assert.equal(migrate.applyMigrationDatabaseFallback(), process.env.DEV_DATABASE_URL);
    assert.equal(process.env.DATABASE_URL, process.env.DEV_DATABASE_URL);
    assert.doesNotThrow(() => migrate.ensureDatabaseUrl());
  } finally {
    delete require.cache[resolvedModulePath];
    if (typeof originalDatabaseUrl === 'undefined') {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }

    if (typeof originalDevDatabaseUrl === 'undefined') {
      delete process.env.DEV_DATABASE_URL;
    } else {
      process.env.DEV_DATABASE_URL = originalDevDatabaseUrl;
    }
  }
});
