const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GroupThread = sequelize.define('GroupThread', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quoteId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  }
});

module.exports = GroupThread;
