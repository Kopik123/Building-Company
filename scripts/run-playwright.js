const net = require('net');
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

const canListenOnPort = (port) =>
  new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => {
      probe.close(() => resolve(true));
    });
    probe.listen(port, '127.0.0.1');
  });

const findAvailablePort = async (preferredPort, maxAttempts = 20) => {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = preferredPort + offset;
    // eslint-disable-next-line no-await-in-loop
    if (await canListenOnPort(port)) {
      return port;
    }
  }

  throw new Error(`No available Playwright static server port found in range ${preferredPort}-${preferredPort + maxAttempts - 1}.`);
};

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
