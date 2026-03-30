require('dotenv').config();

const { ensureDatabaseUrl } = require('./migrate');

const run = async () => {
  ensureDatabaseUrl();
  const { ensureIndexes, sequelize } = require('../models');

  try {
    await ensureIndexes();
    console.log('Indexes ensured successfully.');
  } finally {
    await sequelize.close();
  }
};

module.exports = {
  run
};

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((error) => {
      if (error?.code === 'MISSING_DATABASE_URL') {
        console.error(error.message);
        process.exit(1);
      }
      console.error('Ensure-indexes run failed:', error);
      process.exit(1);
    });
}
