const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InboxThread = sequelize.define('InboxThread', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  participantAId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  participantBId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quoteId: {
    type: DataTypes.UUID,
    allowNull: true
  }
});

module.exports = InboxThread;
