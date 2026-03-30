const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QuoteAttachment = sequelize.define('QuoteAttachment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  quoteId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  uploadedByUserId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mediaType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'image'
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  storagePath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sizeBytes: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
});

module.exports = QuoteAttachment;
