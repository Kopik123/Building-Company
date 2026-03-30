require('dotenv').config();

const { runMigrations } = require('./db/migrator');
const { createApp } = require('./app');

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'BOOTSTRAP_ADMIN_KEY'];
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);

if (missingEnvVars.length) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const rawPort = Number(process.env.PORT);
const PORT = (Number.isFinite(rawPort) && rawPort > 0 && rawPort <= 65535) ? rawPort : 3000;
const HOST = String(process.env.HOST || '').trim() || '127.0.0.1';
const app = createApp();

const startServer = async () => {
  try {
    await runMigrations();
    app.listen(PORT, HOST, () => {
      console.log(`Server running at http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = {
  app,
  startServer
};
