const path = require('path');
const { startStaticServer } = require('./playwright-static-server');
const { program } = require('playwright/lib/program');

const args = process.argv.slice(2);
const cliArgs = ['node', 'playwright', 'test', ...args];

const reportError = (error) => {
  if (error && error.code === 'EPERM') {
    // eslint-disable-next-line no-console
    console.error('Playwright cannot launch workers or browsers in this local environment (spawn EPERM). Run the suite on a machine where Node child-process launch is allowed.');
  }
  // eslint-disable-next-line no-console
  console.error(error);
};

const closeServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

const main = async () => {
  process.env.PW_EXTERNAL_STATIC_SERVER = '1';
  const port = Number(process.env.PW_STATIC_PORT || 4173);
  const server = await startStaticServer({ port });

  const shutdown = async () => {
    try {
      await closeServer(server);
    } catch {
      // Ignore teardown failures on process exit.
    }
  };

  process.on('SIGINT', async () => {
    await shutdown();
    process.exit(130);
  });
  process.on('SIGTERM', async () => {
    await shutdown();
    process.exit(143);
  });

  try {
    await program.parseAsync(cliArgs);
  } finally {
    await shutdown();
  }
};

process.on('uncaughtException', (error) => {
  reportError(error);
  process.exit(1);
});

main().catch((error) => {
  reportError(error);
  process.exit(1);
});
