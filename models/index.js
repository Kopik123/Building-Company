const sequelize = require('../config/database');
const User = require('./User');
const Quote = require('./Quote');
const QuoteMessage = require('./QuoteMessage');
const InboxThread = require('./InboxThread');
const InboxMessage = require('./InboxMessage');
const QuoteClaimToken = require('./QuoteClaimToken');
const Notification = require('./Notification');
const GroupThread = require('./GroupThread');
const GroupMember = require('./GroupMember');
const GroupMessage = require('./GroupMessage');
const Project = require('./Project');
const ProjectMedia = require('./ProjectMedia');
const ServiceOffering = require('./ServiceOffering');
const Material = require('./Material');

User.hasMany(Quote, { foreignKey: 'clientId', as: 'quotes' });
Quote.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
Quote.belongsTo(User, { foreignKey: 'assignedManagerId', as: 'assignedManager' });

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

Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });

GroupThread.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
GroupThread.hasMany(GroupMember, { foreignKey: 'groupThreadId', as: 'members' });
GroupThread.hasMany(GroupMessage, { foreignKey: 'groupThreadId', as: 'messages' });
GroupMember.belongsTo(GroupThread, { foreignKey: 'groupThreadId', as: 'thread' });
GroupMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });
GroupMessage.belongsTo(GroupThread, { foreignKey: 'groupThreadId', as: 'thread' });
GroupMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

Project.hasMany(ProjectMedia, {
  foreignKey: 'projectId',
  as: 'media',
  onDelete: 'CASCADE',
  hooks: true
});
ProjectMedia.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
Project.belongsTo(Quote, { foreignKey: 'quoteId', as: 'quote' });
Quote.hasMany(Project, { foreignKey: 'quoteId', as: 'projects' });
Project.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
User.hasMany(Project, { foreignKey: 'clientId', as: 'projects' });
Project.belongsTo(User, { foreignKey: 'assignedManagerId', as: 'assignedManager' });
User.hasMany(Project, { foreignKey: 'assignedManagerId', as: 'managedProjects' });

const addIndexIfMissing = async (queryInterface, tableName, name, fields) => {
  const existingIndexes = await queryInterface.showIndex(tableName);
  if (existingIndexes.some((index) => index.name === name)) {
    return;
  }

  await queryInterface.addIndex(tableName, { name, fields });
};

const ensureIndexes = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const indexSpecs = [
    { table: Notification.getTableName(), name: 'notifications_user_read_created_idx', fields: ['userId', 'isRead', 'createdAt'] },
    { table: Notification.getTableName(), name: 'notifications_user_created_idx', fields: ['userId', 'createdAt'] },
    { table: Quote.getTableName(), name: 'quotes_status_created_idx', fields: ['status', 'createdAt'] },
    { table: Quote.getTableName(), name: 'quotes_priority_created_idx', fields: ['priority', 'createdAt'] },
    { table: Quote.getTableName(), name: 'quotes_project_type_created_idx', fields: ['projectType', 'createdAt'] },
    { table: Quote.getTableName(), name: 'quotes_assigned_manager_idx', fields: ['assignedManagerId'] },
    { table: User.getTableName(), name: 'users_role_active_idx', fields: ['role', 'isActive'] },
    { table: InboxThread.getTableName(), name: 'inbox_threads_participant_a_updated_idx', fields: ['participantAId', 'updatedAt'] },
    { table: InboxThread.getTableName(), name: 'inbox_threads_participant_b_updated_idx', fields: ['participantBId', 'updatedAt'] },
    { table: InboxMessage.getTableName(), name: 'inbox_messages_thread_created_idx', fields: ['threadId', 'createdAt'] },
    { table: InboxMessage.getTableName(), name: 'inbox_messages_recipient_read_idx', fields: ['recipientId', 'isRead'] },
    { table: GroupMember.getTableName(), name: 'group_members_user_thread_idx', fields: ['userId', 'groupThreadId'] },
    { table: GroupMember.getTableName(), name: 'group_members_thread_user_idx', fields: ['groupThreadId', 'userId'] },
    { table: GroupMessage.getTableName(), name: 'group_messages_thread_created_idx', fields: ['groupThreadId', 'createdAt'] },
    { table: GroupThread.getTableName(), name: 'group_threads_quote_idx', fields: ['quoteId'] },
    { table: QuoteClaimToken.getTableName(), name: 'quote_claim_tokens_quote_used_expires_idx', fields: ['quoteId', 'usedAt', 'expiresAt'] },
    { table: Project.getTableName(), name: 'projects_gallery_visible_order_idx', fields: ['showInGallery', 'galleryOrder'] },
    { table: Project.getTableName(), name: 'projects_status_created_idx', fields: ['status', 'createdAt'] },
    { table: Project.getTableName(), name: 'projects_client_status_idx', fields: ['clientId', 'status'] },
    { table: Project.getTableName(), name: 'projects_manager_status_idx', fields: ['assignedManagerId', 'status'] },
    { table: ProjectMedia.getTableName(), name: 'project_media_project_type_idx', fields: ['projectId', 'mediaType'] },
    { table: ProjectMedia.getTableName(), name: 'project_media_gallery_idx', fields: ['projectId', 'showInGallery', 'galleryOrder'] },
    { table: ServiceOffering.getTableName(), name: 'service_offerings_public_order_idx', fields: ['showOnWebsite', 'displayOrder'] },
    { table: ServiceOffering.getTableName(), name: 'service_offerings_category_active_idx', fields: ['category', 'isActive'] },
    { table: Material.getTableName(), name: 'materials_category_active_idx', fields: ['category', 'isActive'] },
    { table: Material.getTableName(), name: 'materials_stock_min_idx', fields: ['stockQty', 'minStockQty'] }
  ];

  for (const spec of indexSpecs) {
    await addIndexIfMissing(queryInterface, spec.table, spec.name, spec.fields);
  }
};

const syncDatabase = async () => {
  const shouldAlter = process.env.DB_SYNC_ALTER
    ? process.env.DB_SYNC_ALTER === 'true'
    : process.env.NODE_ENV !== 'production';

  if (shouldAlter) {
    await sequelize.sync({ alter: true });
    await ensureIndexes();
    return;
  }

  await sequelize.sync();
  await ensureIndexes();
};

module.exports = {
  sequelize,
  User,
  Quote,
  QuoteMessage,
  InboxThread,
  InboxMessage,
  QuoteClaimToken,
  Notification,
  GroupThread,
  GroupMember,
  GroupMessage,
  Project,
  ProjectMedia,
  ServiceOffering,
  Material,
  syncDatabase
};
