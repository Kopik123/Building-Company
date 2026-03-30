const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quoteId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  acceptedEstimateId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  assignedManagerId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('planning', 'in_progress', 'completed', 'on_hold'),
    allowNull: false,
    defaultValue: 'planning'
  },
  projectStage: {
    type: DataTypes.ENUM('briefing', 'scope_locked', 'procurement', 'site_prep', 'installation', 'finishing', 'handover', 'aftercare'),
    allowNull: false,
    defaultValue: 'briefing'
  },
  currentMilestone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  workPackage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  budgetEstimate: {
    type: DataTypes.STRING,
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  showInGallery: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  galleryOrder: {
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

module.exports = Project;
