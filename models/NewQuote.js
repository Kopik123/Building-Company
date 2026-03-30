const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NewQuote = sequelize.define('NewQuote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  quoteRef: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'quote_ref'
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  clientName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  clientEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  clientPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  projectType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  postcode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  budgetRange: {
    type: DataTypes.STRING,
    allowNull: true
  },
  proposalDetails: {
    type: DataTypes.JSON,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  sourceChannel: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'client_quote_portal'
  }
}, {
  tableName: 'new_quotes'
});

module.exports = NewQuote;
