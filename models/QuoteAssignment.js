const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QuoteAssignment = sequelize.define('QuoteAssignment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  quoteId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Quotes',
      key: 'id'
    }
  },
  managerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  assignedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  updatedAt: false
});

module.exports = QuoteAssignment;
