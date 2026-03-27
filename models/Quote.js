const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Quote = sequelize.define('Quote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  isGuest: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  guestName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  guestEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  guestPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contactMethod: {
    type: DataTypes.ENUM('email', 'phone', 'both'),
    allowNull: true
  },
  publicToken: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  projectType: {
    type: DataTypes.ENUM('bathroom', 'kitchen', 'interior', 'tiling', 'extension', 'joinery', 'rendering', 'decorating', 'other'),
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  postcode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  budgetRange: {
    type: DataTypes.STRING,
    allowNull: true
  },
  proposalDetails: {
    type: DataTypes.JSON,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  contactEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'responded', 'closed'),
    allowNull: false,
    defaultValue: 'pending'
  },
  workflowStatus: {
    type: DataTypes.ENUM(
      'submitted',
      'triaged',
      'assigned',
      'awaiting_client_info',
      'estimate_in_progress',
      'estimate_sent',
      'client_review',
      'approved_ready_for_project',
      'converted_to_project',
      'closed_lost'
    ),
    allowNull: false,
    defaultValue: 'submitted'
  },
  sourceChannel: {
    type: DataTypes.STRING,
    allowNull: true
  },
  assignedManagerId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  currentEstimateId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  convertedProjectId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  assignedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  convertedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  closedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lossReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    allowNull: false,
    defaultValue: 'medium'
  }
});

module.exports = Quote;
