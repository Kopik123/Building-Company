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
  assert.match(result.stderr, /npm run migrate:status/);
  assert.doesNotMatch(result.stderr, /config[\\/]+database\.js/);
});
