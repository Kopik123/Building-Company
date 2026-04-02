const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const migrator = new Umzug({
  migrations: {
    glob: path.join(__dirname, '..', 'migrations', '[0-9]*.js'),
    resolve: ({ name, path: migrationPath, context }) => {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const migration = require(migrationPath);
      return {
        name,
        up: async () => migration.up(context, Sequelize),
        down: async () => migration.down(context, Sequelize)
      };
    }
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({
    sequelize,
    tableName: 'SequelizeMeta'
  }),
  logger: console
});

const runMigrations = async () => migrator.up();

module.exports = {
  migrator,
  runMigrations
};
