require('dotenv').config();
const { Sequelize } = require('sequelize');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const normalizeSqliteStorage = (value) => {
  const normalized = String(value || '').trim();
  if (normalized === 'sqlite::memory:' || normalized === 'sqlite://:memory:') {
    return ':memory:';
  }

  if (normalized.startsWith('sqlite:///')) {
    return normalized.slice('sqlite://'.length);
  }

  if (normalized.startsWith('sqlite://')) {
    return normalized.slice('sqlite://'.length);
  }

  if (normalized.startsWith('sqlite:')) {
    return normalized.slice('sqlite:'.length);
  }

  return null;
};

const sqliteStorage = normalizeSqliteStorage(databaseUrl);

const sequelize = sqliteStorage
  ? new Sequelize({
      dialect: 'sqlite',
      storage: sqliteStorage,
      logging: false
    })
  : new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: false
    });

module.exports = sequelize;
