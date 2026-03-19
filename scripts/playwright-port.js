const net = require('node:net');

const canListenOnPort = (port) =>
  new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => {
      probe.close(() => resolve(true));
    });
    probe.listen(port);
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

module.exports = {
  canListenOnPort,
  findAvailablePort
};
