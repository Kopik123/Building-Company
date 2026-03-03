const sequelize = require('../config/database');
const User = require('./User');
const Quote = require('./Quote');
const QuoteMessage = require('./QuoteMessage');
<<<<<<< HEAD
const QuoteAssignment = require('./QuoteAssignment');

// Define associations
=======
const InboxThread = require('./InboxThread');
const InboxMessage = require('./InboxMessage');
const QuoteClaimToken = require('./QuoteClaimToken');

>>>>>>> d02f614 (email)
User.hasMany(Quote, { foreignKey: 'clientId', as: 'quotes' });
Quote.belongsTo(User, { foreignKey: 'clientId', as: 'client' });

Quote.hasMany(QuoteMessage, { foreignKey: 'quoteId', as: 'messages' });
QuoteMessage.belongsTo(Quote, { foreignKey: 'quoteId', as: 'quote' });
<<<<<<< HEAD

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
=======
QuoteMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

InboxThread.belongsTo(User, { foreignKey: 'participantAId', as: 'participantA' });
InboxThread.belongsTo(User, { foreignKey: 'participantBId', as: 'participantB' });
InboxThread.hasMany(InboxMessage, { foreignKey: 'threadId', as: 'messages' });
InboxMessage.belongsTo(InboxThread, { foreignKey: 'threadId', as: 'thread' });
InboxMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
InboxMessage.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });

Quote.hasMany(QuoteClaimToken, { foreignKey: 'quoteId', as: 'claimTokens' });
QuoteClaimToken.belongsTo(Quote, { foreignKey: 'quoteId', as: 'quote' });

const syncDatabase = async () => {
  await sequelize.sync({ alter: true });
>>>>>>> d02f614 (email)
};

module.exports = {
  sequelize,
  User,
  Quote,
  QuoteMessage,
<<<<<<< HEAD
  QuoteAssignment,
=======
  InboxThread,
  InboxMessage,
  QuoteClaimToken,
>>>>>>> d02f614 (email)
  syncDatabase
};
