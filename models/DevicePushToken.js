const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DevicePushToken = sequelize.define('DevicePushToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  platform: {
    type: DataTypes.ENUM('android', 'ios', 'web'),
    allowNull: false
  },
  provider: {
    type: DataTypes.ENUM('fcm', 'apns', 'webpush', 'expo'),
    allowNull: false,
    defaultValue: 'expo'
  },
  appVariant: {
    type: DataTypes.ENUM('client', 'company'),
    allowNull: false,
    defaultValue: 'client'
  },
  pushToken: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deviceName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  appVersion: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastSeenAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
});

module.exports = DevicePushToken;
