const PROJECT_STATUSES = Object.freeze(['planning', 'in_progress', 'completed', 'on_hold']);
const QUOTE_STATUSES = Object.freeze(['pending', 'in_progress', 'responded', 'closed']);
const QUOTE_PRIORITIES = Object.freeze(['low', 'medium', 'high']);
const SERVICE_CATEGORIES = Object.freeze(['bathroom', 'kitchen', 'interior', 'outdoor', 'other']);
const MATERIAL_CATEGORIES = Object.freeze(['tiles', 'plumbing', 'electrical', 'joinery', 'paint', 'hardware', 'other']);
const STAFF_ROLES = Object.freeze(['employee', 'manager', 'admin']);
const STAFF_CREATION_ROLES = Object.freeze(['employee', 'manager']);

const toPlainObject = (value) => (value && typeof value === 'object' ? value : {});
const toArray = (value) => (Array.isArray(value) ? value : []);
const toStringOr = (value, fallback = '') => (typeof value === 'string' ? value : fallback);
const toNullableString = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};
const toBoolean = (value, fallback = false) => (typeof value === 'boolean' ? value : fallback);
const toNullableNumber = (value) => {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeUserSummary = (value) => {
  const plain = toPlainObject(value);
  return {
    id: toStringOr(plain.id),
    name: toNullableString(plain.name),
    email: toNullableString(plain.email),
    role: toNullableString(plain.role),
    phone: toNullableString(plain.phone),
    companyName: toNullableString(plain.companyName),
    isActive: toBoolean(plain.isActive, true),
    createdAt: toNullableString(plain.createdAt),
    updatedAt: toNullableString(plain.updatedAt)
  };
};

const normalizeMessageAttachment = (value) => {
  const plain = toPlainObject(value);
  return {
    name: toNullableString(plain.name),
    url: toNullableString(plain.url),
    size: toNullableNumber(plain.size),
    mimeType: toNullableString(plain.mimeType)
  };
};

const normalizeThreadMessage = (value) => {
  const plain = toPlainObject(value);
  return {
    id: toStringOr(plain.id),
    threadId: toNullableString(plain.threadId),
    senderId: toNullableString(plain.senderId),
    recipientId: toNullableString(plain.recipientId),
    body: toNullableString(plain.body),
    createdAt: toNullableString(plain.createdAt),
    updatedAt: toNullableString(plain.updatedAt),
    isRead: toBoolean(plain.isRead, false),
    sender: normalizeUserSummary(plain.sender),
    attachments: toArray(plain.attachments).map(normalizeMessageAttachment)
  };
};

const normalizeProjectSummary = (value) => {
  const plain = toPlainObject(value);
  return {
    id: toStringOr(plain.id),
    title: toNullableString(plain.title),
    location: toNullableString(plain.location),
    status: toNullableString(plain.status) || PROJECT_STATUSES[0],
    clientId: toNullableString(plain.clientId),
    assignedManagerId: toNullableString(plain.assignedManagerId),
    quoteId: toNullableString(plain.quoteId),
    description: toNullableString(plain.description),
    budgetEstimate: toNullableString(plain.budgetEstimate),
    startDate: toNullableString(plain.startDate),
    endDate: toNullableString(plain.endDate),
    showInGallery: toBoolean(plain.showInGallery, false),
    galleryOrder: toNullableNumber(plain.galleryOrder) ?? 0,
    isActive: toBoolean(plain.isActive, true),
    imageCount: toNullableNumber(plain.imageCount) ?? 0,
    documentCount: toNullableNumber(plain.documentCount) ?? 0,
    createdAt: toNullableString(plain.createdAt),
    updatedAt: toNullableString(plain.updatedAt),
    client: normalizeUserSummary(plain.client),
    assignedManager: normalizeUserSummary(plain.assignedManager),
    quote: normalizeQuoteSummary(plain.quote),
    media: toArray(plain.media).map((item) => ({
      id: toStringOr(item?.id),
      mediaType: toNullableString(item?.mediaType),
      url: toNullableString(item?.url),
      filename: toNullableString(item?.filename)
    }))
  };
};

const normalizeQuoteSummary = (value) => {
  const plain = toPlainObject(value);
  return {
    id: toStringOr(plain.id),
    projectType: toNullableString(plain.projectType),
    location: toNullableString(plain.location),
    status: toNullableString(plain.status) || QUOTE_STATUSES[0],
    priority: toNullableString(plain.priority) || QUOTE_PRIORITIES[0],
    description: toNullableString(plain.description),
    guestName: toNullableString(plain.guestName),
    guestEmail: toNullableString(plain.guestEmail),
    postcode: toNullableString(plain.postcode),
    assignedManagerId: toNullableString(plain.assignedManagerId),
    clientId: toNullableString(plain.clientId),
    createdAt: toNullableString(plain.createdAt),
    updatedAt: toNullableString(plain.updatedAt),
    client: normalizeUserSummary(plain.client),
    assignedManager: normalizeUserSummary(plain.assignedManager)
  };
};

const normalizeThreadSummary = (value) => {
  const plain = toPlainObject(value);
  return {
    id: toStringOr(plain.id),
    name: toNullableString(plain.name),
    subject: toNullableString(plain.subject),
    latestMessagePreview: toNullableString(plain.latestMessagePreview),
    latestMessageAt: toNullableString(plain.latestMessageAt),
    latestMessageSenderId: toNullableString(plain.latestMessageSenderId),
    messageCount: toNullableNumber(plain.messageCount) ?? 0,
    memberCount: toNullableNumber(plain.memberCount) ?? 0,
    currentUserMembershipRole: toNullableString(plain.currentUserMembershipRole),
    createdAt: toNullableString(plain.createdAt),
    updatedAt: toNullableString(plain.updatedAt),
    latestMessageSender: normalizeUserSummary(plain.latestMessageSender),
    project: normalizeProjectSummary(plain.project),
    quote: normalizeQuoteSummary(plain.quote)
  };
};

const normalizeDirectThreadSummary = (value) => {
  const plain = toPlainObject(value);
  return {
    id: toStringOr(plain.id),
    subject: toNullableString(plain.subject),
    participantAId: toNullableString(plain.participantAId),
    participantBId: toNullableString(plain.participantBId),
    participantCount: toNullableNumber(plain.participantCount) ?? 2,
    latestMessagePreview: toNullableString(plain.latestMessagePreview),
    latestMessageAt: toNullableString(plain.latestMessageAt),
    latestMessageSenderId: toNullableString(plain.latestMessageSenderId),
    unreadCount: toNullableNumber(plain.unreadCount) ?? 0,
    createdAt: toNullableString(plain.createdAt),
    updatedAt: toNullableString(plain.updatedAt),
    counterparty: normalizeUserSummary(plain.counterparty),
    participantA: normalizeUserSummary(plain.participantA),
    participantB: normalizeUserSummary(plain.participantB)
  };
};

const normalizeNotification = (value) => {
  const plain = toPlainObject(value);
  return {
    id: toStringOr(plain.id),
    type: toNullableString(plain.type),
    title: toNullableString(plain.title),
    body: toNullableString(plain.body),
    isRead: toBoolean(plain.isRead, false),
    createdAt: toNullableString(plain.createdAt),
    updatedAt: toNullableString(plain.updatedAt)
  };
};

const normalizeCrmClient = (value) => {
  const plain = normalizeUserSummary(value);
  return {
    ...plain,
    role: 'client'
  };
};

const normalizeCrmStaffMember = (value) => {
  const plain = normalizeUserSummary(value);
  return {
    ...plain,
    role: STAFF_ROLES.includes(plain.role || '') ? plain.role : 'employee'
  };
};

const normalizeInventoryService = (value) => {
  const plain = toPlainObject(value);
  return {
    id: toStringOr(plain.id),
    slug: toNullableString(plain.slug),
    title: toNullableString(plain.title),
    shortDescription: toNullableString(plain.shortDescription),
    fullDescription: toNullableString(plain.fullDescription),
    category: toNullableString(plain.category) || SERVICE_CATEGORIES.at(-1),
    basePriceFrom: toNullableNumber(plain.basePriceFrom),
    heroImageUrl: toNullableString(plain.heroImageUrl),
    isFeatured: toBoolean(plain.isFeatured, false),
    showOnWebsite: toBoolean(plain.showOnWebsite, true),
    displayOrder: toNullableNumber(plain.displayOrder) ?? 0,
    isActive: toBoolean(plain.isActive, true),
    createdAt: toNullableString(plain.createdAt),
    updatedAt: toNullableString(plain.updatedAt)
  };
};

const normalizeInventoryMaterial = (value) => {
  const plain = toPlainObject(value);
  return {
    id: toStringOr(plain.id),
    sku: toNullableString(plain.sku),
    name: toNullableString(plain.name),
    category: toNullableString(plain.category) || MATERIAL_CATEGORIES.at(-1),
    unit: toNullableString(plain.unit) || 'pcs',
    stockQty: toNullableNumber(plain.stockQty) ?? 0,
    minStockQty: toNullableNumber(plain.minStockQty) ?? 0,
    unitCost: toNullableNumber(plain.unitCost),
    supplier: toNullableString(plain.supplier),
    notes: toNullableString(plain.notes),
    isActive: toBoolean(plain.isActive, true),
    createdAt: toNullableString(plain.createdAt),
    updatedAt: toNullableString(plain.updatedAt)
  };
};

const normalizeCollection = (value, normalizer) => toArray(value).map((item) => normalizer(item));
const normalizeEntity = (value, normalizer) => {
  if (!value || typeof value !== 'object') return null;
  return normalizer(value);
};

const normalizeListResponse = (payload, key, normalizer) => normalizeCollection(payload?.data?.[key], normalizer);
const normalizeItemResponse = (payload, key, normalizer) => normalizeEntity(payload?.data?.[key], normalizer);

module.exports = {
  PROJECT_STATUSES,
  QUOTE_STATUSES,
  QUOTE_PRIORITIES,
  SERVICE_CATEGORIES,
  MATERIAL_CATEGORIES,
  STAFF_ROLES,
  STAFF_CREATION_ROLES,
  normalizeUserSummary,
  normalizeMessageAttachment,
  normalizeThreadMessage,
  normalizeProjectSummary,
  normalizeQuoteSummary,
  normalizeThreadSummary,
  normalizeDirectThreadSummary,
  normalizeNotification,
  normalizeCrmClient,
  normalizeCrmStaffMember,
  normalizeInventoryService,
  normalizeInventoryMaterial,
  normalizeListResponse,
  normalizeItemResponse
};

module.exports.default = module.exports;
