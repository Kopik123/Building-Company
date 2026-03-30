const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QuoteEvent = sequelize.define('QuoteEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  quoteId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  actorUserId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  eventType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  visibility: {
    type: DataTypes.ENUM('internal', 'client', 'public'),
    allowNull: false,
    defaultValue: 'internal'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  data: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
  }
});

module.exports = QuoteEvent;
