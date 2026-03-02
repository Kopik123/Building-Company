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
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  projectType: {
    type: DataTypes.ENUM('bathroom', 'kitchen', 'tiling', 'extension', 'joinery', 'rendering', 'decorating', 'other'),
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  budgetRange: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  contactEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'responded', 'closed'),
    defaultValue: 'pending',
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium',
    allowNull: false
  }
}, {
  timestamps: true
});

module.exports = Quote;
