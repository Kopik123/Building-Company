import type { z } from 'zod';

export type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'on_hold';
export type ProjectStage = 'briefing' | 'scope_locked' | 'procurement' | 'site_prep' | 'installation' | 'finishing' | 'handover' | 'aftercare';
export type ClientLifecycleStatus = 'lead' | 'quoted' | 'approved' | 'active_project' | 'completed' | 'archived';
export type QuoteStatus = 'pending' | 'in_progress' | 'responded' | 'closed';
export type QuoteWorkflowStatus =
  | 'submitted'
  | 'triaged'
  | 'assigned'
  | 'awaiting_client_info'
  | 'estimate_in_progress'
  | 'estimate_sent'
  | 'client_review'
  | 'approved_ready_for_project'
  | 'converted_to_project'
  | 'closed_lost';
export type QuotePriority = 'low' | 'medium' | 'high';
export type QuoteProjectType = 'bathroom' | 'kitchen' | 'interior' | 'tiling' | 'extension' | 'joinery' | 'rendering' | 'decorating' | 'other';
export type QuoteContactMethod = 'email' | 'phone' | 'both';
export type QuoteProposalPropertyType = 'flat' | 'terraced' | 'semi_detached' | 'detached' | 'commercial' | 'other';
export type QuoteProposalRoomType = 'kitchen' | 'bathroom' | 'living_area' | 'bedroom' | 'utility' | 'hall_stairs' | 'extension_area' | 'outdoor_connection' | 'whole_home' | 'other';
export type QuoteProposalOccupancyStatus = 'living_in_home' | 'partially_occupied' | 'empty_property' | 'tenanted' | 'commercial_live' | 'other';
export type QuoteProposalPlanningStage = 'idea' | 'getting_prices' | 'ready_to_start' | 'already_underway' | 'urgent_recovery';
export type QuoteProposalStartWindow = 'asap' | 'within_1_month' | 'within_3_months' | 'within_6_months' | 'planning_ahead';
export type QuoteProposalFinishLevel = 'essential' | 'elevated' | 'premium' | 'bespoke';
export type QuoteProposalSiteAccess = 'easy_ground_floor' | 'stairs_only' | 'tight_access' | 'restricted_parking' | 'unknown';
export type QuoteProposalPriority = 'finish_quality' | 'budget_control' | 'storage' | 'speed' | 'family_living' | 'low_maintenance' | 'future_sale' | 'energy_efficiency';
export type EstimateDecisionStatus = 'pending' | 'viewed' | 'revision_requested' | 'accepted' | 'declined';
export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'archived' | 'superseded';
export type ServiceCategory = 'bathroom' | 'kitchen' | 'interior' | 'outdoor' | 'other';
export type MaterialCategory = 'tiles' | 'plumbing' | 'electrical' | 'joinery' | 'paint' | 'hardware' | 'other';
export type StaffRole = 'employee' | 'manager' | 'admin';
export type StaffCreationRole = 'employee' | 'manager';
export type ActivityEntityType = 'quote' | 'estimate' | 'project' | 'crm_client';
export type ActivityVisibility = 'internal' | 'client' | 'public';

export interface UserSummary {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  phone: string | null;
  companyName: string | null;
  crmLifecycleStatus: ClientLifecycleStatus;
  crmLifecycleUpdatedAt: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MessageAttachment {
  name: string | null;
  url: string | null;
  size: number | null;
  mimeType: string | null;
}

export interface ThreadMessage {
  id: string;
  threadId: string | null;
  senderId: string | null;
  recipientId: string | null;
  body: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isRead: boolean;
  sender: UserSummary;
  attachments: MessageAttachment[];
}

export interface QuoteProposalDetails {
  version: 1;
  source: string;
  projectScope: {
    propertyType: QuoteProposalPropertyType | null;
    roomsInvolved: QuoteProposalRoomType[];
    occupancyStatus: QuoteProposalOccupancyStatus | null;
    planningStage: QuoteProposalPlanningStage | null;
    targetStartWindow: QuoteProposalStartWindow | null;
    siteAccess: QuoteProposalSiteAccess | null;
  };
  commercial: {
    budgetRange: string | null;
    finishLevel: QuoteProposalFinishLevel | null;
  };
  logistics: {
    location: string | null;
    postcode: string | null;
  };
  priorities: QuoteProposalPriority[];
  brief: {
    summary: string | null;
    mustHaves: string | null;
    constraints: string | null;
  };
}

export interface QuoteSummary {
  id: string;
  projectType: string | null;
  location: string | null;
  status: QuoteStatus;
  workflowStatus: QuoteWorkflowStatus;
  priority: QuotePriority;
  description: string | null;
  isGuest: boolean;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  contactMethod: string | null;
  postcode: string | null;
  budgetRange: string | null;
  proposalDetails: QuoteProposalDetails | null;
  contactEmail: string | null;
  contactPhone: string | null;
  assignedManagerId: string | null;
  clientId: string | null;
  sourceChannel: string | null;
  currentEstimateId: string | null;
  convertedProjectId: string | null;
  submittedAt: string | null;
  assignedAt: string | null;
  convertedAt: string | null;
  nextActionAt: string | null;
  responseDeadline: string | null;
  closedAt: string | null;
  lossReason: string | null;
  attachmentCount: number;
  attachments: MessageAttachment[];
  estimateCount: number;
  canConvertToProject: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  client: UserSummary;
  assignedManager: UserSummary;
  latestEstimate: EstimateSummary | null;
}

export interface EstimateSummary {
  id: string;
  quoteId: string | null;
  projectId: string | null;
  title: string | null;
  status: EstimateStatus;
  decisionStatus: EstimateDecisionStatus;
  versionNumber: number;
  isCurrentVersion: boolean;
  notes: string | null;
  clientMessage: string | null;
  decisionNote: string | null;
  subtotal: number | null;
  total: number | null;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  approvedAt: string | null;
  declinedAt: string | null;
  supersededById: string | null;
  supersededAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  creator: UserSummary;
}

export interface QuoteEventSummary {
  id: string;
  quoteId: string | null;
  actorUserId: string | null;
  eventType: string | null;
  visibility: 'internal' | 'client' | 'public';
  message: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  actor: UserSummary;
  data: Record<string, unknown> | null;
}

export interface ProjectSummary {
  id: string;
  title: string | null;
  location: string | null;
  status: ProjectStatus;
  projectStage: ProjectStage;
  clientId: string | null;
  assignedManagerId: string | null;
  quoteId: string | null;
  acceptedEstimateId: string | null;
  description: string | null;
  currentMilestone: string | null;
  workPackage: string | null;
  budgetEstimate: string | null;
  startDate: string | null;
  endDate: string | null;
  dueDate: string | null;
  showInGallery: boolean;
  galleryOrder: number;
  isActive: boolean;
  imageCount: number;
  documentCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  client: UserSummary;
  assignedManager: UserSummary;
  quote: QuoteSummary | null;
  media: Array<{ id: string; mediaType: string | null; url: string | null; filename: string | null }>;
}

export interface ThreadSummary {
  id: string;
  name: string | null;
  subject: string | null;
  latestMessagePreview: string | null;
  latestMessageAt: string | null;
  latestMessageSenderId: string | null;
  messageCount: number;
  memberCount: number;
  currentUserMembershipRole: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  latestMessageSender: UserSummary;
  project: ProjectSummary | null;
  quote: QuoteSummary | null;
}

export interface DirectThreadSummary {
  id: string;
  subject: string | null;
  participantAId: string | null;
  participantBId: string | null;
  participantCount: number;
  latestMessagePreview: string | null;
  latestMessageAt: string | null;
  latestMessageSenderId: string | null;
  unreadCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  counterparty: UserSummary;
  participantA: UserSummary;
  participantB: UserSummary;
}

export interface NotificationSummary {
  id: string;
  type: string | null;
  title: string | null;
  body: string | null;
  isRead: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CrmClient extends UserSummary {
  role: 'client';
}

export interface CrmStaffMember extends UserSummary {
  role: StaffRole;
}

export interface ActivityEventSummary {
  id: string;
  actorUserId: string | null;
  entityType: ActivityEntityType;
  entityId: string | null;
  visibility: ActivityVisibility;
  eventType: string | null;
  title: string | null;
  message: string | null;
  clientId: string | null;
  projectId: string | null;
  quoteId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  actor: UserSummary;
  data: Record<string, unknown> | null;
}

export interface InventoryService {
  id: string;
  slug: string | null;
  title: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  category: ServiceCategory;
  basePriceFrom: number | null;
  heroImageUrl: string | null;
  isFeatured: boolean;
  showOnWebsite: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface InventoryMaterial {
  id: string;
  sku: string | null;
  name: string | null;
  category: MaterialCategory;
  unit: string;
  stockQty: number;
  minStockQty: number;
  unitCost: number | null;
  supplier: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface OverviewMetricsSummary {
  projectCount: number;
  activeProjectCount: number;
  quoteCount: number;
  openQuoteCount: number;
  projectThreadCount: number;
  directThreadCount: number;
  unreadNotificationCount: number;
  clientCount: number;
  staffCount: number;
  lowStockMaterialCount: number;
  deferredCleanupJobCount: number;
  publicServiceCount: number;
}

export interface OverviewCrmSummary {
  clientCount: number;
  staffCount: number;
}

export interface OverviewSummary {
  metrics: OverviewMetricsSummary;
  projects: ProjectSummary[];
  quotes: QuoteSummary[];
  threads: ThreadSummary[];
  directThreads: DirectThreadSummary[];
  notifications: NotificationSummary[];
  lowStockMaterials: InventoryMaterial[];
  publicServices: InventoryService[];
  crm: OverviewCrmSummary;
}

export const PROJECT_STATUSES: readonly ProjectStatus[];
export const PROJECT_STAGES: readonly ProjectStage[];
export const CLIENT_LIFECYCLE_STATUSES: readonly ClientLifecycleStatus[];
export const QUOTE_STATUSES: readonly QuoteStatus[];
export const QUOTE_WORKFLOW_STATUSES: readonly QuoteWorkflowStatus[];
export const QUOTE_PRIORITIES: readonly QuotePriority[];
export const QUOTE_PROJECT_TYPES: readonly QuoteProjectType[];
export const QUOTE_CONTACT_METHODS: readonly QuoteContactMethod[];
export const QUOTE_PROPOSAL_PROPERTY_TYPES: readonly QuoteProposalPropertyType[];
export const QUOTE_PROPOSAL_ROOM_TYPES: readonly QuoteProposalRoomType[];
export const QUOTE_PROPOSAL_OCCUPANCY_STATUSES: readonly QuoteProposalOccupancyStatus[];
export const QUOTE_PROPOSAL_PLANNING_STAGES: readonly QuoteProposalPlanningStage[];
export const QUOTE_PROPOSAL_START_WINDOWS: readonly QuoteProposalStartWindow[];
export const QUOTE_PROPOSAL_FINISH_LEVELS: readonly QuoteProposalFinishLevel[];
export const QUOTE_PROPOSAL_SITE_ACCESS: readonly QuoteProposalSiteAccess[];
export const QUOTE_PROPOSAL_PRIORITIES: readonly QuoteProposalPriority[];
export const ESTIMATE_DECISION_STATUSES: readonly EstimateDecisionStatus[];
export const ESTIMATE_STATUSES: readonly EstimateStatus[];
export const SERVICE_CATEGORIES: readonly ServiceCategory[];
export const MATERIAL_CATEGORIES: readonly MaterialCategory[];
export const STAFF_ROLES: readonly StaffRole[];
export const STAFF_CREATION_ROLES: readonly StaffCreationRole[];
export const ACTIVITY_ENTITY_TYPES: readonly ActivityEntityType[];
export const ACTIVITY_VISIBILITY: readonly ActivityVisibility[];

export const userSummarySchema: z.ZodType<UserSummary>;
export const messageAttachmentSchema: z.ZodType<MessageAttachment>;
export const threadMessageSchema: z.ZodType<ThreadMessage>;
export const estimateSummarySchema: z.ZodType<EstimateSummary>;
export const quoteEventSchema: z.ZodType<QuoteEventSummary>;
export const quoteProposalSchema: z.ZodType<QuoteProposalDetails>;
export const projectSummarySchema: z.ZodType<ProjectSummary>;
export const quoteSummarySchema: z.ZodType<QuoteSummary>;
export const threadSummarySchema: z.ZodType<ThreadSummary>;
export const directThreadSummarySchema: z.ZodType<DirectThreadSummary>;
export const notificationSchema: z.ZodType<NotificationSummary>;
export const crmClientSchema: z.ZodType<CrmClient>;
export const crmStaffMemberSchema: z.ZodType<CrmStaffMember>;
export const activityEventSchema: z.ZodType<ActivityEventSummary>;
export const inventoryServiceSchema: z.ZodType<InventoryService>;
export const inventoryMaterialSchema: z.ZodType<InventoryMaterial>;
export const overviewMetricsSchema: z.ZodType<OverviewMetricsSummary>;
export const overviewCrmSchema: z.ZodType<OverviewCrmSummary>;
export const overviewSummarySchema: z.ZodType<OverviewSummary>;

export function normalizeUserSummary(value: unknown): UserSummary;
export function normalizeThreadMessage(value: unknown): ThreadMessage;
export function normalizeEstimateStatusValue(value: unknown, fallback?: EstimateStatus): EstimateStatus;
export function normalizeEstimateSummary(value: unknown): EstimateSummary;
export function normalizeQuoteEvent(value: unknown): QuoteEventSummary;
export function normalizeQuoteProposalDetails(value: unknown): QuoteProposalDetails;
export function normalizeProjectSummary(value: unknown): ProjectSummary;
export function normalizeQuoteSummary(value: unknown): QuoteSummary;
export function normalizeThreadSummary(value: unknown): ThreadSummary;
export function normalizeDirectThreadSummary(value: unknown): DirectThreadSummary;
export function normalizeNotification(value: unknown): NotificationSummary;
export function normalizeCrmClient(value: unknown): CrmClient;
export function normalizeCrmStaffMember(value: unknown): CrmStaffMember;
export function normalizeActivityEvent(value: unknown): ActivityEventSummary;
export function normalizeInventoryService(value: unknown): InventoryService;
export function normalizeInventoryMaterial(value: unknown): InventoryMaterial;
export function normalizeOverviewSummary(value: unknown): OverviewSummary;
export function normalizeListResponse<T>(payload: unknown, key: string, normalizer: (value: unknown) => T, schema?: z.ZodType<T>): T[];
export function normalizeItemResponse<T>(payload: unknown, key: string, normalizer: (value: unknown) => T, schema?: z.ZodType<T>): T | null;
