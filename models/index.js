const sequelize = require('../config/database');
const User = require('./User');
const Quote = require('./Quote');
const QuoteMessage = require('./QuoteMessage');
const InboxThread = require('./InboxThread');
const InboxMessage = require('./InboxMessage');
const QuoteClaimToken = require('./QuoteClaimToken');

User.hasMany(Quote, { foreignKey: 'clientId', as: 'quotes' });
Quote.belongsTo(User, { foreignKey: 'clientId', as: 'client' });

Quote.hasMany(QuoteMessage, { foreignKey: 'quoteId', as: 'messages' });
QuoteMessage.belongsTo(Quote, { foreignKey: 'quoteId', as: 'quote' });
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
  const shouldAlter = process.env.DB_SYNC_ALTER
    ? process.env.DB_SYNC_ALTER === 'true'
    : process.env.NODE_ENV !== 'production';

  if (shouldAlter) {
    await sequelize.sync({ alter: true });
    return;
  }

  await sequelize.sync();
};

module.exports = {
  sequelize,
  User,
  Quote,
  QuoteMessage,
  InboxThread,
  InboxMessage,
  QuoteClaimToken,
  syncDatabase
};
