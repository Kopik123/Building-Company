const fs = require('node:fs');
const path = require('node:path');
const { run } = require('node:test');

const rootDir = path.join(__dirname, '..');
const testsDir = path.join(rootDir, 'tests', 'api-v2');
const runnerFile = __filename;

const clearProjectModuleCache = () => {
  Object.keys(require.cache).forEach((entry) => {
    if (!entry.startsWith(rootDir)) return;
    if (entry.includes(`${path.sep}node_modules${path.sep}`)) return;
    if (entry === runnerFile) return;
    delete require.cache[entry];
  });

  try {
    require('mock-require').stopAll();
  } catch {
    // Ignore when the helper is not loaded yet.
  }
};

const collectTestFiles = () =>
  fs.readdirSync(testsDir)
    .filter((entry) => entry.endsWith('.test.js'))
    .sort((left, right) => left.localeCompare(right))
    .map((entry) => path.join(testsDir, entry));

const runFile = async (filePath) => {
  const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  let passed = 0;
  let failed = 0;

  clearProjectModuleCache();

  const stream = run({
    files: [filePath],
    isolation: 'none',
    concurrency: false
  });

  // Keep the stream flowing until the file is fully executed.
  // This avoids the silent early-exit that happens when unresolved promises
  // are the only remaining work on the event loop.
  // eslint-disable-next-line no-restricted-syntax
  for await (const event of stream) {
    if (event.type === 'test:pass' && event.data?.details?.type === 'test') {
      passed += 1;
      // eslint-disable-next-line no-console
      console.log(`PASS ${relativePath} :: ${event.data.name}`);
      continue;
    }

    if (event.type === 'test:fail' && event.data?.details?.type === 'test') {
      failed += 1;
      // eslint-disable-next-line no-console
      console.error(`FAIL ${relativePath} :: ${event.data.name}`);
      if (event.data.details?.error?.stack) {
        // eslint-disable-next-line no-console
        console.error(event.data.details.error.stack);
      }
    }
  }

  return { filePath, passed, failed };
};

const main = async () => {
  const files = collectTestFiles();
  let passed = 0;
  let failed = 0;

  for (const filePath of files) {
    // eslint-disable-next-line no-console
    console.log(`\n# ${path.relative(rootDir, filePath).replace(/\\/g, '/')}`);
    // eslint-disable-next-line no-await-in-loop
    const result = await runFile(filePath);
    passed += result.passed;
    failed += result.failed;
  }

  // eslint-disable-next-line no-console
  console.log(`\nAPI v2 test summary: ${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
