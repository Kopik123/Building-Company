const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EstimateLine = sequelize.define('EstimateLine', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  estimateId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  serviceId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  materialId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  lineType: {
    type: DataTypes.ENUM('service', 'material', 'custom'),
    allowNull: false,
    defaultValue: 'custom'
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: true
  },
  quantity: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 1
  },
  unitCost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  lineTotalOverride: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  lineTotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
});

module.exports = EstimateLine;
