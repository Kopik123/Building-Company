const path = require('node:path');
const express = require('express');
const { createAssetVersion, createVersionedHtmlMiddleware } = require('../utils/assetVersioning');
const { findAvailablePort } = require('./playwright-port');

const root = path.join(__dirname, '..');
const webV2DistDir = path.join(root, 'apps', 'web-v2', 'dist');
const webV2IndexPath = path.join(webV2DistDir, 'index.html');

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
  if (require('node:fs').existsSync(webV2IndexPath)) {
    app.use('/app-v2', express.static(webV2DistDir, { index: false, redirect: false }));
    app.get(['/app-v2', '/app-v2/*'], (req, res, next) => {
      if (path.extname(req.path)) {
        next();
        return;
      }
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(webV2IndexPath);
    });
  }
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
