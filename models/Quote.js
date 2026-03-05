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
    type: DataTypes.ENUM('bathroom', 'kitchen', 'tiling', 'extension', 'joinery', 'rendering', 'decorating', 'other'),
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
  assignedManagerId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    allowNull: false,
    defaultValue: 'medium'
  }
});

module.exports = Quote;
