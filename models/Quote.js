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
<<<<<<< HEAD
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
=======
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
>>>>>>> d02f614 (email)
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
<<<<<<< HEAD
    allowNull: false
=======
    allowNull: true
>>>>>>> d02f614 (email)
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'responded', 'closed'),
<<<<<<< HEAD
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
=======
    allowNull: false,
    defaultValue: 'pending'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    allowNull: false,
    defaultValue: 'medium'
  }
>>>>>>> d02f614 (email)
});

module.exports = Quote;
