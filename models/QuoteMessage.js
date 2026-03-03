const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QuoteMessage = sequelize.define('QuoteMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  quoteId: {
    type: DataTypes.UUID,
<<<<<<< HEAD
    allowNull: false,
    references: {
      model: 'Quotes',
      key: 'id'
    }
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
=======
    allowNull: false
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false
>>>>>>> d02f614 (email)
  },
  messageText: {
    type: DataTypes.TEXT,
    allowNull: false
  },
<<<<<<< HEAD
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true
=======
  isRead: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
>>>>>>> d02f614 (email)
});

module.exports = QuoteMessage;
