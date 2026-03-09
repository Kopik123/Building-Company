require('dotenv').config();

const { runMigrations } = require('./db/migrator');
const { createApp } = require('./app');

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'BOOTSTRAP_ADMIN_KEY'];
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);

if (missingEnvVars.length) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 3000;
const app = createApp();

const startServer = async () => {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
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
