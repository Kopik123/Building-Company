const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ActivityEvent = sequelize.define('ActivityEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  actorUserId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  entityType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  visibility: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'internal'
  },
  eventType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  quoteId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  data: {
    type: DataTypes.JSON,
    allowNull: true
  }
});

module.exports = ActivityEvent;
