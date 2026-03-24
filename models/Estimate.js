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
  decisionStatus: {
    type: DataTypes.ENUM('pending', 'viewed', 'revision_requested', 'accepted', 'declined'),
    allowNull: false,
    defaultValue: 'pending'
  },
  versionNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  isCurrentVersion: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  clientMessage: {
    type: DataTypes.TEXT,
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
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  viewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  respondedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  declinedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = Estimate;
