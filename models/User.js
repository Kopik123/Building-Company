const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const sequelize = require('../config/database');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('client', 'employee', 'manager', 'admin'),
      allowNull: false,
      defaultValue: 'client'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    jobTitle: {
      type: DataTypes.STRING,
      allowNull: true
    },
    specialism: {
      type: DataTypes.STRING,
      allowNull: true
    },
    availabilityStatus: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'available'
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    crmLifecycleStatus: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'lead'
    },
    crmLifecycleUpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    hooks: {
      beforeValidate: (user) => {
        if (typeof user.email !== 'undefined' && user.email !== null) {
          user.email = String(user.email).trim().toLowerCase();
        }
      },
      beforeCreate: async (user) => {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  }
);

User.prototype.validatePassword = function validatePassword(password) {
  return bcrypt.compare(password, this.password);
};

User.prototype.toJSON = function toJSON() {
  const value = { ...this.get() };
  delete value.password;
  return value;
};

module.exports = User;
