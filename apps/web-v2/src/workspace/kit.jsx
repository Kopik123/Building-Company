import React from 'react';
import { Link } from 'react-router-dom';
import contractKit from '../../../../shared/contracts/v2.js';


const {
  CLIENT_LIFECYCLE_STATUSES,
  ESTIMATE_DECISION_STATUSES,
  MATERIAL_CATEGORIES,
  QUOTE_CONTACT_METHODS,
  PROJECT_STATUSES,
  PROJECT_STAGES,
  QUOTE_PRIORITIES,
  QUOTE_PROJECT_TYPES,
  QUOTE_STATUSES,
  QUOTE_WORKFLOW_STATUSES,
  SERVICE_CATEGORIES,
  STAFF_CREATION_ROLES,
  STAFF_ROLES
} = contractKit;

const roleLabels = {
  client: 'Client Workspace',
  employee: 'Employee Workspace',
  manager: 'Manager Workspace',
  admin: 'Admin Workspace'
};

const roleDescriptions = {
  client: 'Projects, quotes, alerts and project communication in one place.',
  employee: 'Projects, teams, alerts and service delivery routes in one control room.',
  manager: 'Operations, projects, quotes, people and inbox routes in one control room.',
  admin: 'Full operational oversight across projects, people, inventory and inbox routes.'
};

const activeProjectStatuses = new Set(['planning', 'in_progress', 'on_hold']);
const openQuoteStatuses = new Set(['pending', 'in_progress']);
const MAX_QUOTE_PHOTO_FILES = 8;
const FINAL_PROJECT_STAGE = PROJECT_STAGES[PROJECT_STAGES.length - 1];

const createEmptyOverviewSummary = () => ({
  metrics: {
    projectCount: 0,
    activeProjectCount: 0,
    quoteCount: 0,
    openQuoteCount: 0,
    projectThreadCount: 0,
    directThreadCount: 0,
    unreadNotificationCount: 0,
    clientCount: 0,
    staffCount: 0,
    lowStockMaterialCount: 0,
    publicServiceCount: 0
  },
  projects: [],
  quotes: [],
  threads: [],
  directThreads: [],
  notifications: [],
  lowStockMaterials: [],
  publicServices: [],
  crm: {
    clientCount: 0,
    staffCount: 0
  }
});

const isStaffRole = (role) => ['employee', 'manager', 'admin'].includes(String(role || '').toLowerCase());

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const titleCase = (value) =>
  String(value || '')
    .replaceAll(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(' ');

const formatDateTime = (value, options = {}) => {
  if (!value) return 'Pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Pending';
  return date.toLocaleString('en-GB', {
    dateStyle: options.dateOnly ? 'medium' : 'medium',
    timeStyle: options.dateOnly ? undefined : 'short'
  });
};

const formatActivityTitle = (activity) => activity?.title || titleCase(activity?.eventType || 'activity');
const formatActivityMessage = (activity) => activity?.message || 'Activity details pending.';
const formatActivityMeta = (activity) => {
  const parts = [];
  if (activity?.entityType) parts.push(titleCase(activity.entityType));
  if (activity?.actor?.name || activity?.actor?.email) parts.push(activity.actor.name || activity.actor.email);
  if (activity?.createdAt) parts.push(formatDateTime(activity.createdAt));
  return parts.join(' | ');
};
const getActivityTone = (activity) => {
  const entityType = normalizeText(activity?.entityType);
  const eventType = normalizeText(activity?.eventType);
  if (entityType === 'project') return 'accent';
  if (eventType.includes('approved') || eventType.includes('accepted')) return 'accent';
  if (eventType.includes('declined') || eventType.includes('deleted') || eventType.includes('closed')) return 'danger';
  return 'neutral';
};

const compactNumber = (value) =>
  new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0));

const getTimestamp = (item, keys = ['updatedAt', 'latestMessageAt', 'createdAt']) => {
  for (const key of keys) {
    const parsed = Date.parse(item?.[key] || '');
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
};

const sortByRecent = (items, keys) =>
  [...(Array.isArray(items) ? items : [])].sort((left, right) => getTimestamp(right, keys) - getTimestamp(left, keys));

const getThreadTitle = (thread) =>
  thread?.name || thread?.project?.title || thread?.quote?.projectType || thread?.subject || 'Project thread';

const getThreadMeta = (thread) => {
  const parts = [];
  if (thread?.project?.location) parts.push(thread.project.location);
  if (thread?.project?.status) parts.push(titleCase(thread.project.status));
  else if (thread?.quote?.status) parts.push(titleCase(thread.quote.status));
  if (thread?.memberCount) parts.push(`${thread.memberCount} members`);
  return parts.join(' | ');
};

const getThreadPreview = (thread) => {
  const senderName = thread?.latestMessageSender?.name || thread?.latestMessageSender?.email || '';
  if (thread?.latestMessagePreview) {
    return senderName ? `${senderName}: ${thread.latestMessagePreview}` : thread.latestMessagePreview;
  }
  if (thread?.project?.title) return `Project route for ${thread.project.title}`;
  if (thread?.quote?.projectType) return `Quote route for ${thread.quote.projectType}`;
  return 'Open the thread to review the latest coordination.';
};

const getDirectCounterparty = (thread, currentUserId) => {
  if (thread?.counterparty) return thread.counterparty;
  if (thread?.participantAId === currentUserId) return thread?.participantB || null;
  if (thread?.participantBId === currentUserId) return thread?.participantA || null;
  return thread?.participantA || thread?.participantB || null;
};

const getDirectThreadTitle = (thread, currentUserId) => {
  const counterparty = getDirectCounterparty(thread, currentUserId);
  return counterparty?.name || counterparty?.email || thread?.subject || 'Private thread';
};

const getDirectThreadPreview = (thread) => thread?.latestMessagePreview || thread?.subject || 'Open the private route to continue the conversation.';

const getDirectThreadMeta = (thread) => {
  const parts = [];
  if (thread?.subject) parts.push(thread.subject);
  if (Number(thread?.unreadCount || 0) > 0) parts.push(`${thread.unreadCount} unread`);
  if (thread?.latestMessageAt || thread?.updatedAt) {
    parts.push(`Updated ${formatDateTime(thread.latestMessageAt || thread.updatedAt)}`);
  }
  return parts.join(' | ');
};

const getNotificationTone = (notification) => {
  const type = normalizeText(notification?.type);
  if (type.includes('error') || type.includes('urgent') || type.includes('overdue')) return 'danger';
  if (type.includes('project') || type.includes('quote')) return 'accent';
  return 'neutral';
};

const getPriorityTone = (priority) => {
  const normalized = normalizeText(priority);
  if (normalized === 'high') return 'danger';
  if (normalized === 'medium') return 'accent';
  return 'neutral';
};

const updateThreadAfterSend = (threads, threadId, message) => {
  const nextThreads = Array.isArray(threads) ? [...threads] : [];
  const targetIndex = nextThreads.findIndex((thread) => thread.id === threadId);
  if (targetIndex === -1) return nextThreads;

  const thread = nextThreads[targetIndex];
  nextThreads[targetIndex] = {
    ...thread,
    latestMessageAt: message?.createdAt || new Date().toISOString(),
    updatedAt: message?.createdAt || new Date().toISOString(),
    latestMessagePreview: message?.body || thread.latestMessagePreview,
    latestMessageSender: message?.sender || thread.latestMessageSender,
    messageCount: Number(thread?.messageCount || 0) + 1
  };

  return sortByRecent(nextThreads, ['latestMessageAt', 'updatedAt', 'createdAt']);
};

const updateDirectThreadAfterSend = (threads, threadId, message) => {
  const nextThreads = Array.isArray(threads) ? [...threads] : [];
  const targetIndex = nextThreads.findIndex((thread) => thread.id === threadId);
  if (targetIndex === -1) return nextThreads;

  const thread = nextThreads[targetIndex];
  nextThreads[targetIndex] = {
    ...thread,
    latestMessageAt: message?.createdAt || new Date().toISOString(),
    updatedAt: message?.createdAt || new Date().toISOString(),
    latestMessagePreview: message?.body || thread.latestMessagePreview,
    latestMessageSenderId: message?.sender?.id || thread.latestMessageSenderId,
    unreadCount: 0
  };

  return sortByRecent(nextThreads, ['latestMessageAt', 'updatedAt', 'createdAt']);
};

const toInputValue = (value) => (value === null || typeof value === 'undefined' ? '' : String(value));

const createProjectFormState = (overrides = {}) => ({
  title: '',
  location: '',
  description: '',
  status: PROJECT_STATUSES[0],
  projectStage: PROJECT_STAGES[0],
  clientId: '',
  assignedManagerId: '',
  quoteId: '',
  acceptedEstimateId: '',
  currentMilestone: '',
  workPackage: '',
  budgetEstimate: '',
  startDate: '',
  endDate: '',
  dueDate: '',
  showInGallery: false,
  galleryOrder: '0',
  isActive: true,
  ...overrides
});

const projectToFormState = (project) =>
  createProjectFormState({
    title: project?.title || '',
    location: project?.location || '',
    description: project?.description || '',
    status: project?.status || PROJECT_STATUSES[0],
    projectStage: project?.projectStage || PROJECT_STAGES[0],
    clientId: project?.clientId || '',
    assignedManagerId: project?.assignedManagerId || '',
    quoteId: project?.quoteId || '',
    acceptedEstimateId: project?.acceptedEstimateId || '',
    currentMilestone: project?.currentMilestone || '',
    workPackage: project?.workPackage || '',
    budgetEstimate: project?.budgetEstimate || '',
    startDate: project?.startDate ? String(project.startDate).slice(0, 10) : '',
    endDate: project?.endDate ? String(project.endDate).slice(0, 10) : '',
    dueDate: project?.dueDate ? String(project.dueDate).slice(0, 10) : '',
    showInGallery: Boolean(project?.showInGallery),
    galleryOrder: toInputValue(project?.galleryOrder || 0),
    isActive: typeof project?.isActive === 'boolean' ? project.isActive : true
  });

const createQuoteFormState = (overrides = {}) => ({
  projectType: QUOTE_PROJECT_TYPES[0],
  location: '',
  description: '',
  status: QUOTE_STATUSES[0],
  priority: QUOTE_PRIORITIES[0],
  clientId: '',
  assignedManagerId: '',
  guestName: '',
  guestEmail: '',
  guestPhone: '',
  contactMethod: QUOTE_CONTACT_METHODS[0],
  postcode: '',
  budgetRange: '',
  contactEmail: '',
  contactPhone: '',
  ...overrides
});

const quoteToFormState = (quote) =>
  createQuoteFormState({
    projectType: quote?.projectType || QUOTE_PROJECT_TYPES[0],
    location: quote?.location || '',
    description: quote?.description || '',
    status: quote?.status || QUOTE_STATUSES[0],
    priority: quote?.priority || QUOTE_PRIORITIES[0],
    clientId: quote?.clientId || '',
    assignedManagerId: quote?.assignedManagerId || '',
    guestName: quote?.guestName || '',
    guestEmail: quote?.guestEmail || '',
    guestPhone: quote?.guestPhone || '',
    contactMethod: quote?.contactMethod || QUOTE_CONTACT_METHODS[0],
    postcode: quote?.postcode || '',
    budgetRange: quote?.budgetRange || '',
    contactEmail: quote?.contactEmail || '',
    contactPhone: quote?.contactPhone || ''
  });

const createStaffFormState = (overrides = {}) => ({
  name: '',
  email: '',
  password: '',
  phone: '',
  role: STAFF_CREATION_ROLES[0],
  ...overrides
});

const createClientEditorState = (overrides = {}) => ({
  name: '',
  phone: '',
  companyName: '',
  crmLifecycleStatus: CLIENT_LIFECYCLE_STATUSES[0],
  isActive: true,
  ...overrides
});

const clientToFormState = (client) =>
  createClientEditorState({
    name: client?.name || '',
    phone: client?.phone || '',
    companyName: client?.companyName || '',
    crmLifecycleStatus: client?.crmLifecycleStatus || CLIENT_LIFECYCLE_STATUSES[0],
    isActive: typeof client?.isActive === 'boolean' ? client.isActive : true
  });

const createStaffEditorState = (overrides = {}) => ({
  name: '',
  phone: '',
  role: STAFF_ROLES[0],
  isActive: true,
  ...overrides
});

const staffToFormState = (member) =>
  createStaffEditorState({
    name: member?.name || '',
    phone: member?.phone || '',
    role: member?.role || STAFF_ROLES[0],
    isActive: typeof member?.isActive === 'boolean' ? member.isActive : true
  });

const createServiceFormState = (overrides = {}) => ({
  title: '',
  slug: '',
  category: SERVICE_CATEGORIES[0],
  shortDescription: '',
  fullDescription: '',
  basePriceFrom: '',
  heroImageUrl: '',
  displayOrder: '0',
  showOnWebsite: true,
  isFeatured: false,
  isActive: true,
  ...overrides
});

const serviceToFormState = (service) =>
  createServiceFormState({
    title: service?.title || '',
    slug: service?.slug || '',
    category: service?.category || SERVICE_CATEGORIES[0],
    shortDescription: service?.shortDescription || '',
    fullDescription: service?.fullDescription || '',
    basePriceFrom: toInputValue(service?.basePriceFrom),
    heroImageUrl: service?.heroImageUrl || '',
    displayOrder: toInputValue(service?.displayOrder || 0),
    showOnWebsite: typeof service?.showOnWebsite === 'boolean' ? service.showOnWebsite : true,
    isFeatured: Boolean(service?.isFeatured),
    isActive: typeof service?.isActive === 'boolean' ? service.isActive : true
  });

const createMaterialFormState = (overrides = {}) => ({
  name: '',
  sku: '',
  category: MATERIAL_CATEGORIES[0],
  unit: 'pcs',
  stockQty: '0',
  minStockQty: '0',
  unitCost: '',
  supplier: '',
  notes: '',
  isActive: true,
  ...overrides
});

const materialToFormState = (material) =>
  createMaterialFormState({
    name: material?.name || '',
    sku: material?.sku || '',
    category: material?.category || MATERIAL_CATEGORIES[0],
    unit: material?.unit || 'pcs',
    stockQty: toInputValue(material?.stockQty ?? 0),
    minStockQty: toInputValue(material?.minStockQty ?? 0),
    unitCost: toInputValue(material?.unitCost),
    supplier: material?.supplier || '',
    notes: material?.notes || '',
    isActive: typeof material?.isActive === 'boolean' ? material.isActive : true
  });

const toNullablePayload = (value) => {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : null;
};

const toNumberPayload = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoney = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `GBP ${parsed.toFixed(2)}` : 'Value pending';
};

const getNextProjectStage = (projectStage) => {
  const currentIndex = PROJECT_STAGES.indexOf(normalizeText(projectStage));
  if (currentIndex < 0 || currentIndex >= PROJECT_STAGES.length - 1) return null;
  return PROJECT_STAGES[currentIndex + 1];
};

const getEstimateHistoryLabel = (estimate) => {
  if (estimate?.isCurrentVersion) return 'Current version';
  if (normalizeText(estimate?.status) === 'superseded') return 'Version history';
  return 'History';
};

const getEstimateCardSummary = (estimate) => {
  const parts = [
    `v${estimate?.versionNumber || 1}`,
    titleCase(estimate?.status || 'draft'),
    titleCase(estimate?.decisionStatus || 'pending'),
    getEstimateHistoryLabel(estimate)
  ];
  if (estimate?.supersededById && normalizeText(estimate?.status) === 'superseded') {
    parts.push('Replaced by a newer version');
  }
  return parts.join(' | ');
};

const getSelectedFileKey = (file) => [file?.name || '', file?.size || 0, file?.lastModified || 0].join(':');

const mergeSelectedFiles = (currentFiles, incomingFiles) => {
  const merged = [...(Array.isArray(currentFiles) ? currentFiles : [])];
  const seenKeys = new Set(merged.map(getSelectedFileKey));

  (Array.isArray(incomingFiles) ? incomingFiles : []).forEach((file) => {
    const key = getSelectedFileKey(file);
    if (!seenKeys.has(key)) {
      merged.push(file);
      seenKeys.add(key);
    }
  });

  return merged;
};

const getRemainingQuotePhotoSlots = (quote) =>
  Math.max(0, MAX_QUOTE_PHOTO_FILES - Number(quote?.attachmentCount || 0));

const validateQuotePhotoSelection = ({ currentFiles = [], incomingFiles = [], existingAttachmentCount = 0 }) => {
  const mergedFiles = mergeSelectedFiles(currentFiles, incomingFiles);

  if (mergedFiles.some((file) => !String(file?.type || '').toLowerCase().startsWith('image/'))) {
    return {
      files: currentFiles,
      error: 'Only image files are allowed for quote photo attachments.'
    };
  }

  const allowedCount = Math.max(0, MAX_QUOTE_PHOTO_FILES - Number(existingAttachmentCount || 0));
  if (mergedFiles.length > allowedCount) {
    return {
      files: mergedFiles.slice(0, allowedCount),
      error: existingAttachmentCount
        ? `This quote can store up to ${MAX_QUOTE_PHOTO_FILES} photos. You can add ${allowedCount} more right now.`
        : `Attach up to ${MAX_QUOTE_PHOTO_FILES} photos per quote.`
    };
  }

  return {
    files: mergedFiles,
    error: ''
  };
};

const createEstimateFormState = (overrides = {}) => ({
  title: '',
  total: '',
  description: '',
  notes: '',
  clientMessage: '',
  ...overrides
});

function useAsyncState(loader, deps = [], initialData) {
  const [reloadKey, setReloadKey] = React.useState(0);
  const [state, setState] = React.useState({
    loading: true,
    error: '',
    data: initialData
  });

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      setState((prev) => ({ ...prev, loading: true, error: '' }));
      try {
        const data = await loader();
        if (active) {
          setState({
            loading: false,
            error: '',
            data: typeof data === 'undefined' ? initialData : data
          });
        }
      } catch (error) {
        if (active) {
          setState((prev) => ({
            loading: false,
            error: error.message || 'Could not load data',
            data: prev.data
          }));
        }
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [reloadKey, ...deps]);

  return {
    ...state,
    reload: () => setReloadKey((value) => value + 1),
    setData: (nextValue) =>
      setState((prev) => ({
        ...prev,
        data: typeof nextValue === 'function' ? nextValue(prev.data) : nextValue
      }))
  };
}


function Surface({ eyebrow, title, description, actions, className = '', children }) {
  return (
    <section className={`card surface ${className}`.trim()}>
      <div className="surface-head">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
          {description ? <p className="surface-copy">{description}</p> : null}
        </div>
        {actions ? <div className="surface-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, detail, tone = 'neutral' }) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <p className="muted">{label}</p>
      <strong>{compactNumber(value)}</strong>
      <span>{detail}</span>
    </article>
  );
}

function EmptyState({ text }) {
  return <p className="empty-state">{text}</p>;
}

function StatusPill({ children, tone = 'neutral' }) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}

function QuickLinkCard({ to, label, detail, meta }) {
  return (
    <Link to={to} className="quick-link-card">
      <strong>{label}</strong>
      <span>{detail}</span>
      {meta ? <small>{meta}</small> : null}
    </Link>
  );
}

function SelectableCard({ selected, onSelect, children }) {
  return (
    <button type="button" className={`stack-select ${selected ? 'stack-select--active' : ''}`.trim()} onClick={onSelect}>
      {children}
    </button>
  );
}

function ProjectCard({ project }) {
  const ownerName = project?.assignedManager?.name || project?.assignedManager?.email || 'Owner pending';
  const clientName = project?.client?.name || project?.client?.email || 'Client pending';
  const mediaSummary = `${project?.imageCount || 0} images / ${project?.documentCount || 0} docs`;

  return (
    <article className="stack-card">
      <div className="stack-card-head">
        <div>
          <h3>{project?.title || 'Untitled project'}</h3>
          <p className="muted">{project?.location || 'Location pending'}</p>
        </div>
        <StatusPill tone={activeProjectStatuses.has(normalizeText(project?.status)) ? 'accent' : 'neutral'}>
          {titleCase(project?.status || 'planning')}
        </StatusPill>
      </div>
      <p className="stack-card-copy">{project?.description || 'Project summary will appear here as the route matures.'}</p>
      <div className="meta-wrap">
        <span>Stage: {titleCase(project?.projectStage || PROJECT_STAGES[0])}</span>
        {project?.currentMilestone ? <span>Milestone: {project.currentMilestone}</span> : null}
        {project?.workPackage ? <span>Work package: {project.workPackage}</span> : null}
        {project?.dueDate ? <span>Due: {formatDateTime(project.dueDate, { dateOnly: true })}</span> : null}
        <span>{mediaSummary}</span>
        <span>{project?.isActive ? 'Active route' : 'Archived route'}</span>
        <span>Owner: {ownerName}</span>
        <span>Client: {clientName}</span>
        <span>Updated: {formatDateTime(project?.updatedAt)}</span>
      </div>
    </article>
  );
}

function QuoteCard({ quote }) {
  const managerName = quote?.assignedManager?.name || quote?.assignedManager?.email || 'Unassigned';
  const latestEstimate = quote?.latestEstimate || null;

  return (
    <article className="stack-card">
      <div className="stack-card-head">
        <div>
          <h3>{quote?.projectType || 'Quote'}</h3>
          <p className="muted">{quote?.location || 'Location pending'}</p>
        </div>
        <StatusPill tone={getPriorityTone(quote?.priority)}>Priority {titleCase(quote?.priority || 'low')}</StatusPill>
      </div>
      <p className="stack-card-copy">{quote?.description || 'Structured quote details will replace this summary in the next intake phase.'}</p>
      <div className="meta-wrap">
        <span>Status: {titleCase(quote?.workflowStatus || quote?.status || 'pending')}</span>
        <span>Manager: {managerName}</span>
        <span>Photos: {quote?.attachmentCount || 0}</span>
        <span>Estimates: {quote?.estimateCount || 0}</span>
        {latestEstimate ? <span>Latest offer: {`v${latestEstimate.versionNumber || 1} ${titleCase(latestEstimate.decisionStatus || latestEstimate.status || 'draft')}`}</span> : null}
        <span>Created: {formatDateTime(quote?.createdAt)}</span>
      </div>
    </article>
  );
}

function EstimateCard({ estimate, actions = null }) {
  return (
    <article className="summary-row">
      <div>
        <strong>{estimate?.title || 'Estimate'}</strong>
        <p>{getEstimateCardSummary(estimate)}</p>
        {estimate?.clientMessage ? <p className="muted">Client message: {estimate.clientMessage}</p> : null}
        {estimate?.decisionNote ? <p className="muted">Decision note: {estimate.decisionNote}</p> : null}
      </div>
      <div className="summary-row-meta">
        <span>{estimate?.total != null ? `GBP ${Number(estimate.total).toFixed(2)}` : 'Value pending'}</span>
        <span>{formatDateTime(estimate?.updatedAt || estimate?.createdAt)}</span>
        {actions}
      </div>
    </article>
  );
}

function QuoteEventRow({ event }) {
  const actorName = event?.actor?.name || event?.actor?.email || 'System';
  return (
    <article className="summary-row">
      <div>
        <strong>{titleCase(event?.eventType || 'event')}</strong>
        <p>{event?.message || 'Quote event logged.'}</p>
      </div>
      <div className="summary-row-meta">
        <span>{actorName}</span>
        <span>{formatDateTime(event?.createdAt)}</span>
      </div>
    </article>
  );
}

function ThreadRow({ thread, selected, onSelect }) {
  return (
    <button type="button" className={`thread-row ${selected ? 'thread-row--active' : ''}`} onClick={onSelect}>
      <div className="thread-row-head">
        <strong>{getThreadTitle(thread)}</strong>
        <span>{formatDateTime(thread?.latestMessageAt || thread?.updatedAt)}</span>
      </div>
      <p>{getThreadPreview(thread)}</p>
      <div className="meta-wrap">
        <span>{getThreadMeta(thread) || 'Coordination route'}</span>
        <span>{thread?.messageCount || 0} messages</span>
      </div>
    </button>
  );
}

function DirectThreadRow({ thread, currentUserId, selected, onSelect }) {
  return (
    <button type="button" className={`thread-row ${selected ? 'thread-row--active' : ''}`} onClick={onSelect}>
      <div className="thread-row-head">
        <strong>{getDirectThreadTitle(thread, currentUserId)}</strong>
        <span>{formatDateTime(thread?.latestMessageAt || thread?.updatedAt)}</span>
      </div>
      <p>{getDirectThreadPreview(thread)}</p>
      <div className="meta-wrap">
        <span>{getDirectThreadMeta(thread) || 'Private route'}</span>
        {Number(thread?.unreadCount || 0) > 0 ? <StatusPill tone="danger">{thread.unreadCount} unread</StatusPill> : null}
      </div>
    </button>
  );
}

function MessageBubble({ message, currentUserId }) {
  const isOwnMessage = message?.sender?.id === currentUserId;
  const attachments = Array.isArray(message?.attachments) ? message.attachments : [];

  return (
    <article className={`message-bubble ${isOwnMessage ? 'message-bubble--self' : ''}`}>
      <div className="message-bubble-head">
        <strong>{message?.sender?.name || message?.sender?.email || 'Workspace user'}</strong>
        <span>{formatDateTime(message?.createdAt)}</span>
      </div>
      <p>{message?.body || 'No body'}</p>
      {attachments.length ? (
        <div className="attachment-list">
          {attachments.map((attachment, index) => (
            <a
              key={`${attachment?.url || attachment?.name || 'attachment'}-${index}`}
              className="attachment-chip"
              href={attachment?.url}
              target="_blank"
              rel="noreferrer"
            >
              {attachment?.name || 'Attachment'}
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function QuoteAttachmentList({ attachments, emptyText = 'No quote photos attached yet.' }) {
  const items = Array.isArray(attachments) ? attachments : [];

  if (!items.length) {
    return <EmptyState text={emptyText} />;
  }

  return (
    <div className="attachment-list">
      {items.map((attachment, index) => (
        <a
          key={`${attachment?.url || attachment?.name || 'quote-attachment'}-${index}`}
          className="attachment-chip"
          href={attachment?.url}
          target="_blank"
          rel="noreferrer"
        >
          {attachment?.name || 'Quote photo'}
        </a>
      ))}
    </div>
  );
}

function NotificationRow({ notification, onRead, busy }) {
  return (
    <article className={`notification-row ${notification?.isRead ? 'notification-row--read' : ''}`}>
      <div className="stack-card-head">
        <div>
          <h3>{notification?.title || 'Notification'}</h3>
          <p className="muted">
            {titleCase(notification?.type || 'general')} | {formatDateTime(notification?.createdAt)}
          </p>
        </div>
        <StatusPill tone={notification?.isRead ? 'neutral' : getNotificationTone(notification)}>
          {notification?.isRead ? 'Read' : 'Unread'}
        </StatusPill>
      </div>
      <p className="stack-card-copy">{notification?.body || 'No notification body provided.'}</p>
      {!notification?.isRead ? (
        <button type="button" className="button-secondary" onClick={onRead} disabled={busy}>
          {busy ? 'Saving...' : 'Mark read'}
        </button>
      ) : null}
    </article>
  );
}

export {
  CLIENT_LIFECYCLE_STATUSES,
  ESTIMATE_DECISION_STATUSES,
  MATERIAL_CATEGORIES,
  QUOTE_CONTACT_METHODS,
  PROJECT_STATUSES,
  PROJECT_STAGES,
  QUOTE_PRIORITIES,
  QUOTE_PROJECT_TYPES,
  QUOTE_STATUSES,
  QUOTE_WORKFLOW_STATUSES,
  SERVICE_CATEGORIES,
  STAFF_CREATION_ROLES,
  STAFF_ROLES,
  roleLabels,
  roleDescriptions,
  activeProjectStatuses,
  openQuoteStatuses,
  MAX_QUOTE_PHOTO_FILES,
  FINAL_PROJECT_STAGE,
  createEmptyOverviewSummary,
  isStaffRole,
  normalizeText,
  titleCase,
  formatDateTime,
  formatActivityTitle,
  formatActivityMessage,
  formatActivityMeta,
  getActivityTone,
  compactNumber,
  getTimestamp,
  sortByRecent,
  getThreadTitle,
  getThreadMeta,
  getThreadPreview,
  getDirectCounterparty,
  getDirectThreadTitle,
  getDirectThreadPreview,
  getDirectThreadMeta,
  getNotificationTone,
  getPriorityTone,
  updateThreadAfterSend,
  updateDirectThreadAfterSend,
  toInputValue,
  createProjectFormState,
  projectToFormState,
  createQuoteFormState,
  quoteToFormState,
  createStaffFormState,
  createClientEditorState,
  clientToFormState,
  createStaffEditorState,
  staffToFormState,
  createServiceFormState,
  serviceToFormState,
  createMaterialFormState,
  materialToFormState,
  toNullablePayload,
  toNumberPayload,
  formatMoney,
  getNextProjectStage,
  getEstimateHistoryLabel,
  getEstimateCardSummary,
  getSelectedFileKey,
  mergeSelectedFiles,
  getRemainingQuotePhotoSlots,
  validateQuotePhotoSelection,
  createEstimateFormState,
  useAsyncState,
  Surface,
  MetricCard,
  EmptyState,
  StatusPill,
  QuickLinkCard,
  SelectableCard,
  ProjectCard,
  QuoteCard,
  EstimateCard,
  QuoteEventRow,
  ThreadRow,
  DirectThreadRow,
  MessageBubble,
  QuoteAttachmentList,
  NotificationRow
};
