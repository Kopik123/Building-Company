const sequelize = require('../config/database');
const User = require('./User');
const Quote = require('./Quote');
const QuoteMessage = require('./QuoteMessage');
const QuoteAssignment = require('./QuoteAssignment');

// Define associations
User.hasMany(Quote, { foreignKey: 'clientId', as: 'quotes' });
Quote.belongsTo(User, { foreignKey: 'clientId', as: 'client' });

Quote.hasMany(QuoteMessage, { foreignKey: 'quoteId', as: 'messages' });
QuoteMessage.belongsTo(Quote, { foreignKey: 'quoteId', as: 'quote' });

User.hasMany(QuoteMessage, { foreignKey: 'senderId', as: 'sentMessages' });
QuoteMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

Quote.hasMany(QuoteAssignment, { foreignKey: 'quoteId', as: 'assignments' });
QuoteAssignment.belongsTo(Quote, { foreignKey: 'quoteId', as: 'quote' });

User.hasMany(QuoteAssignment, { foreignKey: 'managerId', as: 'assignedQuotes' });
QuoteAssignment.belongsTo(User, { foreignKey: 'managerId', as: 'manager' });

QuoteAssignment.belongsTo(User, { foreignKey: 'assignedBy', as: 'assignedByUser' });

// Sync database
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('Database synced successfully');
  } catch (error) {
    console.error('Error syncing database:', error);
  }
};

module.exports = {
  sequelize,
  User,
  Quote,
  QuoteMessage,
  QuoteAssignment,
  syncDatabase
};
