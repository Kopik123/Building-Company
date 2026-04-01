'use strict';

const { tableExists, addColumnIfMissing, addIndexIfMissing } = require('./_migration-helpers');

const TABLE = 'system_logs';

module.exports = {
  async up(queryInterface, Sequelize) {
    const exists = await tableExists(queryInterface, TABLE);
    if (!exists) {
      await queryInterface.createTable(TABLE, {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        category: {
          type: Sequelize.ENUM('site', 'database', 'user_action', 'visit', 'error'),
          allowNull: false,
          defaultValue: 'site'
        },
        level: {
          type: Sequelize.ENUM('info', 'warn', 'error'),
          allowNull: false,
          defaultValue: 'info'
        },
        message: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        meta: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: null
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: true,
          defaultValue: null
        },
        ip: {
          type: Sequelize.STRING(64),
          allowNull: true,
          defaultValue: null
        },
        method: {
          type: Sequelize.STRING(16),
          allowNull: true,
          defaultValue: null
        },
        path: {
          type: Sequelize.STRING(512),
          allowNull: true,
          defaultValue: null
        },
        statusCode: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });
    } else {
      await addColumnIfMissing(queryInterface, TABLE, 'userId', { type: Sequelize.UUID, allowNull: true, defaultValue: null });
      await addColumnIfMissing(queryInterface, TABLE, 'ip', { type: Sequelize.STRING(64), allowNull: true, defaultValue: null });
      await addColumnIfMissing(queryInterface, TABLE, 'method', { type: Sequelize.STRING(16), allowNull: true, defaultValue: null });
      await addColumnIfMissing(queryInterface, TABLE, 'path', { type: Sequelize.STRING(512), allowNull: true, defaultValue: null });
      await addColumnIfMissing(queryInterface, TABLE, 'statusCode', { type: Sequelize.INTEGER, allowNull: true, defaultValue: null });
      await addColumnIfMissing(queryInterface, TABLE, 'meta', { type: Sequelize.JSON, allowNull: true, defaultValue: null });
    }

    await addIndexIfMissing(queryInterface, TABLE, 'system_logs_category_created_idx', ['category', 'createdAt']);
    await addIndexIfMissing(queryInterface, TABLE, 'system_logs_level_created_idx', ['level', 'createdAt']);
    await addIndexIfMissing(queryInterface, TABLE, 'system_logs_created_idx', ['createdAt']);
    await addIndexIfMissing(queryInterface, TABLE, 'system_logs_user_id_idx', ['userId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable(TABLE);
  }
};
