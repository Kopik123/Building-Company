const path = require('path');
const express = require('express');

const root = path.join(__dirname, '..');

const createStaticApp = () => {
  const app = express();

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

  app.use(express.static(root));
  return app;
};

const startStaticServer = ({ port = Number(process.env.PW_STATIC_PORT || 4173) } = {}) => {
  const app = createStaticApp();
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Playwright static server running on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
};

if (require.main === module) {
  startStaticServer();
}

module.exports = {
  createStaticApp,
  startStaticServer
};
