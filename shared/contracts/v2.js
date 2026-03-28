const { z } = require('zod');

const QUOTE_WORKFLOW_STATUSES = Object.freeze([
  'submitted',
  'triaged',
  'assigned',
  'awaiting_client_info',
  'estimate_in_progress',
  'estimate_sent',
  'client_review',
  'approved_ready_for_project',
  'converted_to_project',
  'closed_lost'
]);

const ESTIMATE_DECISION_STATUSES = Object.freeze([
  'pending',
  'viewed',
  'revision_requested',
  'accepted',
  'declined'
]);

const ESTIMATE_STATUSES = Object.freeze([
  'draft',
  'sent',
  'approved',
  'archived',
  'superseded'
]);

const LEGACY_TO_WORKFLOW_STATUS = Object.freeze({
  pending: 'submitted',
  in_progress: 'assigned',
  responded: 'estimate_sent',
  closed: 'closed_lost'
});

const normalizeWorkflowStatusValue = (value, fallback = QUOTE_WORKFLOW_STATUSES[0]) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (QUOTE_WORKFLOW_STATUSES.includes(normalized)) return normalized;
  if (LEGACY_TO_WORKFLOW_STATUS[normalized]) return LEGACY_TO_WORKFLOW_STATUS[normalized];
  return fallback;
};

const normalizeEstimateDecisionStatusValue = (value, fallback = ESTIMATE_DECISION_STATUSES[0]) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (ESTIMATE_DECISION_STATUSES.includes(normalized)) return normalized;
  if (normalized === 'approved') return 'accepted';
  return fallback;
};

const normalizeEstimateStatusValue = (value, fallback = ESTIMATE_STATUSES[0]) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (ESTIMATE_STATUSES.includes(normalized)) return normalized;
  return fallback;
};

const PROJECT_STATUSES = Object.freeze(['planning', 'in_progress', 'completed', 'on_hold']);
const PROJECT_STAGES = Object.freeze(['briefing', 'scope_locked', 'procurement', 'site_prep', 'installation', 'finishing', 'handover', 'aftercare']);
const CLIENT_LIFECYCLE_STATUSES = Object.freeze(['lead', 'quoted', 'approved', 'active_project', 'completed', 'archived']);
const QUOTE_STATUSES = Object.freeze(['pending', 'in_progress', 'responded', 'closed']);
const QUOTE_PRIORITIES = Object.freeze(['low', 'medium', 'high']);
const QUOTE_PROJECT_TYPES = Object.freeze(['bathroom', 'kitchen', 'interior', 'tiling', 'extension', 'joinery', 'rendering', 'decorating', 'other']);
const QUOTE_CONTACT_METHODS = Object.freeze(['email', 'phone', 'both']);
const QUOTE_PROPOSAL_PROPERTY_TYPES = Object.freeze(['flat', 'terraced', 'semi_detached', 'detached', 'commercial', 'other']);
const QUOTE_PROPOSAL_ROOM_TYPES = Object.freeze(['kitchen', 'bathroom', 'living_area', 'bedroom', 'utility', 'hall_stairs', 'extension_area', 'outdoor_connection', 'whole_home', 'other']);
const QUOTE_PROPOSAL_OCCUPANCY_STATUSES = Object.freeze(['living_in_home', 'partially_occupied', 'empty_property', 'tenanted', 'commercial_live', 'other']);
const QUOTE_PROPOSAL_PLANNING_STAGES = Object.freeze(['idea', 'getting_prices', 'ready_to_start', 'already_underway', 'urgent_recovery']);
const QUOTE_PROPOSAL_START_WINDOWS = Object.freeze(['asap', 'within_1_month', 'within_3_months', 'within_6_months', 'planning_ahead']);
const QUOTE_PROPOSAL_FINISH_LEVELS = Object.freeze(['essential', 'elevated', 'premium', 'bespoke']);
const QUOTE_PROPOSAL_SITE_ACCESS = Object.freeze(['easy_ground_floor', 'stairs_only', 'tight_access', 'restricted_parking', 'unknown']);
const QUOTE_PROPOSAL_PRIORITIES = Object.freeze(['finish_quality', 'budget_control', 'storage', 'speed', 'family_living', 'low_maintenance', 'future_sale', 'energy_efficiency']);
const SERVICE_CATEGORIES = Object.freeze(['bathroom', 'kitchen', 'interior', 'outdoor', 'other']);
const MATERIAL_CATEGORIES = Object.freeze(['tiles', 'plumbing', 'electrical', 'joinery', 'paint', 'hardware', 'other']);
const STAFF_ROLES = Object.freeze(['employee', 'manager', 'admin']);
const STAFF_CREATION_ROLES = Object.freeze(['employee', 'manager']);
const ACTIVITY_ENTITY_TYPES = Object.freeze(['quote', 'estimate', 'project', 'crm_client']);
const ACTIVITY_VISIBILITY = Object.freeze(['internal', 'client', 'public']);

const toPlainObject = (value) => (value && typeof value === 'object' ? value : {});
const toArray = (value) => (Array.isArray(value) ? value : []);
const toStringOr = (value, fallback = '') => (typeof value === 'string' ? value : fallback);
const toNullableString = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};
const toNormalizedToken = (value) => {
  const trimmed = toNullableString(value);
  return trimmed ? trimmed.toLowerCase() : null;
};
const toNullableEnum = (value, allowed) => {
  const normalized = toNormalizedToken(value);
  return normalized && allowed.includes(normalized) ? normalized : null;
};
const toEnumArray = (value, allowed, maxItems = 12) => {
  const normalized = [...new Set(
    toArray(value)
      .map((entry) => toNormalizedToken(entry))
      .filter(Boolean)
  )];
  return normalized.filter((entry) => allowed.includes(entry)).slice(0, maxItems);
};
const toBoolean = (value, fallback = false) => (typeof value === 'boolean' ? value : fallback);
const toNullableNumber = (value) => {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const parseContract = (schema, value, label = 'contract') => {
  if (!schema) return value;
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const error = new Error(`${label} contract mismatch`);
  error.cause = result.error;
  error.details = result.error.flatten();
  throw error;
};

const nullableStringSchema = z.string().nullable();
const nullableNumberSchema = z.number().nullable();
const nullableBooleanSchema = z.boolean().nullable();

const userSummarySchema = z.object({
  id: z.string(),
  name: nullableStringSchema,
  email: nullableStringSchema,
  role: nullableStringSchema,
  phone: nullableStringSchema,
  companyName: nullableStringSchema,
  crmLifecycleStatus: z.enum(CLIENT_LIFECYCLE_STATUSES),
  crmLifecycleUpdatedAt: nullableStringSchema,
  isActive: z.boolean(),
  createdAt: nullableStringSchema,
  updatedAt: nullableStringSchema
});

const messageAttachmentSchema = z.object({
  name: nullableStringSchema,
  url: nullableStringSchema,
  size: nullableNumberSchema,
  mimeType: nullableStringSchema
});

const normalizeUserSummary = (value) => {
  const plain = toPlainObject(value);
  return {
    id: toStringOr(plain.id),
    name: toNullableString(plain.name),
    email: toNullableString(plain.email),
    role: toNullableString(plain.role),
    phone: toNullableString(plain.phone),
    companyName: toNullableString(plain.companyName),
    crmLifecycleStatus: CLIENT_LIFECYCLE_STATUSES.includes(toNullableString(plain.crmLifecycleStatus) || '')
      ? plain.crmLifecycleStatus
      : CLIENT_LIFECYCLE_STATUSES[0],
    crmLifecycleUpdatedAt: toNullableString(plain.crmLifecycleUpdatedAt),
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

const estimateSummarySchema = z.object({
  id: z.string(),
  quoteId: nullableStringSchema,
  projectId: nullableStringSchema,
  title: nullableStringSchema,
  status: z.enum(ESTIMATE_STATUSES),
  decisionStatus: z.enum(ESTIMATE_DECISION_STATUSES),
  versionNumber: z.number(),
  isCurrentVersion: z.boolean(),
  notes: nullableStringSchema,
  clientMessage: nullableStringSchema,
  decisionNote: nullableStringSchema,
  subtotal: nullableNumberSchema,
  total: nullableNumberSchema,
  sentAt: nullableStringSchema,
  viewedAt: nullableStringSchema,
  respondedAt: nullableStringSchema,
  approvedAt: nullableStringSchema,
  declinedAt: nullableStringSchema,
  supersededById: nullableStringSchema,
  supersededAt: nullableStringSchema,
  createdAt: nullableStringSchema,
  updatedAt: nullableStringSchema,
  creator: userSummarySchema
});

const quoteEventSchema = z.object({
  id: z.string(),
  quoteId: nullableStringSchema,
  actorUserId: nullableStringSchema,
  eventType: nullableStringSchema,
  visibility: z.enum(['internal', 'client', 'public']),
  message: nullableStringSchema,
  createdAt: nullableStringSchema,
  updatedAt: nullableStringSchema,
  actor: userSummarySchema,
  data: z.record(z.string(), z.any()).nullable()
});

const quoteProposalSchema = z.object({
  version: z.literal(1),
  source: z.string(),
  projectScope: z.object({
    propertyType: z.enum(QUOTE_PROPOSAL_PROPERTY_TYPES).nullable(),
    roomsInvolved: z.array(z.enum(QUOTE_PROPOSAL_ROOM_TYPES)),
    occupancyStatus: z.enum(QUOTE_PROPOSAL_OCCUPANCY_STATUSES).nullable(),
    planningStage: z.enum(QUOTE_PROPOSAL_PLANNING_STAGES).nullable(),
    targetStartWindow: z.enum(QUOTE_PROPOSAL_START_WINDOWS).nullable(),
    siteAccess: z.enum(QUOTE_PROPOSAL_SITE_ACCESS).nullable()
  }),
  commercial: z.object({
    budgetRange: nullableStringSchema,
    finishLevel: z.enum(QUOTE_PROPOSAL_FINISH_LEVELS).nullable()
  }),
  logistics: z.object({
    location: nullableStringSchema,
    postcode: nullableStringSchema
  }),
  priorities: z.array(z.enum(QUOTE_PROPOSAL_PRIORITIES)),
  brief: z.object({
    summary: nullableStringSchema,
    mustHaves: nullableStringSchema,
    constraints: nullableStringSchema
  })
});

const quoteSummarySchema = z.object({
  id: z.string(),
  projectType: nullableStringSchema,
  location: nullableStringSchema,
  status: z.enum(QUOTE_STATUSES),
  workflowStatus: z.enum(QUOTE_WORKFLOW_STATUSES),
  priority: z.enum(QUOTE_PRIORITIES),
  description: nullableStringSchema,
  isGuest: z.boolean(),
  guestName: nullableStringSchema,
  guestEmail: nullableStringSchema,
  guestPhone: nullableStringSchema,
  contactMethod: nullableStringSchema,
  postcode: nullableStringSchema,
  budgetRange: nullableStringSchema,
  proposalDetails: quoteProposalSchema.nullable(),
  contactEmail: nullableStringSchema,
  contactPhone: nullableStringSchema,
  assignedManagerId: nullableStringSchema,
  clientId: nullableStringSchema,
  sourceChannel: nullableStringSchema,
  currentEstimateId: nullableStringSchema,
  convertedProjectId: nullableStringSchema,
  submittedAt: nullableStringSchema,
  assignedAt: nullableStringSchema,
  convertedAt: nullableStringSchema,
  nextActionAt: nullableStringSchema,
  responseDeadline: nullableStringSchema,
  closedAt: nullableStringSchema,
  lossReason: nullableStringSchema,
  attachmentCount: z.number(),
  attachments: z.array(messageAttachmentSchema),
  estimateCount: z.number(),
  canConvertToProject: z.boolean(),
  createdAt: nullableStringSchema,
  updatedAt: nullableStringSchema,
  client: userSummarySchema,
  assignedManager: userSummarySchema,
  latestEstimate: estimateSummarySchema.nullable()
});

const projectMediaSchema = z.object({
  id: z.string(),
  mediaType: nullableStringSchema,
  url: nullableStringSchema,
  filename: nullableStringSchema
});

const projectSummarySchema = z.object({
  id: z.string(),
  title: nullableStringSchema,
  location: nullableStringSchema,
  status: z.enum(PROJECT_STATUSES),
  projectStage: z.enum(PROJECT_STAGES),
  clientId: nullableStringSchema,
  assignedManagerId: nullableStringSchema,
  quoteId: nullableStringSchema,
  acceptedEstimateId: nullableStringSchema,
  description: nullableStringSchema,
  currentMilestone: nullableStringSchema,
  workPackage: nullableStringSchema,
  budgetEstimate: nullableStringSchema,
  startDate: nullableStringSchema,
  endDate: nullableStringSchema,
  dueDate: nullableStringSchema,
  showInGallery: z.boolean(),
  galleryOrder: z.number(),
  isActive: z.boolean(),
  imageCount: z.number(),
  documentCount: z.number(),
  createdAt: nullableStringSchema,
  updatedAt: nullableStringSchema,
  client: userSummarySchema,
  assignedManager: userSummarySchema,
  quote: quoteSummarySchema.nullable(),
  media: z.array(projectMediaSchema)
});

const threadSummarySchema = z.object({
  id: z.string(),
  name: nullableStringSchema,
  subject: nullableStringSchema,
  latestMessagePreview: nullableStringSchema,
  latestMessageAt: nullableStringSchema,
  latestMessageSenderId: nullableStringSchema,
  messageCount: z.number(),
  memberCount: z.number(),
  currentUserMembershipRole: nullableStringSchema,
  createdAt: nullableStringSchema,
  updatedAt: nullableStringSchema,
  latestMessageSender: userSummarySchema,
  project: projectSummarySchema.nullable(),
  quote: quoteSummarySchema.nullable()
});

const directThreadSummarySchema = z.object({
  id: z.string(),
  subject: nullableStringSchema,
  participantAId: nullableStringSchema,
  participantBId: nullableStringSchema,
  participantCount: z.number(),
  latestMessagePreview: nullableStringSchema,
  latestMessageAt: nullableStringSchema,
  latestMessageSenderId: nullableStringSchema,
  unreadCount: z.number(),
  createdAt: nullableStringSchema,
  updatedAt: nullableStringSchema,
  counterparty: userSummarySchema,
  participantA: userSummarySchema,
  participantB: userSummarySchema
});

const notificationSchema = z.object({
  id: z.string(),
  type: nullableStringSchema,
  title: nullableStringSchema,
  body: nullableStringSchema,
  isRead: z.boolean(),
  createdAt: nullableStringSchema,
  updatedAt: nullableStringSchema
});

const crmClientSchema = userSummarySchema.extend({
  role: z.literal('client')
});

const crmStaffMemberSchema = userSummarySchema.extend({
  role: z.enum(STAFF_ROLES)
});

const activityEventSchema = z.object({
  id: z.string(),
  actorUserId: nullableStringSchema,
  entityType: z.enum(ACTIVITY_ENTITY_TYPES),
  entityId: nullableStringSchema,
  visibility: z.enum(ACTIVITY_VISIBILITY),
  eventType: nullableStringSchema,
  title: nullableStringSchema,
  message: nullableStringSchema,
  clientId: nullableStringSchema,
  projectId: nullableStringSchema,
  quoteId: nullableStringSchema,
  createdAt: nullableStringSchema,
  updatedAt: nullableStringSchema,
  actor: userSummarySchema,
  data: z.record(z.string(), z.any()).nullable()
});

const inventoryServiceSchema = z.object({
  id: z.string(),
  slug: nullableStringSchema,
  title: nullableStringSchema,
  shortDescription: nullableStringSchema,
  fullDescription: nullableStringSchema,
  category: z.enum(SERVICE_CATEGORIES),
  basePriceFrom: nullableNumberSchema,
  heroImageUrl: nullableStringSchema,
  isFeatured: z.boolean(),
  showOnWebsite: z.boolean(),
  displayOrder: z.number(),
  isActive: z.boolean(),
  createdAt: nullableStringSchema,
  updatedAt: nullableStringSchema
});

const inventoryMaterialSchema = z.object({
  id: z.string(),
  sku: nullableStringSchema,
  name: nullableStringSchema,
  category: z.enum(MATERIAL_CATEGORIES),
  unit: z.string(),
  stockQty: z.number(),
  minStockQty: z.number(),
  unitCost: nullableNumberSchema,
  supplier: nullableStringSchema,
  notes: nullableStringSchema,
  isActive: z.boolean(),
  createdAt: nullableStringSchema,
  updatedAt: nullableStringSchema
});

const overviewMetricsSchema = z.object({
  projectCount: z.number(),
  activeProjectCount: z.number(),
  quoteCount: z.number(),
  openQuoteCount: z.number(),
  projectThreadCount: z.number(),
  directThreadCount: z.number(),
  unreadNotificationCount: z.number(),
  clientCount: z.number(),
  staffCount: z.number(),
  lowStockMaterialCount: z.number(),
  publicServiceCount: z.number()
});

const overviewCrmSchema = z.object({
  clientCount: z.number(),
  staffCount: z.number()
});

const overviewSummarySchema = z.object({
  metrics: overviewMetricsSchema,
  projects: z.array(projectSummarySchema),
  quotes: z.array(quoteSummarySchema),
  threads: z.array(threadSummarySchema),
  directThreads: z.array(directThreadSummarySchema),
  notifications: z.array(notificationSchema),
  lowStockMaterials: z.array(inventoryMaterialSchema),
  publicServices: z.array(inventoryServiceSchema),
  crm: overviewCrmSchema
});

const threadMessageSchema = z.object({
  id: z.string(),
  threadId: nullableStringSchema,
  senderId: nullableStringSchema,
  recipientId: nullableStringSchema,
  body: nullableStringSchema,
  createdAt: nullableStringSchema,
  updatedAt: nullableStringSchema,
  isRead: z.boolean(),
  sender: userSummarySchema,
  attachments: z.array(messageAttachmentSchema)
});

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

const normalizeEstimateSummary = (value) => {
  const plain = toPlainObject(value);
  return {
    id: toStringOr(plain.id),
    quoteId: toNullableString(plain.quoteId),
    projectId: toNullableString(plain.projectId),
    title: toNullableString(plain.title),
    status: normalizeEstimateStatusValue(plain.status),
    decisionStatus: normalizeEstimateDecisionStatusValue(plain.decisionStatus),
    versionNumber: toNullableNumber(plain.versionNumber) ?? 1,
    isCurrentVersion: toBoolean(plain.isCurrentVersion, false),
    notes: toNullableString(plain.notes),
    clientMessage: toNullableString(plain.clientMessage),
    decisionNote: toNullableString(plain.decisionNote),
    subtotal: toNullableNumber(plain.subtotal),
    total: toNullableNumber(plain.total),
    sentAt: toNullableString(plain.sentAt),
    viewedAt: toNullableString(plain.viewedAt),
    respondedAt: toNullableString(plain.respondedAt),
    approvedAt: toNullableString(plain.approvedAt),
    declinedAt: toNullableString(plain.declinedAt),
    supersededById: toNullableString(plain.supersededById),
    supersededAt: toNullableString(plain.supersededAt),
    createdAt: toNullableString(plain.createdAt),
    updatedAt: toNullableString(plain.updatedAt),
    creator: normalizeUserSummary(plain.creator)
  };
};

const normalizeQuoteEvent = (value) => {
  const plain = toPlainObject(value);
  const data = plain.data && typeof plain.data === 'object' ? plain.data : null;
  return {
    id: toStringOr(plain.id),
    quoteId: toNullableString(plain.quoteId),
    actorUserId: toNullableString(plain.actorUserId),
    eventType: toNullableString(plain.eventType),
    visibility: toNullableString(plain.visibility) || 'internal',
    message: toNullableString(plain.message),
    createdAt: toNullableString(plain.createdAt),
    updatedAt: toNullableString(plain.updatedAt),
    actor: normalizeUserSummary(plain.actor),
    data
  };
};

const normalizeQuoteProposalDetails = (value) => {
  const plain = toPlainObject(value);
  const projectScope = toPlainObject(plain.projectScope);
  const commercial = toPlainObject(plain.commercial);
  const logistics = toPlainObject(plain.logistics);
  const brief = toPlainObject(plain.brief);

  return {
    version: 1,
    source: toNullableString(plain.source) || 'public_quote_form_v2',
    projectScope: {
      propertyType: toNullableEnum(projectScope.propertyType, QUOTE_PROPOSAL_PROPERTY_TYPES),
      roomsInvolved: toEnumArray(projectScope.roomsInvolved, QUOTE_PROPOSAL_ROOM_TYPES),
      occupancyStatus: toNullableEnum(projectScope.occupancyStatus, QUOTE_PROPOSAL_OCCUPANCY_STATUSES),
      planningStage: toNullableEnum(projectScope.planningStage, QUOTE_PROPOSAL_PLANNING_STAGES),
      targetStartWindow: toNullableEnum(projectScope.targetStartWindow, QUOTE_PROPOSAL_START_WINDOWS),
      siteAccess: toNullableEnum(projectScope.siteAccess, QUOTE_PROPOSAL_SITE_ACCESS)
    },
    commercial: {
      budgetRange: toNullableString(commercial.budgetRange),
      finishLevel: toNullableEnum(commercial.finishLevel, QUOTE_PROPOSAL_FINISH_LEVELS)
    },
    logistics: {
      location: toNullableString(logistics.location),
      postcode: toNullableString(logistics.postcode)
    },
    priorities: toEnumArray(plain.priorities, QUOTE_PROPOSAL_PRIORITIES),
    brief: {
      summary: toNullableString(brief.summary),
      mustHaves: toNullableString(brief.mustHaves),
      constraints: toNullableString(brief.constraints)
    }
  };
};

const normalizeProjectSummary = (value) => {
  const plain = toPlainObject(value);
  return {
    id: toStringOr(plain.id),
    title: toNullableString(plain.title),
    location: toNullableString(plain.location),
    status: toNullableString(plain.status) || PROJECT_STATUSES[0],
    projectStage: PROJECT_STAGES.includes(toNullableString(plain.projectStage) || '') ? plain.projectStage : PROJECT_STAGES[0],
    clientId: toNullableString(plain.clientId),
    assignedManagerId: toNullableString(plain.assignedManagerId),
    quoteId: toNullableString(plain.quoteId),
    acceptedEstimateId: toNullableString(plain.acceptedEstimateId),
    description: toNullableString(plain.description),
    currentMilestone: toNullableString(plain.currentMilestone),
    workPackage: toNullableString(plain.workPackage),
    budgetEstimate: toNullableString(plain.budgetEstimate),
    startDate: toNullableString(plain.startDate),
    endDate: toNullableString(plain.endDate),
    dueDate: toNullableString(plain.dueDate),
    showInGallery: toBoolean(plain.showInGallery, false),
    galleryOrder: toNullableNumber(plain.galleryOrder) ?? 0,
    isActive: toBoolean(plain.isActive, true),
    imageCount: toNullableNumber(plain.imageCount) ?? 0,
    documentCount: toNullableNumber(plain.documentCount) ?? 0,
    createdAt: toNullableString(plain.createdAt),
    updatedAt: toNullableString(plain.updatedAt),
    client: normalizeUserSummary(plain.client),
    assignedManager: normalizeUserSummary(plain.assignedManager),
    quote: normalizeEntity(plain.quote, normalizeQuoteSummary),
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
  const attachments = toArray(plain.attachments).map(normalizeMessageAttachment);
  return {
    id: toStringOr(plain.id),
    projectType: toNullableString(plain.projectType),
    location: toNullableString(plain.location),
    status: toNullableString(plain.status) || QUOTE_STATUSES[0],
    workflowStatus: normalizeWorkflowStatusValue(plain.workflowStatus || plain.status),
    priority: toNullableString(plain.priority) || QUOTE_PRIORITIES[0],
    description: toNullableString(plain.description),
    isGuest: toBoolean(plain.isGuest, false),
    guestName: toNullableString(plain.guestName),
    guestEmail: toNullableString(plain.guestEmail),
    guestPhone: toNullableString(plain.guestPhone),
    contactMethod: toNullableString(plain.contactMethod),
    postcode: toNullableString(plain.postcode),
    budgetRange: toNullableString(plain.budgetRange),
    proposalDetails: normalizeEntity(plain.proposalDetails, normalizeQuoteProposalDetails),
    contactEmail: toNullableString(plain.contactEmail),
    contactPhone: toNullableString(plain.contactPhone),
    assignedManagerId: toNullableString(plain.assignedManagerId),
    clientId: toNullableString(plain.clientId),
    sourceChannel: toNullableString(plain.sourceChannel),
    currentEstimateId: toNullableString(plain.currentEstimateId),
    convertedProjectId: toNullableString(plain.convertedProjectId),
    submittedAt: toNullableString(plain.submittedAt),
    assignedAt: toNullableString(plain.assignedAt),
    convertedAt: toNullableString(plain.convertedAt),
    nextActionAt: toNullableString(plain.nextActionAt),
    responseDeadline: toNullableString(plain.responseDeadline),
    closedAt: toNullableString(plain.closedAt),
    lossReason: toNullableString(plain.lossReason),
    attachmentCount: toNullableNumber(plain.attachmentCount) ?? attachments.length,
    attachments,
    estimateCount: toNullableNumber(plain.estimateCount) ?? (Array.isArray(plain.estimates) ? plain.estimates.length : 0),
    canConvertToProject: toBoolean(plain.canConvertToProject, false),
    createdAt: toNullableString(plain.createdAt),
    updatedAt: toNullableString(plain.updatedAt),
    client: normalizeUserSummary(plain.client),
    assignedManager: normalizeUserSummary(plain.assignedManager),
    latestEstimate: normalizeEntity(
      plain.latestEstimate || (Array.isArray(plain.estimates) ? plain.estimates.find((estimate) => estimate?.isCurrentVersion) || plain.estimates[0] : null),
      normalizeEstimateSummary
    )
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
    project: normalizeEntity(plain.project, normalizeProjectSummary),
    quote: normalizeEntity(plain.quote, normalizeQuoteSummary)
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

const normalizeActivityEvent = (value) => {
  const plain = toPlainObject(value);
  return {
    id: toStringOr(plain.id),
    actorUserId: toNullableString(plain.actorUserId),
    entityType: ACTIVITY_ENTITY_TYPES.includes(toNullableString(plain.entityType) || '') ? plain.entityType : ACTIVITY_ENTITY_TYPES[0],
    entityId: toNullableString(plain.entityId),
    visibility: ACTIVITY_VISIBILITY.includes(toNullableString(plain.visibility) || '') ? plain.visibility : ACTIVITY_VISIBILITY[0],
    eventType: toNullableString(plain.eventType),
    title: toNullableString(plain.title),
    message: toNullableString(plain.message),
    clientId: toNullableString(plain.clientId),
    projectId: toNullableString(plain.projectId),
    quoteId: toNullableString(plain.quoteId),
    createdAt: toNullableString(plain.createdAt),
    updatedAt: toNullableString(plain.updatedAt),
    actor: normalizeUserSummary(plain.actor),
    data: plain.data && typeof plain.data === 'object' ? plain.data : null
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

const normalizeOverviewSummary = (value) => {
  const plain = toPlainObject(value);
  const metrics = toPlainObject(plain.metrics);
  const crm = toPlainObject(plain.crm);

  return {
    metrics: {
      projectCount: toNullableNumber(metrics.projectCount) ?? 0,
      activeProjectCount: toNullableNumber(metrics.activeProjectCount) ?? 0,
      quoteCount: toNullableNumber(metrics.quoteCount) ?? 0,
      openQuoteCount: toNullableNumber(metrics.openQuoteCount) ?? 0,
      projectThreadCount: toNullableNumber(metrics.projectThreadCount) ?? 0,
      directThreadCount: toNullableNumber(metrics.directThreadCount) ?? 0,
      unreadNotificationCount: toNullableNumber(metrics.unreadNotificationCount) ?? 0,
      clientCount: toNullableNumber(metrics.clientCount) ?? 0,
      staffCount: toNullableNumber(metrics.staffCount) ?? 0,
      lowStockMaterialCount: toNullableNumber(metrics.lowStockMaterialCount) ?? 0,
      publicServiceCount: toNullableNumber(metrics.publicServiceCount) ?? 0
    },
    projects: toArray(plain.projects).map(normalizeProjectSummary),
    quotes: toArray(plain.quotes).map(normalizeQuoteSummary),
    threads: toArray(plain.threads).map(normalizeThreadSummary),
    directThreads: toArray(plain.directThreads).map(normalizeDirectThreadSummary),
    notifications: toArray(plain.notifications).map(normalizeNotification),
    lowStockMaterials: toArray(plain.lowStockMaterials).map(normalizeInventoryMaterial),
    publicServices: toArray(plain.publicServices).map(normalizeInventoryService),
    crm: {
      clientCount: toNullableNumber(crm.clientCount) ?? 0,
      staffCount: toNullableNumber(crm.staffCount) ?? 0
    }
  };
};

const normalizeCollection = (value, normalizer) => toArray(value).map((item) => normalizer(item));
const normalizeEntity = (value, normalizer) => {
  if (!value || typeof value !== 'object') return null;
  return normalizer(value);
};
const normalizeListResponse = (payload, key, normalizer, schema) =>
  normalizeCollection(payload?.data?.[key], (item) => parseContract(schema, normalizer(item), `${key}[]`));
const normalizeItemResponse = (payload, key, normalizer, schema) =>
  normalizeEntity(payload?.data?.[key], (item) => parseContract(schema, normalizer(item), key));

module.exports = {
  PROJECT_STATUSES,
  PROJECT_STAGES,
  QUOTE_STATUSES,
  QUOTE_WORKFLOW_STATUSES,
  QUOTE_PRIORITIES,
  QUOTE_PROJECT_TYPES,
  QUOTE_CONTACT_METHODS,
  QUOTE_PROPOSAL_PROPERTY_TYPES,
  QUOTE_PROPOSAL_ROOM_TYPES,
  QUOTE_PROPOSAL_OCCUPANCY_STATUSES,
  QUOTE_PROPOSAL_PLANNING_STAGES,
  QUOTE_PROPOSAL_START_WINDOWS,
  QUOTE_PROPOSAL_FINISH_LEVELS,
  QUOTE_PROPOSAL_SITE_ACCESS,
  QUOTE_PROPOSAL_PRIORITIES,
  ESTIMATE_DECISION_STATUSES,
  ESTIMATE_STATUSES,
  CLIENT_LIFECYCLE_STATUSES,
  SERVICE_CATEGORIES,
  MATERIAL_CATEGORIES,
  STAFF_ROLES,
  STAFF_CREATION_ROLES,
  ACTIVITY_ENTITY_TYPES,
  ACTIVITY_VISIBILITY,
  userSummarySchema,
  messageAttachmentSchema,
  threadMessageSchema,
  estimateSummarySchema,
  quoteEventSchema,
  quoteProposalSchema,
  projectSummarySchema,
  quoteSummarySchema,
  threadSummarySchema,
  directThreadSummarySchema,
  notificationSchema,
  crmClientSchema,
  crmStaffMemberSchema,
  activityEventSchema,
  inventoryServiceSchema,
  inventoryMaterialSchema,
  overviewMetricsSchema,
  overviewCrmSchema,
  overviewSummarySchema,
  normalizeUserSummary,
  normalizeMessageAttachment,
  normalizeThreadMessage,
  normalizeEstimateStatusValue,
  normalizeEstimateSummary,
  normalizeQuoteEvent,
  normalizeQuoteProposalDetails,
  normalizeProjectSummary,
  normalizeQuoteSummary,
  normalizeThreadSummary,
  normalizeDirectThreadSummary,
  normalizeNotification,
  normalizeCrmClient,
  normalizeCrmStaffMember,
  normalizeActivityEvent,
  normalizeInventoryService,
  normalizeInventoryMaterial,
  normalizeOverviewSummary,
  normalizeListResponse,
  normalizeItemResponse
};

module.exports.default = module.exports;
