const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Estimate = sequelize.define('Estimate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  quoteId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'approved', 'archived'),
    allowNull: false,
    defaultValue: 'draft'
  },
  revisionNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  revisionHistory: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  clientVisible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  sentToClientAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  documentUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  documentStoragePath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  documentFilename: {
    type: DataTypes.STRING,
    allowNull: true
  },
  documentMimeType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  documentSizeBytes: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
});

module.exports = Estimate;
