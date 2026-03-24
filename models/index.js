const sequelize = require('../config/database');
const User = require('./User');
const Quote = require('./Quote');
const QuoteAttachment = require('./QuoteAttachment');
const QuoteEvent = require('./QuoteEvent');
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
const Estimate = require('./Estimate');
const EstimateLine = require('./EstimateLine');
const SessionRefreshToken = require('./SessionRefreshToken');
const DevicePushToken = require('./DevicePushToken');

User.hasMany(Quote, { foreignKey: 'clientId', as: 'quotes' });
Quote.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
Quote.belongsTo(User, { foreignKey: 'assignedManagerId', as: 'assignedManager' });
Quote.hasMany(QuoteAttachment, { foreignKey: 'quoteId', as: 'attachments', onDelete: 'CASCADE', hooks: true });
QuoteAttachment.belongsTo(Quote, { foreignKey: 'quoteId', as: 'quote' });
QuoteAttachment.belongsTo(User, { foreignKey: 'uploadedByUserId', as: 'uploader' });
User.hasMany(QuoteAttachment, { foreignKey: 'uploadedByUserId', as: 'quoteAttachments' });
Quote.hasMany(QuoteEvent, { foreignKey: 'quoteId', as: 'events', onDelete: 'CASCADE', hooks: true });
QuoteEvent.belongsTo(Quote, { foreignKey: 'quoteId', as: 'quote' });
QuoteEvent.belongsTo(User, { foreignKey: 'actorUserId', as: 'actor' });

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
GroupThread.belongsTo(Quote, { foreignKey: 'quoteId', as: 'quote' });
Quote.hasMany(GroupThread, { foreignKey: 'quoteId', as: 'groupThreads' });
GroupThread.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
Project.hasMany(GroupThread, { foreignKey: 'projectId', as: 'groupThreads' });
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
Project.hasMany(Estimate, { foreignKey: 'projectId', as: 'estimates' });
Estimate.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
Quote.hasMany(Estimate, { foreignKey: 'quoteId', as: 'estimates' });
Estimate.belongsTo(Quote, { foreignKey: 'quoteId', as: 'quote' });
Quote.belongsTo(Estimate, { foreignKey: 'currentEstimateId', as: 'currentEstimate' });
Quote.belongsTo(Project, { foreignKey: 'convertedProjectId', as: 'convertedProject' });
Project.belongsTo(Estimate, { foreignKey: 'acceptedEstimateId', as: 'acceptedEstimate' });
User.hasMany(Estimate, { foreignKey: 'createdById', as: 'createdEstimates' });
Estimate.belongsTo(User, { foreignKey: 'createdById', as: 'creator' });
Estimate.hasMany(EstimateLine, { foreignKey: 'estimateId', as: 'lines', onDelete: 'CASCADE', hooks: true });
EstimateLine.belongsTo(Estimate, { foreignKey: 'estimateId', as: 'estimate' });
EstimateLine.belongsTo(ServiceOffering, { foreignKey: 'serviceId', as: 'service' });
EstimateLine.belongsTo(Material, { foreignKey: 'materialId', as: 'material' });
User.hasMany(SessionRefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
SessionRefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(DevicePushToken, { foreignKey: 'userId', as: 'devicePushTokens' });
DevicePushToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

const toTableCacheKey = (tableName) => (typeof tableName === 'string' ? tableName : JSON.stringify(tableName));

const buildFieldResolver = (columnsObject) => {
  const rawColumns = Object.keys(columnsObject || {});
  const lowerMap = new Map(rawColumns.map((column) => [String(column).toLowerCase(), column]));
  return (field) => {
    if (rawColumns.includes(field)) return field;
    return lowerMap.get(String(field).toLowerCase()) || null;
  };
};

const loadTableMetadata = async (queryInterface, tableName, tableMetadataCache) => {
  const cacheKey = toTableCacheKey(tableName);
  if (tableMetadataCache.has(cacheKey)) {
    return tableMetadataCache.get(cacheKey);
  }

  const [existingIndexes, describedColumns] = await Promise.all([
    queryInterface.showIndex(tableName),
    queryInterface.describeTable(tableName)
  ]);

  const metadata = {
    existingIndexNames: new Set(existingIndexes.map((index) => index.name)),
    resolveField: buildFieldResolver(describedColumns)
  };
  tableMetadataCache.set(cacheKey, metadata);
  return metadata;
};

const addIndexIfMissing = async (queryInterface, tableName, name, fields, tableMetadataCache) => {
  const metadata = await loadTableMetadata(queryInterface, tableName, tableMetadataCache);
  if (metadata.existingIndexNames.has(name)) {
    return;
  }

  const resolvedFields = fields.map((field) => metadata.resolveField(field)).filter(Boolean);
  if (resolvedFields.length !== fields.length) {
    const missing = fields.filter((field) => !metadata.resolveField(field));
    console.warn(`Skipping index "${name}" on ${JSON.stringify(tableName)}. Missing column(s): ${missing.join(', ')}`);
    return;
  }

  await queryInterface.addIndex(tableName, { name, fields: resolvedFields });
  metadata.existingIndexNames.add(name);
};

const ensureIndexes = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const tableMetadataCache = new Map();
  const indexSpecs = [
    { table: Notification.getTableName(), name: 'notifications_user_read_created_idx', fields: ['userId', 'isRead', 'createdAt'] },
    { table: Notification.getTableName(), name: 'notifications_user_created_idx', fields: ['userId', 'createdAt'] },
    { table: Quote.getTableName(), name: 'quotes_status_created_idx', fields: ['status', 'createdAt'] },
    { table: Quote.getTableName(), name: 'quotes_workflow_status_created_idx', fields: ['workflowStatus', 'createdAt'] },
    { table: Quote.getTableName(), name: 'quotes_priority_created_idx', fields: ['priority', 'createdAt'] },
    { table: Quote.getTableName(), name: 'quotes_project_type_created_idx', fields: ['projectType', 'createdAt'] },
    { table: Quote.getTableName(), name: 'quotes_assigned_manager_idx', fields: ['assignedManagerId'] },
    { table: Quote.getTableName(), name: 'quotes_current_estimate_idx', fields: ['currentEstimateId'] },
    { table: Quote.getTableName(), name: 'quotes_converted_project_idx', fields: ['convertedProjectId'] },
    { table: QuoteAttachment.getTableName(), name: 'quote_attachments_quote_created_idx', fields: ['quoteId', 'createdAt'] },
    { table: QuoteAttachment.getTableName(), name: 'quote_attachments_uploader_idx', fields: ['uploadedByUserId'] },
    { table: QuoteEvent.getTableName(), name: 'quote_events_quote_created_idx', fields: ['quoteId', 'createdAt'] },
    { table: QuoteEvent.getTableName(), name: 'quote_events_quote_visibility_idx', fields: ['quoteId', 'visibility', 'createdAt'] },
    { table: User.getTableName(), name: 'users_role_active_idx', fields: ['role', 'isActive'] },
    { table: InboxThread.getTableName(), name: 'inbox_threads_participant_a_updated_idx', fields: ['participantAId', 'updatedAt'] },
    { table: InboxThread.getTableName(), name: 'inbox_threads_participant_b_updated_idx', fields: ['participantBId', 'updatedAt'] },
    { table: InboxMessage.getTableName(), name: 'inbox_messages_thread_created_idx', fields: ['threadId', 'createdAt'] },
    { table: InboxMessage.getTableName(), name: 'inbox_messages_recipient_read_idx', fields: ['recipientId', 'isRead'] },
    { table: GroupMember.getTableName(), name: 'group_members_user_thread_idx', fields: ['userId', 'groupThreadId'] },
    { table: GroupMember.getTableName(), name: 'group_members_thread_user_idx', fields: ['groupThreadId', 'userId'] },
    { table: GroupMessage.getTableName(), name: 'group_messages_thread_created_idx', fields: ['groupThreadId', 'createdAt'] },
    { table: GroupThread.getTableName(), name: 'group_threads_quote_idx', fields: ['quoteId'] },
    { table: GroupThread.getTableName(), name: 'group_threads_project_idx', fields: ['projectId'] },
    { table: QuoteClaimToken.getTableName(), name: 'quote_claim_tokens_quote_used_expires_idx', fields: ['quoteId', 'usedAt', 'expiresAt'] },
    { table: Project.getTableName(), name: 'projects_gallery_visible_order_idx', fields: ['showInGallery', 'galleryOrder'] },
    { table: Project.getTableName(), name: 'projects_status_created_idx', fields: ['status', 'createdAt'] },
    { table: Project.getTableName(), name: 'projects_client_status_idx', fields: ['clientId', 'status'] },
    { table: Project.getTableName(), name: 'projects_manager_status_idx', fields: ['assignedManagerId', 'status'] },
    { table: Project.getTableName(), name: 'projects_accepted_estimate_idx', fields: ['acceptedEstimateId'] },
    { table: ProjectMedia.getTableName(), name: 'project_media_project_type_idx', fields: ['projectId', 'mediaType'] },
    { table: ProjectMedia.getTableName(), name: 'project_media_gallery_idx', fields: ['projectId', 'showInGallery', 'galleryOrder'] },
    { table: ServiceOffering.getTableName(), name: 'service_offerings_public_order_idx', fields: ['showOnWebsite', 'displayOrder'] },
    { table: ServiceOffering.getTableName(), name: 'service_offerings_category_active_idx', fields: ['category', 'isActive'] },
    { table: Material.getTableName(), name: 'materials_category_active_idx', fields: ['category', 'isActive'] },
    { table: Material.getTableName(), name: 'materials_stock_min_idx', fields: ['stockQty', 'minStockQty'] },
    { table: Estimate.getTableName(), name: 'estimates_project_status_idx', fields: ['projectId', 'status'] },
    { table: Estimate.getTableName(), name: 'estimates_quote_status_idx', fields: ['quoteId', 'status'] },
    { table: Estimate.getTableName(), name: 'estimates_quote_version_idx', fields: ['quoteId', 'versionNumber'] },
    { table: Estimate.getTableName(), name: 'estimates_quote_current_idx', fields: ['quoteId', 'isCurrentVersion'] },
    { table: Estimate.getTableName(), name: 'estimates_creator_created_idx', fields: ['createdById', 'createdAt'] },
    { table: EstimateLine.getTableName(), name: 'estimate_lines_estimate_order_idx', fields: ['estimateId', 'sortOrder'] },
    { table: EstimateLine.getTableName(), name: 'estimate_lines_service_idx', fields: ['serviceId'] },
    { table: EstimateLine.getTableName(), name: 'estimate_lines_material_idx', fields: ['materialId'] },
    { table: SessionRefreshToken.getTableName(), name: 'session_refresh_tokens_user_expires_idx', fields: ['userId', 'expiresAt'] },
    { table: SessionRefreshToken.getTableName(), name: 'session_refresh_tokens_revoked_idx', fields: ['revokedAt'] },
    { table: DevicePushToken.getTableName(), name: 'device_push_tokens_user_platform_idx', fields: ['userId', 'platform'] }
  ];

  for (const spec of indexSpecs) {
    await addIndexIfMissing(queryInterface, spec.table, spec.name, spec.fields, tableMetadataCache);
  }
};

module.exports = {
  sequelize,
  User,
  Quote,
  QuoteAttachment,
  QuoteEvent,
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
  Estimate,
  EstimateLine,
  SessionRefreshToken,
  DevicePushToken,
  ensureIndexes
};
