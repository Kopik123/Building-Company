const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeferredFileCleanupJob = sequelize.define('DeferredFileCleanupJob', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
  nextAttemptAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'next_attempt_at'
  }
}, {
  tableName: 'deferred_file_cleanup_jobs'
});

module.exports = DeferredFileCleanupJob;
