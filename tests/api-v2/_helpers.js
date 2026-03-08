const path = require('path');
const express = require('express');
const jwt = require('jsonwebtoken');
const mock = require('mock-require');

const rootDir = path.resolve(__dirname, '..', '..');
const modelsPath = path.join(rootDir, 'models', 'index.js');

const clearModule = (modulePath) => {
  delete require.cache[require.resolve(modulePath)];
};

const mockModels = (modelsStub) => {
  mock.stopAll();
  mock(modelsPath, modelsStub);
};

const loadRoute = (relativePath) => {
  const absolutePath = path.join(rootDir, relativePath);
  clearModule(absolutePath);
  return require(absolutePath);
};

const buildExpressApp = (mountPath, routeModule) => {
  const app = express();
  app.use(express.json());
  app.use(mountPath, routeModule);
  return app;
};

const signAccessToken = (id, role) =>
  jwt.sign(
    {
      id,
      role,
      type: 'access'
    },
    process.env.JWT_SECRET,
    { expiresIn: '20m' }
  );

module.exports = {
  mock,
  mockModels,
  loadRoute,
  buildExpressApp,
  signAccessToken
};
