const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QuoteClaimToken = sequelize.define('QuoteClaimToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  quoteId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  channel: {
    type: DataTypes.ENUM('email', 'phone'),
    allowNull: false
  },
  target: {
    type: DataTypes.STRING,
    allowNull: false
  },
  codeHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    allowNull: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  usedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = QuoteClaimToken;
