const path = require('path');
const { startStaticServer } = require('./playwright-static-server');
const { findAvailablePort } = require('./playwright-port');
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
  const preferredPort = Number(process.env.PW_STATIC_PORT || 4173);
  const port = await findAvailablePort(preferredPort);
  process.env.PW_STATIC_PORT = String(port);
  process.env.PW_BASE_URL = `http://127.0.0.1:${port}`;
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

module.exports = {
  findAvailablePort,
  main
};

if (require.main === module) {
  main().catch((error) => {
    reportError(error);
    process.exit(1);
  });
}
