'use strict';

const { DataTypes } = require('sequelize');

const tableExists = async (queryInterface, tableName) => {
  try {
    await queryInterface.describeTable(tableName);
    return true;
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('does not exist') || message.includes('no description found')) {
      return false;
    }
    throw error;
  }
};

const addIndexIfMissing = async (queryInterface, tableName, name, fields, options = {}) => {
  if (!await tableExists(queryInterface, tableName)) return;
  const indexes = await queryInterface.showIndex(tableName);
  if (indexes.some((index) => index.name === name)) return;
  await queryInterface.addIndex(tableName, fields, { name, ...options });
};

module.exports = {
  async up(queryInterface) {
    if (!await tableExists(queryInterface, 'deferred_file_cleanup_jobs')) {
      await queryInterface.createTable('deferred_file_cleanup_jobs', {
        id: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4
        },
        scope: {
          type: DataTypes.STRING,
          allowNull: false
        },
        entityType: {
          type: DataTypes.STRING,
          allowNull: true
        },
        entityId: {
          type: DataTypes.STRING,
          allowNull: true
        },
        quoteRef: {
          type: DataTypes.STRING,
          allowNull: true
        },
        files: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: []
        },
        attempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        maxAttempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 8
        },
        lastError: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        next_attempt_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false
        }
      });
    }

    await addIndexIfMissing(queryInterface, 'deferred_file_cleanup_jobs', 'deferred_file_cleanup_jobs_next_attempt_idx', ['next_attempt_at']);
    await addIndexIfMissing(queryInterface, 'deferred_file_cleanup_jobs', 'deferred_file_cleanup_jobs_scope_attempt_idx', ['scope', 'next_attempt_at']);
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'deferred_file_cleanup_jobs')) {
      await queryInterface.dropTable('deferred_file_cleanup_jobs');
    }
  }
};
