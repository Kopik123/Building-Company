const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LOG_CATEGORIES = ['site', 'database', 'user_action', 'visit', 'error'];
const LOG_LEVELS = ['info', 'warn', 'error'];

const SystemLog = sequelize.define('SystemLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  category: {
    type: DataTypes.ENUM(...LOG_CATEGORIES),
    allowNull: false,
    defaultValue: 'site'
  },
  level: {
    type: DataTypes.ENUM(...LOG_LEVELS),
    allowNull: false,
    defaultValue: 'info'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  meta: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null
  },
  ip: {
    type: DataTypes.STRING(64),
    allowNull: true,
    defaultValue: null
  },
  method: {
    type: DataTypes.STRING(16),
    allowNull: true,
    defaultValue: null
  },
  path: {
    type: DataTypes.STRING(512),
    allowNull: true,
    defaultValue: null
  },
  statusCode: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'system_logs',
  updatedAt: false
});

module.exports = SystemLog;
