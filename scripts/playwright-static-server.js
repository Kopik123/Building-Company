const path = require('path');
const express = require('express');
const { createAssetVersion, createVersionedHtmlMiddleware } = require('../utils/assetVersioning');
const { findAvailablePort } = require('./playwright-port');

const root = path.join(__dirname, '..');

const createStaticApp = () => {
  const app = express();
  const assetVersion = createAssetVersion();

  app.use(express.json());

  // Minimal API stubs for smoke tests running without DB/backend.
  app.get('/api/*', (_req, res) => {
    res.status(200).json({});
  });
  app.post('/api/*', (_req, res) => {
    res.status(200).json({});
  });
  app.patch('/api/*', (_req, res) => {
    res.status(200).json({});
  });
  app.delete('/api/*', (_req, res) => {
    res.status(200).json({});
  });

  app.use(createVersionedHtmlMiddleware({
    rootDir: root,
    assetVersion,
    cacheControl: 'no-store'
  }));
  app.use(express.static(root));
  return app;
};

const startStaticServer = async ({ port = Number(process.env.PW_STATIC_PORT || 4173), fallbackToAvailablePort = true } = {}) => {
  const app = createStaticApp();
  const resolvedPort = fallbackToAvailablePort ? await findAvailablePort(port) : port;

  return new Promise((resolve) => {
    const server = app.listen(resolvedPort, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : resolvedPort;
      // eslint-disable-next-line no-console
      console.log(`Playwright static server running on http://127.0.0.1:${actualPort}`);
      resolve(server);
    });
  });
};

if (require.main === module) {
  startStaticServer().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  createStaticApp,
  startStaticServer
};
