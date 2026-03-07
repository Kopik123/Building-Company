const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProjectMedia = sequelize.define('ProjectMedia', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  mediaType: {
    type: DataTypes.ENUM('image', 'document'),
    allowNull: false
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
  },
  caption: {
    type: DataTypes.STRING,
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
  isCover: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
});

module.exports = ProjectMedia;
