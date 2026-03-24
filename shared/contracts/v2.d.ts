import type { z } from 'zod';

export type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'on_hold';
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
export type EstimateDecisionStatus = 'pending' | 'viewed' | 'revision_requested' | 'accepted' | 'declined';
export type ServiceCategory = 'bathroom' | 'kitchen' | 'interior' | 'outdoor' | 'other';
export type MaterialCategory = 'tiles' | 'plumbing' | 'electrical' | 'joinery' | 'paint' | 'hardware' | 'other';
export type StaffRole = 'employee' | 'manager' | 'admin';
export type StaffCreationRole = 'employee' | 'manager';

export interface UserSummary {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  phone: string | null;
  companyName: string | null;
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
  status: 'draft' | 'sent' | 'approved' | 'archived';
  decisionStatus: EstimateDecisionStatus;
  versionNumber: number;
  isCurrentVersion: boolean;
  notes: string | null;
  clientMessage: string | null;
  subtotal: number | null;
  total: number | null;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  approvedAt: string | null;
  declinedAt: string | null;
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
  clientId: string | null;
  assignedManagerId: string | null;
  quoteId: string | null;
  acceptedEstimateId: string | null;
  description: string | null;
  budgetEstimate: string | null;
  startDate: string | null;
  endDate: string | null;
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

export const PROJECT_STATUSES: readonly ProjectStatus[];
export const QUOTE_STATUSES: readonly QuoteStatus[];
export const QUOTE_WORKFLOW_STATUSES: readonly QuoteWorkflowStatus[];
export const QUOTE_PRIORITIES: readonly QuotePriority[];
export const QUOTE_PROJECT_TYPES: readonly QuoteProjectType[];
export const QUOTE_CONTACT_METHODS: readonly QuoteContactMethod[];
export const ESTIMATE_DECISION_STATUSES: readonly EstimateDecisionStatus[];
export const SERVICE_CATEGORIES: readonly ServiceCategory[];
export const MATERIAL_CATEGORIES: readonly MaterialCategory[];
export const STAFF_ROLES: readonly StaffRole[];
export const STAFF_CREATION_ROLES: readonly StaffCreationRole[];

export const userSummarySchema: z.ZodType<UserSummary>;
export const messageAttachmentSchema: z.ZodType<MessageAttachment>;
export const threadMessageSchema: z.ZodType<ThreadMessage>;
export const estimateSummarySchema: z.ZodType<EstimateSummary>;
export const quoteEventSchema: z.ZodType<QuoteEventSummary>;
export const projectSummarySchema: z.ZodType<ProjectSummary>;
export const quoteSummarySchema: z.ZodType<QuoteSummary>;
export const threadSummarySchema: z.ZodType<ThreadSummary>;
export const directThreadSummarySchema: z.ZodType<DirectThreadSummary>;
export const notificationSchema: z.ZodType<NotificationSummary>;
export const crmClientSchema: z.ZodType<CrmClient>;
export const crmStaffMemberSchema: z.ZodType<CrmStaffMember>;
export const inventoryServiceSchema: z.ZodType<InventoryService>;
export const inventoryMaterialSchema: z.ZodType<InventoryMaterial>;

export function normalizeUserSummary(value: unknown): UserSummary;
export function normalizeThreadMessage(value: unknown): ThreadMessage;
export function normalizeEstimateSummary(value: unknown): EstimateSummary;
export function normalizeQuoteEvent(value: unknown): QuoteEventSummary;
export function normalizeProjectSummary(value: unknown): ProjectSummary;
export function normalizeQuoteSummary(value: unknown): QuoteSummary;
export function normalizeThreadSummary(value: unknown): ThreadSummary;
export function normalizeDirectThreadSummary(value: unknown): DirectThreadSummary;
export function normalizeNotification(value: unknown): NotificationSummary;
export function normalizeCrmClient(value: unknown): CrmClient;
export function normalizeCrmStaffMember(value: unknown): CrmStaffMember;
export function normalizeInventoryService(value: unknown): InventoryService;
export function normalizeInventoryMaterial(value: unknown): InventoryMaterial;
export function normalizeListResponse<T>(payload: unknown, key: string, normalizer: (value: unknown) => T, schema?: z.ZodType<T>): T[];
export function normalizeItemResponse<T>(payload: unknown, key: string, normalizer: (value: unknown) => T, schema?: z.ZodType<T>): T | null;
