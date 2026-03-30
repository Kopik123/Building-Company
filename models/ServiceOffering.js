const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ServiceOffering = sequelize.define('ServiceOffering', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  shortDescription: {
    type: DataTypes.STRING,
    allowNull: true
  },
  summaryLine: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fullDescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.ENUM('bathroom', 'kitchen', 'interior', 'outdoor', 'other'),
    allowNull: false,
    defaultValue: 'other'
  },
  basePriceFrom: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  heroImageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  serviceCtaLabel: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  showOnWebsite: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
});

module.exports = ServiceOffering;
