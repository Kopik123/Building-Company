const assert = require('node:assert/strict');
const net = require('node:net');
const test = require('node:test');

const { findAvailablePort } = require('../../scripts/run-playwright');
const { startStaticServer } = require('../../scripts/playwright-static-server');

const listen = (server, port) =>
  new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server.address()));
  });

const close = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

test('findAvailablePort skips an occupied preferred port', async () => {
  const occupied = net.createServer();
  const initialAddress = await listen(occupied, 0);
  const preferredPort = initialAddress.port;

  try {
    const selectedPort = await findAvailablePort(preferredPort, 5);
    assert.notEqual(selectedPort, preferredPort);

    const probe = net.createServer();
    try {
      await listen(probe, selectedPort);
    } finally {
      await close(probe);
    }
  } finally {
    await close(occupied);
  }
});

test('startStaticServer falls forward when the preferred port is occupied', async () => {
  const occupied = net.createServer();
  const initialAddress = await listen(occupied, 0);
  const preferredPort = initialAddress.port;

  let server;
  try {
    server = await startStaticServer({ port: preferredPort });
    const address = server.address();
    assert.equal(typeof address, 'object');
    assert.notEqual(address.port, preferredPort);
  } finally {
    if (server) {
      await close(server);
    }
    await close(occupied);
  }
});
