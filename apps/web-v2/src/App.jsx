import React from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import contractKit from '../../../shared/contracts/v2.js';
import { useAuth } from './lib/auth.jsx';
import { v2Api } from './lib/api';

const {
  MATERIAL_CATEGORIES,
  PROJECT_STATUSES,
  QUOTE_PRIORITIES,
  QUOTE_STATUSES,
  SERVICE_CATEGORIES,
  STAFF_CREATION_ROLES
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
  clientId: '',
  assignedManagerId: '',
  quoteId: '',
  budgetEstimate: '',
  startDate: '',
  endDate: '',
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
    clientId: project?.clientId || '',
    assignedManagerId: project?.assignedManagerId || '',
    quoteId: project?.quoteId || '',
    budgetEstimate: project?.budgetEstimate || '',
    startDate: project?.startDate ? String(project.startDate).slice(0, 10) : '',
    endDate: project?.endDate ? String(project.endDate).slice(0, 10) : '',
    showInGallery: Boolean(project?.showInGallery),
    galleryOrder: toInputValue(project?.galleryOrder || 0),
    isActive: typeof project?.isActive === 'boolean' ? project.isActive : true
  });

const createQuoteUpdateState = (quote) => ({
  status: quote?.status || QUOTE_STATUSES[0],
  priority: quote?.priority || QUOTE_PRIORITIES[0]
});

const createStaffFormState = (overrides = {}) => ({
  name: '',
  email: '',
  password: '',
  phone: '',
  role: STAFF_CREATION_ROLES[0],
  ...overrides
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

function LoginView() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    await login(email, password);
  };

  return (
    <section className="auth-shell">
      <div className="card auth-card">
        <p className="eyebrow">Web-v2 rollout</p>
        <h1>levels+lines Control Room</h1>
        <p className="lead">
          One authenticated shell for client, employee, manager and admin routes, ready to keep sharing the same
          `api/v2` contract with the future mobile app.
        </p>
        <form onSubmit={onSubmit} className="form">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </div>
    </section>
  );
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
  const managerName = project?.assignedManager?.name || project?.assignedManager?.email || 'Manager pending';
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
        <span>{mediaSummary}</span>
        <span>Manager: {managerName}</span>
        <span>Client: {clientName}</span>
        <span>Updated: {formatDateTime(project?.updatedAt)}</span>
      </div>
    </article>
  );
}

function QuoteCard({ quote }) {
  const managerName = quote?.assignedManager?.name || quote?.assignedManager?.email || 'Unassigned';

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
        <span>Status: {titleCase(quote?.status || 'pending')}</span>
        <span>Manager: {managerName}</span>
        <span>Created: {formatDateTime(quote?.createdAt)}</span>
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

function AccountPage() {
  const { user } = useAuth();
  const unread = useAsyncState(() => v2Api.getNotificationsUnreadCount(), [], 0);

  return (
    <Surface
      eyebrow="Account"
      title={roleLabels[normalizeText(user?.role)] || 'Workspace account'}
      description="Session identity, role ownership and current alert count."
    >
      <div className="account-grid">
        <article className="metric-card metric-card--accent">
          <p className="muted">Signed in as</p>
          <strong>{user?.name || user?.email || 'Workspace user'}</strong>
          <span>{user?.email || 'No email available'}</span>
        </article>
        <article className="metric-card">
          <p className="muted">Role</p>
          <strong>{titleCase(user?.role || 'client')}</strong>
          <span>{roleDescriptions[normalizeText(user?.role)]}</span>
        </article>
        <article className="metric-card">
          <p className="muted">Unread alerts</p>
          <strong>{unread.loading ? '...' : compactNumber(unread.data)}</strong>
          <span>{unread.error || 'Live count from the v2 notifications contract.'}</span>
        </article>
      </div>
    </Surface>
  );
}

function OverviewPage() {
  const { user } = useAuth();
  const role = normalizeText(user?.role || 'client');
  const staffMode = isStaffRole(role);
  const projects = useAsyncState(() => v2Api.getProjects(), [role], []);
  const quotes = useAsyncState(() => v2Api.getQuotes(), [role], []);
  const threads = useAsyncState(() => v2Api.getThreads(), [role], []);
  const directThreads = useAsyncState(() => v2Api.getDirectThreads(), [role], []);
  const notifications = useAsyncState(() => v2Api.getNotifications(), [role], []);
  const unreadCount = useAsyncState(() => v2Api.getNotificationsUnreadCount(), [role], 0);
  const clients = useAsyncState(() => (staffMode ? v2Api.getCrmClients() : Promise.resolve([])), [staffMode], []);
  const staff = useAsyncState(() => (staffMode ? v2Api.getCrmStaff() : Promise.resolve([])), [staffMode], []);
  const materials = useAsyncState(() => (staffMode ? v2Api.getInventoryMaterials() : Promise.resolve([])), [staffMode], []);
  const publicServices = useAsyncState(() => v2Api.getPublicServices(), [], []);

  const sortedProjects = sortByRecent(projects.data, ['updatedAt', 'endDate', 'startDate', 'createdAt']);
  const sortedThreads = sortByRecent(threads.data, ['latestMessageAt', 'updatedAt', 'createdAt']);
  const sortedNotifications = sortByRecent(notifications.data, ['createdAt', 'updatedAt']);
  const activeProjects = sortedProjects.filter((project) => activeProjectStatuses.has(normalizeText(project?.status)));
  const openQuotes = quotes.data.filter((quote) => openQuoteStatuses.has(normalizeText(quote?.status)));
  const lowStockMaterials = materials.data.filter(
    (material) => Number(material?.stockQty || 0) <= Number(material?.minStockQty || 0)
  );

  const quickLinks = staffMode
    ? [
        { to: '/projects', label: 'Project flow', detail: 'Review live jobs, ownership and media counts.', meta: `${activeProjects.length} active` },
        { to: '/private-inbox', label: 'Private inbox', detail: 'Run one-to-one client and staff communication routes.', meta: `${directThreads.data.length} private` },
        { to: '/messages', label: 'Project chat', detail: 'Open project threads and keep delivery moving.', meta: `${threads.data.length} threads` },
        { to: '/quotes', label: 'Quote board', detail: 'Track pending and in-progress quote work.', meta: `${openQuotes.length} open` },
        { to: '/inventory', label: 'Stock watch', detail: 'Spot low-stock items before they block delivery.', meta: `${lowStockMaterials.length} flagged` }
      ]
    : [
        { to: '/projects', label: 'Projects', detail: 'Check progress, media counts and assigned manager routes.', meta: `${activeProjects.length} active` },
        { to: '/private-inbox', label: 'Direct manager', detail: 'Keep the private route open with your assigned manager.', meta: `${directThreads.data.length} threads` },
        { to: '/messages', label: 'Project chat', detail: 'Open the shared route for delivery questions and updates.', meta: `${threads.data.length} threads` },
        { to: '/quotes', label: 'Quote follow-up', detail: 'Track active quote requests and priorities.', meta: `${openQuotes.length} open` },
        { to: '/notifications', label: 'Alerts', detail: 'Clear unread notifications without losing the project thread.', meta: `${unreadCount.data || 0} unread` }
      ];

  return (
    <div className="page-stack">
      <Surface
        eyebrow={staffMode ? 'Operational workspace' : 'Client workspace'}
        title={`${roleLabels[role] || 'Workspace'} overview`}
        description={roleDescriptions[role] || 'Shared workspace routes are loading.'}
        className="hero-surface"
      >
        <div className="quick-link-grid">
          {quickLinks.map((link) => (
            <QuickLinkCard key={link.to} {...link} />
          ))}
        </div>
      </Surface>

      <div className="metrics-grid">
        <MetricCard label="Projects" value={projects.data.length} detail={`${activeProjects.length} active routes`} tone="accent" />
        <MetricCard label="Quotes" value={quotes.data.length} detail={`${openQuotes.length} open requests`} />
        <MetricCard
          label="Inbox routes"
          value={threads.data.length + directThreads.data.length}
          detail={`${directThreads.data.length} private / ${threads.data.length} project`}
        />
        <MetricCard label="Unread alerts" value={unreadCount.data} detail="Notifications still waiting for acknowledgement" tone="danger" />
        {staffMode ? <MetricCard label="Clients" value={clients.data.length} detail={`${staff.data.length} staff profiles loaded`} /> : null}
        {staffMode ? (
          <MetricCard label="Low stock" value={lowStockMaterials.length} detail="Materials at or below minimum stock" tone="danger" />
        ) : (
          <MetricCard label="Service routes" value={publicServices.data.length} detail="Current brochure catalogue contract" />
        )}
      </div>

      <div className="grid-two">
        <Surface
          eyebrow="Projects"
          title="Recent project routes"
          description="The newest or most recently updated projects across the active workspace."
          actions={<Link to="/projects">Open all</Link>}
        >
          <div className="stack-list">
            {projects.loading ? <p className="muted">Loading project routes...</p> : null}
            {projects.error ? <p className="error">{projects.error}</p> : null}
            {!projects.loading && !projects.error && !sortedProjects.length ? (
              <EmptyState text="Projects will appear here as soon as the workspace is linked." />
            ) : null}
            {sortedProjects.slice(0, 3).map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </Surface>

        <Surface
          eyebrow="Mailbox"
          title="Inbox preview"
          description="Latest thread previews from the shared project communication routes."
          actions={<Link to="/messages">Open inbox</Link>}
        >
          <div className="stack-list">
            {threads.loading || directThreads.loading ? <p className="muted">Loading thread summaries...</p> : null}
            {threads.error ? <p className="error">{threads.error}</p> : null}
            {directThreads.error ? <p className="error">{directThreads.error}</p> : null}
            {!threads.loading && !threads.error && !directThreads.loading && !directThreads.error && !sortedThreads.length && !directThreads.data.length ? (
              <EmptyState text="Thread previews will appear here once the first project or quote route is created." />
            ) : null}
            {sortByRecent(directThreads.data, ['latestMessageAt', 'updatedAt', 'createdAt']).slice(0, 2).map((thread) => (
              <article key={thread.id} className="summary-row">
                <div>
                  <strong>{getDirectThreadTitle(thread, user?.id)}</strong>
                  <p>{getDirectThreadPreview(thread)}</p>
                </div>
                <div className="summary-row-meta">
                  {Number(thread.unreadCount || 0) > 0 ? <StatusPill tone="danger">{thread.unreadCount} unread</StatusPill> : null}
                  <span>{formatDateTime(thread.latestMessageAt || thread.updatedAt)}</span>
                </div>
              </article>
            ))}
            {sortedThreads.slice(0, 4).map((thread) => (
              <article key={thread.id} className="summary-row">
                <div>
                  <strong>{getThreadTitle(thread)}</strong>
                  <p>{getThreadPreview(thread)}</p>
                </div>
                <div className="summary-row-meta">
                  <span>{thread.messageCount || 0} messages</span>
                  <span>{formatDateTime(thread.latestMessageAt || thread.updatedAt)}</span>
                </div>
              </article>
            ))}
          </div>
        </Surface>
      </div>

      <div className="grid-two">
        <Surface eyebrow="Quotes" title="Current quote pipeline" description="Open and recently active quote requests." actions={<Link to="/quotes">Open quotes</Link>}>
          <div className="stack-list">
            {quotes.loading ? <p className="muted">Loading quotes...</p> : null}
            {quotes.error ? <p className="error">{quotes.error}</p> : null}
            {!quotes.loading && !quotes.error && !quotes.data.length ? <EmptyState text="No quotes are currently linked to this workspace." /> : null}
            {sortByRecent(quotes.data, ['updatedAt', 'createdAt']).slice(0, 3).map((quote) => (
              <QuoteCard key={quote.id} quote={quote} />
            ))}
          </div>
        </Surface>

        <Surface
          eyebrow="Notifications"
          title="Alert queue"
          description="Unread and recent notifications from the shared v2 contract."
          actions={<Link to="/notifications">Open alerts</Link>}
        >
          <div className="stack-list">
            {notifications.loading ? <p className="muted">Loading notifications...</p> : null}
            {notifications.error ? <p className="error">{notifications.error}</p> : null}
            {!notifications.loading && !notifications.error && !sortedNotifications.length ? (
              <EmptyState text="Notifications will appear here once the workspace starts generating events." />
            ) : null}
            {sortedNotifications.slice(0, 4).map((notification) => (
              <article key={notification.id} className={`summary-row ${notification.isRead ? 'summary-row--read' : ''}`}>
                <div>
                  <strong>{notification.title}</strong>
                  <p>{notification.body}</p>
                </div>
                <div className="summary-row-meta">
                  <StatusPill tone={notification.isRead ? 'neutral' : getNotificationTone(notification)}>
                    {notification.isRead ? 'Read' : 'Unread'}
                  </StatusPill>
                  <span>{formatDateTime(notification.createdAt)}</span>
                </div>
              </article>
            ))}
          </div>
        </Surface>
      </div>

      {staffMode ? (
        <div className="grid-two">
          <Surface eyebrow="CRM" title="People pulse" description="Client and staff counts from the current CRM contract." actions={<Link to="/crm">Open CRM</Link>}>
            <div className="mini-grid">
              <MetricCard label="Clients" value={clients.data.length} detail="Active CRM client records" />
              <MetricCard label="Staff" value={staff.data.length} detail="Employee, manager and admin profiles" />
            </div>
          </Surface>

          <Surface eyebrow="Inventory" title="Stock watch" description="Quick signal for material levels that need follow-up." actions={<Link to="/inventory">Open inventory</Link>}>
            <div className="stack-list">
              {materials.loading ? <p className="muted">Loading stock levels...</p> : null}
              {materials.error ? <p className="error">{materials.error}</p> : null}
              {!materials.loading && !materials.error && !lowStockMaterials.length ? <EmptyState text="No low-stock materials right now." /> : null}
              {lowStockMaterials.slice(0, 4).map((material) => (
                <article key={material.id} className="summary-row">
                  <div>
                    <strong>{material.name}</strong>
                    <p>SKU {material.sku || 'pending'}</p>
                  </div>
                  <div className="summary-row-meta">
                    <StatusPill tone="danger">
                      {material.stockQty}/{material.minStockQty}
                    </StatusPill>
                  </div>
                </article>
              ))}
            </div>
          </Surface>
        </div>
      ) : (
        <Surface eyebrow="Services" title="Recommended service routes" description="Current public service catalogue summaries that also feed future mobile surfaces." actions={<Link to="/services-catalogue">Open services</Link>}>
          <div className="quick-link-grid">
            {publicServices.data.slice(0, 4).map((service) => (
              <article key={service.id || service.slug || service.title} className="quick-link-card quick-link-card--static">
                <strong>{service.title}</strong>
                <span>{service.shortDescription || 'Service summary pending.'}</span>
                <small>{service.category || 'Brochure route'}</small>
              </article>
            ))}
          </div>
        </Surface>
      )}
    </div>
  );
}

function ProjectsPage() {
  const { user } = useAuth();
  const role = normalizeText(user?.role || 'client');
  const staffMode = isStaffRole(role);
  const projects = useAsyncState(() => v2Api.getProjects(), [], []);
  const clients = useAsyncState(() => (staffMode ? v2Api.getCrmClients() : Promise.resolve([])), [staffMode], []);
  const staff = useAsyncState(() => (staffMode ? v2Api.getCrmStaff() : Promise.resolve([])), [staffMode], []);
  const quotes = useAsyncState(() => (staffMode ? v2Api.getQuotes() : Promise.resolve([])), [staffMode], []);
  const [search, setSearch] = React.useState('');
  const [selectedProjectId, setSelectedProjectId] = React.useState('');
  const [isCreatingNew, setIsCreatingNew] = React.useState(false);
  const [form, setForm] = React.useState(() => createProjectFormState({ assignedManagerId: user?.id || '' }));
  const [saving, setSaving] = React.useState(false);
  const [actionError, setActionError] = React.useState('');
  const [actionMessage, setActionMessage] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);

  const filteredProjects = sortByRecent(projects.data, ['updatedAt', 'endDate', 'startDate', 'createdAt']).filter((project) => {
    const needle = normalizeText(deferredSearch);
    if (!needle) return true;
    return [project?.title, project?.location, project?.description, project?.status, project?.client?.email, project?.assignedManager?.email]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });

  React.useEffect(() => {
    if (!staffMode || isCreatingNew) return;
    if (!filteredProjects.length) {
      if (selectedProjectId) setSelectedProjectId('');
      return;
    }
    if (!filteredProjects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(filteredProjects[0].id);
    }
  }, [filteredProjects, selectedProjectId, isCreatingNew, staffMode]);

  React.useEffect(() => {
    if (!staffMode || isCreatingNew) return;
    const selectedProject = projects.data.find((project) => project.id === selectedProjectId);
    if (!selectedProject) return;
    setForm(projectToFormState(selectedProject));
  }, [selectedProjectId, projects.data, isCreatingNew, staffMode]);

  const selectedProject = projects.data.find((project) => project.id === selectedProjectId) || null;

  const onFieldChange = (key) => (event) => {
    const nextValue = event?.target?.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  const startNewProject = () => {
    setIsCreatingNew(true);
    setSelectedProjectId('');
    setForm(createProjectFormState({ assignedManagerId: user?.id || '' }));
    setActionError('');
    setActionMessage('');
  };

  const selectProject = (project) => {
    setIsCreatingNew(false);
    setSelectedProjectId(project.id);
    setForm(projectToFormState(project));
    setActionError('');
    setActionMessage('');
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setActionError('');
    setActionMessage('');

    try {
      const payload = {
        title: String(form.title || '').trim(),
        location: toNullablePayload(form.location),
        description: toNullablePayload(form.description),
        status: form.status,
        clientId: form.clientId || null,
        assignedManagerId: form.assignedManagerId || null,
        quoteId: form.quoteId || null,
        budgetEstimate: toNullablePayload(form.budgetEstimate),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        showInGallery: Boolean(form.showInGallery),
        galleryOrder: toNumberPayload(form.galleryOrder, 0),
        isActive: Boolean(form.isActive)
      };

      const savedProject = selectedProjectId
        ? await v2Api.updateProject(selectedProjectId, payload)
        : await v2Api.createProject(payload);
      const hydratedProject = savedProject?.id ? await v2Api.getProject(savedProject.id) : savedProject;

      if (!hydratedProject?.id) throw new Error('Project response missing payload');

      projects.setData((prev) =>
        sortByRecent(
          [hydratedProject, ...prev.filter((project) => project.id !== hydratedProject.id)],
          ['updatedAt', 'endDate', 'startDate', 'createdAt']
        )
      );
      setIsCreatingNew(false);
      setSelectedProjectId(hydratedProject.id);
      setForm(projectToFormState(hydratedProject));
      setActionMessage(selectedProjectId ? 'Project saved.' : 'Project created.');
    } catch (error) {
      setActionError(error.message || 'Could not save project');
    } finally {
      setSaving(false);
    }
  };

  if (!staffMode) {
    return (
      <Surface
        eyebrow="Projects"
        title="Project board"
        description="Current v2 project summaries with status, location and media counts."
        actions={
          <label className="inline-search">
            <span>Filter</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search project, location or status" />
          </label>
        }
      >
        {projects.loading ? <p className="muted">Loading projects...</p> : null}
        {projects.error ? <p className="error">{projects.error}</p> : null}
        {!projects.loading && !projects.error && !filteredProjects.length ? <EmptyState text="No matching projects in this workspace." /> : null}
        <div className="stack-list">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </Surface>
    );
  }

  return (
    <div className="grid-two">
      <Surface
        eyebrow="Projects"
        title="Project board"
        description="Manager-side parity: create and update project routes without leaving the rollout shell."
        actions={
          <div className="surface-actions cluster">
            <label className="inline-search">
              <span>Filter</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search project, location or client" />
            </label>
            <button type="button" className="button-secondary" onClick={startNewProject}>
              New project
            </button>
          </div>
        }
      >
        {projects.loading ? <p className="muted">Loading projects...</p> : null}
        {projects.error ? <p className="error">{projects.error}</p> : null}
        {!projects.loading && !projects.error && !filteredProjects.length ? <EmptyState text="No matching projects in this workspace." /> : null}
        <div className="stack-list">
          {filteredProjects.map((project) => (
            <SelectableCard key={project.id} selected={!isCreatingNew && project.id === selectedProjectId} onSelect={() => selectProject(project)}>
              <ProjectCard project={project} />
            </SelectableCard>
          ))}
        </div>
      </Surface>

      <Surface
        eyebrow={selectedProjectId ? 'Edit project' : 'Create project'}
        title={selectedProjectId ? form.title || 'Edit project' : 'New project'}
        description="These fields now run through reusable `api/v2` contracts, ready to stay portable for a future native client."
      >
        {clients.loading || staff.loading || quotes.loading ? <p className="muted">Loading CRM and quote lookup data...</p> : null}
        {selectedProject ? <ProjectCard project={selectedProject} /> : null}
        <form className="editor-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              Title
              <input value={form.title} onChange={onFieldChange('title')} placeholder="Project title" required />
            </label>
            <label>
              Status
              <select value={form.status} onChange={onFieldChange('status')}>
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {titleCase(status)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Client
              <select value={form.clientId} onChange={onFieldChange('clientId')}>
                <option value="">Unassigned</option>
                {clients.data.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name || client.email || 'Client'}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assigned manager
              <select value={form.assignedManagerId} onChange={onFieldChange('assignedManagerId')}>
                <option value="">Unassigned</option>
                {staff.data.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name || member.email || 'Staff'} ({titleCase(member.role || 'employee')})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quote link
              <select value={form.quoteId} onChange={onFieldChange('quoteId')}>
                <option value="">No quote link</option>
                {quotes.data.map((quote) => (
                  <option key={quote.id} value={quote.id}>
                    {(quote.projectType || 'Quote') + (quote.location ? ` - ${quote.location}` : '')}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Location
              <input value={form.location} onChange={onFieldChange('location')} placeholder="Manchester" />
            </label>
            <label>
              Budget estimate
              <input value={form.budgetEstimate} onChange={onFieldChange('budgetEstimate')} placeholder="32000" />
            </label>
            <label>
              Gallery order
              <input value={form.galleryOrder} onChange={onFieldChange('galleryOrder')} type="number" min="0" />
            </label>
            <label>
              Start date
              <input value={form.startDate} onChange={onFieldChange('startDate')} type="date" />
            </label>
            <label>
              End date
              <input value={form.endDate} onChange={onFieldChange('endDate')} type="date" />
            </label>
          </div>

          <label>
            Description
            <textarea value={form.description} onChange={onFieldChange('description')} rows={5} placeholder="Project summary, scope or delivery note." />
          </label>

          <div className="checkbox-row">
            <label>
              <input checked={form.showInGallery} onChange={onFieldChange('showInGallery')} type="checkbox" />
              Show in gallery
            </label>
            <label>
              <input checked={form.isActive} onChange={onFieldChange('isActive')} type="checkbox" />
              Active project
            </label>
          </div>

          <div className="action-row">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : selectedProjectId ? 'Save project' : 'Create project'}
            </button>
            {!isCreatingNew ? (
              <button type="button" className="button-secondary" onClick={startNewProject}>
                Duplicate into new draft
              </button>
            ) : null}
          </div>
          {actionMessage ? <p className="muted">{actionMessage}</p> : null}
          {actionError ? <p className="error">{actionError}</p> : null}
        </form>
      </Surface>
    </div>
  );
}

function QuotesPage() {
  const { user } = useAuth();
  const role = normalizeText(user?.role || 'client');
  const canEditQuotes = ['manager', 'admin'].includes(role);
  const quotes = useAsyncState(() => v2Api.getQuotes(), [], []);
  const [search, setSearch] = React.useState('');
  const [selectedQuoteId, setSelectedQuoteId] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [actionError, setActionError] = React.useState('');
  const [actionMessage, setActionMessage] = React.useState('');
  const [form, setForm] = React.useState(() => createQuoteUpdateState(null));
  const deferredSearch = React.useDeferredValue(search);

  const filteredQuotes = sortByRecent(quotes.data, ['updatedAt', 'createdAt']).filter((quote) => {
    const needle = normalizeText(deferredSearch);
    if (!needle) return true;
    return [quote?.projectType, quote?.location, quote?.status, quote?.priority, quote?.guestName, quote?.guestEmail, quote?.client?.email]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });

  React.useEffect(() => {
    if (!canEditQuotes) return;
    if (!filteredQuotes.length) {
      if (selectedQuoteId) setSelectedQuoteId('');
      return;
    }
    if (!filteredQuotes.some((quote) => quote.id === selectedQuoteId)) {
      setSelectedQuoteId(filteredQuotes[0].id);
    }
  }, [filteredQuotes, selectedQuoteId, canEditQuotes]);

  React.useEffect(() => {
    if (!canEditQuotes) return;
    const selectedQuote = quotes.data.find((quote) => quote.id === selectedQuoteId);
    if (!selectedQuote) return;
    setForm(createQuoteUpdateState(selectedQuote));
  }, [selectedQuoteId, quotes.data, canEditQuotes]);

  const selectedQuote = quotes.data.find((quote) => quote.id === selectedQuoteId) || null;

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!selectedQuoteId || saving) return;

    setSaving(true);
    setActionError('');
    setActionMessage('');

    try {
      const updatedQuote = await v2Api.updateQuote(selectedQuoteId, {
        status: form.status,
        priority: form.priority
      });
      if (!updatedQuote?.id) throw new Error('Quote response missing payload');

      const mergedQuote = { ...selectedQuote, ...updatedQuote };
      quotes.setData((prev) =>
        sortByRecent(
          prev.map((quote) => (quote.id === mergedQuote.id ? mergedQuote : quote)),
          ['updatedAt', 'createdAt']
        )
      );
      setActionMessage('Quote saved.');
    } catch (error) {
      setActionError(error.message || 'Could not save quote');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={canEditQuotes ? 'grid-two' : ''}>
      <Surface
        eyebrow="Quotes"
        title="Quote board"
        description={canEditQuotes ? 'Manager-side status and priority updates now stay in the rollout shell.' : 'Portable quote summaries from `api/v2`, shared between web and the future mobile app.'}
        actions={
          <label className="inline-search">
            <span>Filter</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search quote, location or guest" />
          </label>
        }
      >
        {quotes.loading ? <p className="muted">Loading quotes...</p> : null}
        {quotes.error ? <p className="error">{quotes.error}</p> : null}
        {!quotes.loading && !quotes.error && !filteredQuotes.length ? <EmptyState text="No quote routes are available right now." /> : null}
        <div className="stack-list">
          {filteredQuotes.map((quote) =>
            canEditQuotes ? (
              <SelectableCard key={quote.id} selected={quote.id === selectedQuoteId} onSelect={() => setSelectedQuoteId(quote.id)}>
                <QuoteCard quote={quote} />
              </SelectableCard>
            ) : (
              <QuoteCard key={quote.id} quote={quote} />
            )
          )}
        </div>
      </Surface>

      {canEditQuotes ? (
        <Surface
          eyebrow="Quote actions"
          title={selectedQuote?.projectType || 'Select a quote'}
          description={selectedQuote ? `Guest: ${selectedQuote.guestName || selectedQuote.guestEmail || 'Known contact'}` : 'Select a quote to update status and priority.'}
        >
          {!selectedQuote ? <EmptyState text="No quote selected." /> : null}
          {selectedQuote ? <QuoteCard quote={selectedQuote} /> : null}
          {selectedQuote ? (
            <form className="editor-form" onSubmit={onSubmit}>
              <div className="form-grid">
                <label>
                  Status
                  <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
                    {QUOTE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {titleCase(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Priority
                  <select value={form.priority} onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}>
                    {QUOTE_PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {titleCase(priority)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="meta-wrap">
                <span>Client: {selectedQuote.client?.email || 'Guest quote'}</span>
                <span>Assigned manager: {selectedQuote.assignedManager?.email || 'Unassigned'}</span>
                <span>Created: {formatDateTime(selectedQuote.createdAt)}</span>
              </div>
              <div className="action-row">
                <button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save quote'}
                </button>
              </div>
              {actionMessage ? <p className="muted">{actionMessage}</p> : null}
              {actionError ? <p className="error">{actionError}</p> : null}
            </form>
          ) : null}
        </Surface>
      ) : null}
    </div>
  );
}

function PrivateInboxPage() {
  const { user } = useAuth();
  const role = normalizeText(user?.role || 'client');
  const staffMode = isStaffRole(role);
  const directThreads = useAsyncState(() => v2Api.getDirectThreads(), [], []);
  const projects = useAsyncState(() => (!staffMode ? v2Api.getProjects() : Promise.resolve([])), [staffMode], []);
  const quotes = useAsyncState(() => (!staffMode ? v2Api.getQuotes() : Promise.resolve([])), [staffMode], []);
  const clients = useAsyncState(() => (staffMode ? v2Api.getCrmClients() : Promise.resolve([])), [staffMode], []);
  const staff = useAsyncState(() => (staffMode ? v2Api.getCrmStaff() : Promise.resolve([])), [staffMode], []);
  const [selectedThreadId, setSelectedThreadId] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [draft, setDraft] = React.useState('');
  const [selectedFiles, setSelectedFiles] = React.useState([]);
  const [sending, setSending] = React.useState(false);
  const [composerError, setComposerError] = React.useState('');
  const [recipientEmail, setRecipientEmail] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [isCreatingNewThread, setIsCreatingNewThread] = React.useState(false);
  const [messageState, setMessageState] = React.useState({
    threadId: '',
    thread: null,
    loading: false,
    error: '',
    messages: []
  });

  const deferredSearch = React.useDeferredValue(search);
  const preferredManager =
    projects.data.map((project) => project?.assignedManager).find((manager) => manager?.id) ||
    quotes.data.map((quote) => quote?.assignedManager).find((manager) => manager?.id) ||
    null;

  const peopleDirectory = (() => {
    if (!staffMode) return preferredManager ? [preferredManager] : [];
    const seen = new Set();
    return [...clients.data, ...staff.data]
      .filter((person) => person?.id && person.id !== user?.id && person?.email)
      .filter((person) => {
        const key = normalizeText(person.email);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) =>
        String(left?.name || left?.email || '').localeCompare(String(right?.name || right?.email || ''))
      );
  })();

  const filteredThreads = sortByRecent(directThreads.data, ['latestMessageAt', 'updatedAt', 'createdAt']).filter((thread) => {
    const needle = normalizeText(deferredSearch);
    if (!needle) return true;
    return [getDirectThreadTitle(thread, user?.id), getDirectThreadPreview(thread), getDirectThreadMeta(thread), thread?.subject]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });

  React.useEffect(() => {
    if (isCreatingNewThread) return;
    if (!filteredThreads.length) {
      if (selectedThreadId) setSelectedThreadId('');
      return;
    }
    if (!filteredThreads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(filteredThreads[0].id);
    }
  }, [filteredThreads, selectedThreadId, isCreatingNewThread]);

  React.useEffect(() => {
    if (!selectedThreadId) {
      setMessageState({
        threadId: '',
        thread: null,
        loading: false,
        error: '',
        messages: []
      });
      return;
    }

    let active = true;
    setMessageState((prev) => ({
      ...prev,
      threadId: selectedThreadId,
      loading: true,
      error: ''
    }));

    v2Api
      .getDirectThreadMessages(selectedThreadId)
      .then((payload) => {
        const nextSelectedThread = directThreads.data.find((thread) => thread.id === selectedThreadId) || null;
        if (!active) return;
        setMessageState({
          threadId: selectedThreadId,
          thread: payload.thread || nextSelectedThread,
          loading: false,
          error: '',
          messages: sortByRecent(payload.messages, ['createdAt']).reverse()
        });
      })
      .catch((error) => {
        const nextSelectedThread = directThreads.data.find((thread) => thread.id === selectedThreadId) || null;
        if (!active) return;
        setMessageState({
          threadId: selectedThreadId,
          thread: nextSelectedThread,
          loading: false,
          error: error.message || 'Could not load private messages',
          messages: []
        });
      });

    return () => {
      active = false;
    };
  }, [selectedThreadId, directThreads.data]);

  React.useEffect(() => {
    if (!selectedThreadId) return;
    const selectedThread = directThreads.data.find((thread) => thread.id === selectedThreadId);
    if (Number(selectedThread?.unreadCount || 0) <= 0) return;

    let active = true;
    v2Api
      .markDirectThreadRead(selectedThreadId)
      .then(() => {
        if (!active) return;
        directThreads.setData((prev) => prev.map((thread) => (thread.id === selectedThreadId ? { ...thread, unreadCount: 0 } : thread)));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [selectedThreadId, directThreads.data]);

  const selectedThread = filteredThreads.find((thread) => thread.id === selectedThreadId) || messageState.thread;
  const canStartThread = Boolean(staffMode ? peopleDirectory.length : preferredManager?.id);
  const recipientLabel = preferredManager?.name || preferredManager?.email || 'Assigned manager';

  const resetComposer = () => {
    setDraft('');
    setSelectedFiles([]);
    setComposerError('');
  };

  const resolveRecipient = () => {
    if (!staffMode) return preferredManager;
    return peopleDirectory.find((person) => normalizeText(person?.email) === normalizeText(recipientEmail)) || null;
  };

  const startNewThread = () => {
    setIsCreatingNewThread(true);
    setSelectedThreadId('');
    setSubject('');
    setRecipientEmail('');
    resetComposer();
  };

  const onSelectThread = (threadId) => {
    setIsCreatingNewThread(false);
    setSelectedThreadId(threadId);
    setComposerError('');
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (sending) return;

    const trimmedBody = String(draft || '').trim();
    if (!trimmedBody && !selectedFiles.length) {
      setComposerError('Write a message or attach at least one file.');
      return;
    }

    setSending(true);
    setComposerError('');

    try {
      let threadId = selectedThreadId;
      let nextMessage = null;
      let nextThread = selectedThread;

      if (!threadId) {
        const recipient = resolveRecipient();
        if (!recipient?.id) {
          throw new Error(staffMode ? 'Choose an existing client or staff email first.' : 'No assigned manager is available for a private route yet.');
        }

        const threadSubject = String(subject || '').trim() || `Private conversation - ${recipient.name || recipient.email}`;
        const created = await v2Api.createDirectThread({
          recipientUserId: recipient.id,
          subject: threadSubject,
          body: selectedFiles.length ? '' : trimmedBody,
          createOnly: selectedFiles.length > 0
        });

        if (!created.thread?.id) {
          throw new Error('Private thread response missing thread payload');
        }

        threadId = created.thread.id;
        nextThread = created.thread;
        nextMessage = created.message || null;
        directThreads.setData((prev) =>
          sortByRecent([created.thread, ...prev.filter((thread) => thread.id !== created.thread.id)], ['latestMessageAt', 'updatedAt', 'createdAt'])
        );
      }

      if (selectedFiles.length) {
        nextMessage = await v2Api.uploadDirectThreadMessage(threadId, { body: trimmedBody, files: selectedFiles });
      } else if (selectedThreadId) {
        nextMessage = await v2Api.sendDirectThreadMessage(threadId, trimmedBody);
      }

      if (!nextMessage) {
        throw new Error('Private message response missing payload');
      }

      setIsCreatingNewThread(false);
      setSelectedThreadId(threadId);
      setRecipientEmail('');
      setSubject('');
      resetComposer();
      setMessageState((prev) => ({
        ...prev,
        threadId,
        thread: nextThread || prev.thread,
        error: '',
        loading: false,
        messages: selectedThreadId ? [...prev.messages, nextMessage] : [nextMessage]
      }));
      directThreads.setData((prev) => updateDirectThreadAfterSend(prev, threadId, nextMessage));
    } catch (error) {
      setComposerError(error.message || 'Could not send private message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="messages-shell">
      <Surface
        eyebrow="Private inbox"
        title="Direct conversation routes"
        description="Private client and staff messaging now runs through `api/v2` instead of staying trapped in the legacy inbox route."
        className="messages-sidebar-panel"
        actions={
          <div className="surface-actions cluster">
            <label className="inline-search inline-search--wide">
              <span>Find thread</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search person or subject" />
            </label>
            {staffMode ? (
              <button type="button" className="button-secondary" onClick={startNewThread}>
                New thread
              </button>
            ) : null}
          </div>
        }
      >
        {directThreads.loading ? <p className="muted">Loading private threads...</p> : null}
        {directThreads.error ? <p className="error">{directThreads.error}</p> : null}
        {!directThreads.loading && !directThreads.error && !filteredThreads.length ? (
          <EmptyState text={staffMode ? 'No private threads yet. Start one from the composer.' : 'No direct manager thread yet.'} />
        ) : null}
        <div className="thread-list">
          {filteredThreads.map((thread) => (
            <DirectThreadRow
              key={thread.id}
              thread={thread}
              currentUserId={user?.id}
              selected={thread.id === selectedThreadId}
              onSelect={() => onSelectThread(thread.id)}
            />
          ))}
        </div>
      </Surface>

      <Surface
        eyebrow="Conversation"
        title={selectedThread ? getDirectThreadTitle(selectedThread, user?.id) : 'Start private route'}
        description={
          selectedThread
            ? getDirectThreadMeta(selectedThread) || 'Open the thread and continue the private route.'
            : staffMode
              ? 'Pick an existing person and write the opening message.'
              : canStartThread
                ? `Your private route will open with ${recipientLabel}.`
                : 'A direct route becomes available once a manager is assigned.'
        }
        className="messages-thread-panel"
      >
        {!selectedThread && !canStartThread ? <EmptyState text="No private route can be opened yet." /> : null}
        {selectedThread && messageState.loading ? <p className="muted">Loading private messages...</p> : null}
        {selectedThread && messageState.error ? <p className="error">{messageState.error}</p> : null}
        {selectedThread && !messageState.loading && !messageState.error && !messageState.messages.length ? (
          <EmptyState text="This private thread has no messages yet." />
        ) : null}
        {selectedThread ? (
          <div className="message-list">
            {messageState.messages.map((message) => (
              <MessageBubble key={message.id} message={message} currentUserId={user?.id} />
            ))}
          </div>
        ) : null}

        {canStartThread ? (
          <form className="composer" onSubmit={onSubmit}>
            {!selectedThread ? (
              <>
                {staffMode ? (
                  <label>
                    Recipient email
                    <input
                      value={recipientEmail}
                      onChange={(event) => setRecipientEmail(event.target.value)}
                      list="private-inbox-people"
                      placeholder="Choose an existing client or staff email"
                    />
                    <datalist id="private-inbox-people">
                      {peopleDirectory.map((person) => (
                        <option key={person.id} value={person.email}>
                          {person.name || person.email}
                        </option>
                      ))}
                    </datalist>
                  </label>
                ) : (
                  <p className="muted">Recipient: {recipientLabel}</p>
                )}
                {staffMode ? (
                  <label>
                    Subject
                    <input
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      placeholder="Private conversation subject"
                    />
                  </label>
                ) : null}
              </>
            ) : null}

            <label>
              Message
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={selectedThread ? 'Write the next private update or decision.' : 'Write the opening private message.'}
                rows={4}
              />
            </label>
            <div className="composer-actions">
              <label className="file-input">
                <span>Attach files</span>
                <input type="file" multiple onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))} />
              </label>
              <button type="submit" disabled={sending}>
                {sending ? 'Sending...' : selectedThread ? 'Send private update' : 'Open private route'}
              </button>
            </div>
            {selectedFiles.length ? (
              <div className="attachment-list">
                {selectedFiles.map((file) => (
                  <span key={`${file.name}-${file.size}`} className="attachment-chip attachment-chip--muted">
                    {file.name}
                  </span>
                ))}
              </div>
            ) : null}
            {composerError ? <p className="error">{composerError}</p> : null}
          </form>
        ) : null}
      </Surface>
    </div>
  );
}

function MessagesPage() {
  const { user } = useAuth();
  const threads = useAsyncState(() => v2Api.getThreads(), [], []);
  const [selectedThreadId, setSelectedThreadId] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [draft, setDraft] = React.useState('');
  const [selectedFiles, setSelectedFiles] = React.useState([]);
  const [sending, setSending] = React.useState(false);
  const [composerError, setComposerError] = React.useState('');
  const [isSwitchingThread, startThreadTransition] = React.useTransition();
  const [messageState, setMessageState] = React.useState({
    threadId: '',
    thread: null,
    loading: false,
    error: '',
    messages: []
  });

  const deferredSearch = React.useDeferredValue(search);
  const filteredThreads = sortByRecent(threads.data, ['latestMessageAt', 'updatedAt', 'createdAt']).filter((thread) => {
    const needle = normalizeText(deferredSearch);
    if (!needle) return true;
    return [getThreadTitle(thread), getThreadPreview(thread), getThreadMeta(thread), thread?.project?.title, thread?.project?.location, thread?.quote?.projectType]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });

  React.useEffect(() => {
    if (!filteredThreads.length) {
      if (selectedThreadId) setSelectedThreadId('');
      return;
    }
    if (!filteredThreads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(filteredThreads[0].id);
    }
  }, [filteredThreads, selectedThreadId]);

  React.useEffect(() => {
    if (!selectedThreadId) {
      setMessageState({
        threadId: '',
        thread: null,
        loading: false,
        error: '',
        messages: []
      });
      return;
    }

    let active = true;
    setMessageState((prev) => ({
      ...prev,
      threadId: selectedThreadId,
      loading: true,
      error: ''
    }));

    v2Api
      .getThreadMessages(selectedThreadId)
      .then((payload) => {
        const nextSelectedThread = threads.data.find((thread) => thread.id === selectedThreadId) || null;
        if (!active) return;
        setMessageState({
          threadId: selectedThreadId,
          thread: payload.thread || nextSelectedThread,
          loading: false,
          error: '',
          messages: sortByRecent(payload.messages, ['createdAt']).reverse()
        });
      })
      .catch((error) => {
        const nextSelectedThread = threads.data.find((thread) => thread.id === selectedThreadId) || null;
        if (!active) return;
        setMessageState({
          threadId: selectedThreadId,
          thread: nextSelectedThread,
          loading: false,
          error: error.message || 'Could not load messages',
          messages: []
        });
      });

    return () => {
      active = false;
    };
  }, [selectedThreadId, threads.data]);

  const selectedThread = filteredThreads.find((thread) => thread.id === selectedThreadId) || messageState.thread;

  const onSelectThread = (threadId) => {
    startThreadTransition(() => {
      setSelectedThreadId(threadId);
      setComposerError('');
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!selectedThreadId || sending) return;

    const trimmedBody = String(draft || '').trim();
    if (!trimmedBody && !selectedFiles.length) {
      setComposerError('Write a message or attach at least one file.');
      return;
    }

    setSending(true);
    setComposerError('');

    try {
      const message = selectedFiles.length
        ? await v2Api.uploadThreadMessage(selectedThreadId, { body: trimmedBody, files: selectedFiles })
        : await v2Api.sendThreadMessage(selectedThreadId, trimmedBody);

      if (!message) throw new Error('Message response missing payload');

      setDraft('');
      setSelectedFiles([]);
      setMessageState((prev) => ({
        ...prev,
        error: '',
        messages: [...prev.messages, message]
      }));
      threads.setData((prev) => updateThreadAfterSend(prev, selectedThreadId, message));
    } catch (error) {
      setComposerError(error.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="messages-shell">
      <Surface
        eyebrow="Project chat"
        title="Threaded project communication"
        description="Group/project thread summaries, history and text/file send flow under the rollout shell."
        className="messages-sidebar-panel"
        actions={
          <label className="inline-search inline-search--wide">
            <span>Find thread</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search thread, project or location" />
          </label>
        }
      >
        {threads.loading ? <p className="muted">Loading thread summaries...</p> : null}
        {threads.error ? <p className="error">{threads.error}</p> : null}
        {!threads.loading && !threads.error && !filteredThreads.length ? <EmptyState text="No project threads are available yet." /> : null}
        <div className="thread-list">
          {filteredThreads.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} selected={thread.id === selectedThreadId} onSelect={() => onSelectThread(thread.id)} />
          ))}
        </div>
      </Surface>

      <Surface
        eyebrow="Conversation"
        title={selectedThread ? getThreadTitle(selectedThread) : 'Select a thread'}
        description={selectedThread ? getThreadMeta(selectedThread) || 'Open thread details and latest delivery context.' : 'Choose a thread from the left to load its messages.'}
        className="messages-thread-panel"
        actions={
          selectedThread ? (
            <div className="surface-actions cluster">
              <StatusPill tone="accent">{selectedThread.messageCount || 0} messages</StatusPill>
              {isSwitchingThread ? <span className="muted">Switching...</span> : null}
            </div>
          ) : null
        }
      >
        {!selectedThread ? <EmptyState text="No thread selected." /> : null}
        {selectedThread && messageState.loading ? <p className="muted">Loading messages...</p> : null}
        {selectedThread && messageState.error ? <p className="error">{messageState.error}</p> : null}
        {selectedThread && !messageState.loading && !messageState.error && !messageState.messages.length ? (
          <EmptyState text="This thread has no messages yet." />
        ) : null}
        {selectedThread ? (
          <>
            <div className="message-list">
              {messageState.messages.map((message) => (
                <MessageBubble key={message.id} message={message} currentUserId={user?.id} />
              ))}
            </div>
            <form className="composer" onSubmit={onSubmit}>
              <label>
                Message
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Write the next project update, question or handoff note."
                  rows={4}
                />
              </label>
              <div className="composer-actions">
                <label className="file-input">
                  <span>Attach files</span>
                  <input
                    type="file"
                    multiple
                    onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
                  />
                </label>
                <button type="submit" disabled={sending}>
                  {sending ? 'Sending...' : 'Send update'}
                </button>
              </div>
              {selectedFiles.length ? (
                <div className="attachment-list">
                  {selectedFiles.map((file) => (
                    <span key={`${file.name}-${file.size}`} className="attachment-chip attachment-chip--muted">
                      {file.name}
                    </span>
                  ))}
                </div>
              ) : null}
              {composerError ? <p className="error">{composerError}</p> : null}
            </form>
          </>
        ) : null}
      </Surface>
    </div>
  );
}

function NotificationsPage() {
  const notifications = useAsyncState(() => v2Api.getNotifications(), [], []);
  const unread = useAsyncState(() => v2Api.getNotificationsUnreadCount(), [], 0);
  const [busyId, setBusyId] = React.useState('');
  const [markingAll, setMarkingAll] = React.useState(false);
  const [actionError, setActionError] = React.useState('');

  const onMarkRead = async (notificationId) => {
    setBusyId(notificationId);
    setActionError('');
    try {
      const updated = await v2Api.markNotificationRead(notificationId);
      notifications.setData((prev) =>
        prev.map((notification) => (notification.id === notificationId ? { ...notification, ...(updated || {}), isRead: true } : notification))
      );
      unread.setData((prev) => Math.max(0, Number(prev || 0) - 1));
    } catch (error) {
      setActionError(error.message || 'Could not mark notification as read');
    } finally {
      setBusyId('');
    }
  };

  const onMarkAllRead = async () => {
    setMarkingAll(true);
    setActionError('');
    try {
      await v2Api.markAllNotificationsRead();
      notifications.setData((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
      unread.setData(0);
    } catch (error) {
      setActionError(error.message || 'Could not mark all notifications as read');
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <Surface
      eyebrow="Notifications"
      title="Alert queue"
      description="Read-state actions now work inside the rollout shell instead of forcing a jump back to legacy pages."
      actions={
        <div className="surface-actions cluster">
          <StatusPill tone={Number(unread.data || 0) > 0 ? 'danger' : 'neutral'}>{unread.loading ? '...' : `${unread.data} unread`}</StatusPill>
          <button type="button" className="button-secondary" onClick={onMarkAllRead} disabled={markingAll || !notifications.data.length}>
            {markingAll ? 'Saving...' : 'Mark all read'}
          </button>
        </div>
      }
    >
      {notifications.loading ? <p className="muted">Loading notifications...</p> : null}
      {notifications.error ? <p className="error">{notifications.error}</p> : null}
      {actionError ? <p className="error">{actionError}</p> : null}
      {!notifications.loading && !notifications.error && !notifications.data.length ? <EmptyState text="No notifications right now." /> : null}
      <div className="stack-list">
        {sortByRecent(notifications.data, ['createdAt', 'updatedAt']).map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            onRead={() => onMarkRead(notification.id)}
            busy={busyId === notification.id}
          />
        ))}
      </div>
    </Surface>
  );
}

function CrmPage() {
  const { user } = useAuth();
  const role = normalizeText(user?.role || 'employee');
  const canCreateStaff = ['manager', 'admin'].includes(role);
  const clients = useAsyncState(() => v2Api.getCrmClients(), [], []);
  const staff = useAsyncState(() => v2Api.getCrmStaff(), [], []);
  const [search, setSearch] = React.useState('');
  const [staffForm, setStaffForm] = React.useState(() => createStaffFormState());
  const [saving, setSaving] = React.useState(false);
  const [actionError, setActionError] = React.useState('');
  const [actionMessage, setActionMessage] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);

  const filteredClients = clients.data.filter((client) =>
    [client?.name, client?.email, client?.phone, client?.companyName].join(' ').toLowerCase().includes(normalizeText(deferredSearch))
  );
  const filteredStaff = staff.data.filter((member) =>
    [member?.name, member?.email, member?.role].join(' ').toLowerCase().includes(normalizeText(deferredSearch))
  );

  const onStaffFieldChange = (key) => (event) => {
    const nextValue = event?.target?.type === 'checkbox' ? event.target.checked : event.target.value;
    setStaffForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  const onCreateStaff = async (event) => {
    event.preventDefault();
    if (!canCreateStaff || saving) return;

    setSaving(true);
    setActionError('');
    setActionMessage('');

    try {
      const createdStaff = await v2Api.createCrmStaff({
        name: String(staffForm.name || '').trim(),
        email: String(staffForm.email || '').trim(),
        password: staffForm.password,
        phone: toNullablePayload(staffForm.phone),
        role: staffForm.role
      });

      if (!createdStaff?.id) throw new Error('Staff response missing payload');

      staff.setData((prev) => sortByRecent([createdStaff, ...prev.filter((member) => member.id !== createdStaff.id)], ['createdAt', 'updatedAt']));
      setStaffForm(createStaffFormState());
      setActionMessage('Staff member created.');
    } catch (error) {
      setActionError(error.message || 'Could not create staff member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <Surface
        eyebrow="CRM"
        title="People directory"
        description="`CRM` now covers search-ready people lists for assignment workflows, plus v2-native staff creation for managers and admins."
        actions={
          <label className="inline-search">
            <span>Filter people</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or phone" />
          </label>
        }
      >
        <div className="mini-grid">
          <MetricCard label="Clients" value={clients.data.length} detail="Live client records" />
          <MetricCard label="Staff" value={staff.data.length} detail="Employee, manager and admin profiles" tone="accent" />
        </div>
      </Surface>

      {canCreateStaff ? (
        <Surface eyebrow="CRM actions" title="Create staff member" description="This manager/admin action now runs through `api/v2/crm/staff` instead of the legacy manager shell.">
          <form className="editor-form" onSubmit={onCreateStaff}>
            <div className="form-grid">
              <label>
                Name
                <input value={staffForm.name} onChange={onStaffFieldChange('name')} placeholder="Leah Builder" required />
              </label>
              <label>
                Email
                <input value={staffForm.email} onChange={onStaffFieldChange('email')} type="email" placeholder="leah@example.com" required />
              </label>
              <label>
                Password
                <input value={staffForm.password} onChange={onStaffFieldChange('password')} type="password" minLength={8} required />
              </label>
              <label>
                Phone
                <input value={staffForm.phone} onChange={onStaffFieldChange('phone')} placeholder="+44 ..." />
              </label>
              <label>
                Role
                <select value={staffForm.role} onChange={onStaffFieldChange('role')}>
                  {STAFF_CREATION_ROLES.filter((staffRole) => role === 'admin' || staffRole !== 'manager').map((staffRole) => (
                    <option key={staffRole} value={staffRole}>
                      {titleCase(staffRole)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="action-row">
              <button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Create staff member'}
              </button>
            </div>
            {actionMessage ? <p className="muted">{actionMessage}</p> : null}
            {actionError ? <p className="error">{actionError}</p> : null}
          </form>
        </Surface>
      ) : null}

      <div className="grid-two">
        <Surface eyebrow="CRM" title="Clients" description="Current client records exposed by the v2 CRM contract.">
          {clients.loading ? <p className="muted">Loading clients...</p> : null}
          {clients.error ? <p className="error">{clients.error}</p> : null}
          {!clients.loading && !clients.error && !filteredClients.length ? <EmptyState text="No clients found." /> : null}
          <div className="stack-list">
            {filteredClients.map((client) => (
              <article key={client.id} className="summary-row">
                <div>
                  <strong>{client.name || 'Client'}</strong>
                  <p>{client.email || 'No email available'}</p>
                </div>
                <div className="summary-row-meta">
                  <span>{client.phone || 'No phone'}</span>
                  {client.companyName ? <span>{client.companyName}</span> : null}
                </div>
              </article>
            ))}
          </div>
        </Surface>

        <Surface eyebrow="CRM" title="Staff" description="Employee, manager and admin profiles currently loaded.">
          {staff.loading ? <p className="muted">Loading staff...</p> : null}
          {staff.error ? <p className="error">{staff.error}</p> : null}
          {!staff.loading && !staff.error && !filteredStaff.length ? <EmptyState text="No staff records found." /> : null}
          <div className="stack-list">
            {filteredStaff.map((member) => (
              <article key={member.id} className="summary-row">
                <div>
                  <strong>{member.name || 'Staff member'}</strong>
                  <p>{member.email || 'No email available'}</p>
                </div>
                <div className="summary-row-meta">
                  <StatusPill tone="accent">{titleCase(member.role || 'staff')}</StatusPill>
                  <span>{member.phone || 'No phone'}</span>
                </div>
              </article>
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}

function InventoryPage() {
  const { user } = useAuth();
  const role = normalizeText(user?.role || 'employee');
  const canDelete = ['manager', 'admin'].includes(role);
  const services = useAsyncState(() => v2Api.getInventoryServices(), [], []);
  const materials = useAsyncState(() => v2Api.getInventoryMaterials(), [], []);
  const [serviceSearch, setServiceSearch] = React.useState('');
  const [materialSearch, setMaterialSearch] = React.useState('');
  const [selectedServiceId, setSelectedServiceId] = React.useState('');
  const [selectedMaterialId, setSelectedMaterialId] = React.useState('');
  const [isCreatingService, setIsCreatingService] = React.useState(false);
  const [isCreatingMaterial, setIsCreatingMaterial] = React.useState(false);
  const [serviceForm, setServiceForm] = React.useState(() => createServiceFormState());
  const [materialForm, setMaterialForm] = React.useState(() => createMaterialFormState());
  const [serviceSaving, setServiceSaving] = React.useState(false);
  const [materialSaving, setMaterialSaving] = React.useState(false);
  const [serviceStatus, setServiceStatus] = React.useState('');
  const [serviceError, setServiceError] = React.useState('');
  const [materialStatus, setMaterialStatus] = React.useState('');
  const [materialError, setMaterialError] = React.useState('');

  const filteredServices = services.data.filter((service) =>
    [service?.title, service?.slug, service?.category, service?.shortDescription].join(' ').toLowerCase().includes(normalizeText(serviceSearch))
  );
  const filteredMaterials = materials.data.filter((material) =>
    [material?.name, material?.sku, material?.category, material?.supplier].join(' ').toLowerCase().includes(normalizeText(materialSearch))
  );

  React.useEffect(() => {
    if (isCreatingService) return;
    if (!filteredServices.length) {
      if (selectedServiceId) setSelectedServiceId('');
      return;
    }
    if (!filteredServices.some((service) => service.id === selectedServiceId)) {
      setSelectedServiceId(filteredServices[0].id);
    }
  }, [filteredServices, selectedServiceId, isCreatingService]);

  React.useEffect(() => {
    if (isCreatingMaterial) return;
    if (!filteredMaterials.length) {
      if (selectedMaterialId) setSelectedMaterialId('');
      return;
    }
    if (!filteredMaterials.some((material) => material.id === selectedMaterialId)) {
      setSelectedMaterialId(filteredMaterials[0].id);
    }
  }, [filteredMaterials, selectedMaterialId, isCreatingMaterial]);

  React.useEffect(() => {
    if (isCreatingService) return;
    const selectedService = services.data.find((service) => service.id === selectedServiceId);
    if (!selectedService) return;
    setServiceForm(serviceToFormState(selectedService));
  }, [selectedServiceId, services.data, isCreatingService]);

  React.useEffect(() => {
    if (isCreatingMaterial) return;
    const selectedMaterial = materials.data.find((material) => material.id === selectedMaterialId);
    if (!selectedMaterial) return;
    setMaterialForm(materialToFormState(selectedMaterial));
  }, [selectedMaterialId, materials.data, isCreatingMaterial]);

  const onServiceFieldChange = (key) => (event) => {
    const nextValue = event?.target?.type === 'checkbox' ? event.target.checked : event.target.value;
    setServiceForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  const onMaterialFieldChange = (key) => (event) => {
    const nextValue = event?.target?.type === 'checkbox' ? event.target.checked : event.target.value;
    setMaterialForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  const startNewService = () => {
    setIsCreatingService(true);
    setSelectedServiceId('');
    setServiceForm(createServiceFormState());
    setServiceStatus('');
    setServiceError('');
  };

  const startNewMaterial = () => {
    setIsCreatingMaterial(true);
    setSelectedMaterialId('');
    setMaterialForm(createMaterialFormState());
    setMaterialStatus('');
    setMaterialError('');
  };

  const selectService = (service) => {
    setIsCreatingService(false);
    setSelectedServiceId(service.id);
    setServiceForm(serviceToFormState(service));
    setServiceStatus('');
    setServiceError('');
  };

  const selectMaterial = (material) => {
    setIsCreatingMaterial(false);
    setSelectedMaterialId(material.id);
    setMaterialForm(materialToFormState(material));
    setMaterialStatus('');
    setMaterialError('');
  };

  const saveService = async (event) => {
    event.preventDefault();
    if (serviceSaving) return;

    setServiceSaving(true);
    setServiceStatus('');
    setServiceError('');

    try {
      const payload = {
        title: String(serviceForm.title || '').trim(),
        slug: toNullablePayload(serviceForm.slug),
        category: serviceForm.category,
        shortDescription: toNullablePayload(serviceForm.shortDescription),
        fullDescription: toNullablePayload(serviceForm.fullDescription),
        basePriceFrom: serviceForm.basePriceFrom === '' ? null : Number(serviceForm.basePriceFrom),
        heroImageUrl: toNullablePayload(serviceForm.heroImageUrl),
        displayOrder: toNumberPayload(serviceForm.displayOrder, 0),
        showOnWebsite: Boolean(serviceForm.showOnWebsite),
        isFeatured: Boolean(serviceForm.isFeatured),
        isActive: Boolean(serviceForm.isActive)
      };
      const savedService = selectedServiceId
        ? await v2Api.updateInventoryService(selectedServiceId, payload)
        : await v2Api.createInventoryService(payload);
      if (!savedService?.id) throw new Error('Service response missing payload');

      services.setData((prev) =>
        [...prev.filter((service) => service.id !== savedService.id), savedService]
          .sort((left, right) => (left.displayOrder || 0) - (right.displayOrder || 0) || String(left.title || '').localeCompare(String(right.title || '')))
      );
      setIsCreatingService(false);
      setSelectedServiceId(savedService.id);
      setServiceForm(serviceToFormState(savedService));
      setServiceStatus(selectedServiceId ? 'Service saved.' : 'Service created.');
    } catch (error) {
      setServiceError(error.message || 'Could not save service');
    } finally {
      setServiceSaving(false);
    }
  };

  const deleteService = async () => {
    if (!selectedServiceId || !canDelete || serviceSaving) return;

    setServiceSaving(true);
    setServiceStatus('');
    setServiceError('');
    try {
      await v2Api.deleteInventoryService(selectedServiceId);
      services.setData((prev) => prev.filter((service) => service.id !== selectedServiceId));
      setSelectedServiceId('');
      setIsCreatingService(true);
      setServiceForm(createServiceFormState());
      setServiceStatus('Service deleted.');
    } catch (error) {
      setServiceError(error.message || 'Could not delete service');
    } finally {
      setServiceSaving(false);
    }
  };

  const saveMaterial = async (event) => {
    event.preventDefault();
    if (materialSaving) return;

    setMaterialSaving(true);
    setMaterialStatus('');
    setMaterialError('');

    try {
      const payload = {
        name: String(materialForm.name || '').trim(),
        sku: toNullablePayload(materialForm.sku),
        category: materialForm.category,
        unit: String(materialForm.unit || 'pcs').trim() || 'pcs',
        stockQty: Number(materialForm.stockQty || 0),
        minStockQty: Number(materialForm.minStockQty || 0),
        unitCost: materialForm.unitCost === '' ? null : Number(materialForm.unitCost),
        supplier: toNullablePayload(materialForm.supplier),
        notes: toNullablePayload(materialForm.notes),
        isActive: Boolean(materialForm.isActive)
      };
      const savedMaterial = selectedMaterialId
        ? await v2Api.updateInventoryMaterial(selectedMaterialId, payload)
        : await v2Api.createInventoryMaterial(payload);
      if (!savedMaterial?.id) throw new Error('Material response missing payload');

      materials.setData((prev) =>
        [...prev.filter((material) => material.id !== savedMaterial.id), savedMaterial]
          .sort((left, right) => String(left.category || '').localeCompare(String(right.category || '')) || String(left.name || '').localeCompare(String(right.name || '')))
      );
      setIsCreatingMaterial(false);
      setSelectedMaterialId(savedMaterial.id);
      setMaterialForm(materialToFormState(savedMaterial));
      setMaterialStatus(selectedMaterialId ? 'Material saved.' : 'Material created.');
    } catch (error) {
      setMaterialError(error.message || 'Could not save material');
    } finally {
      setMaterialSaving(false);
    }
  };

  const deleteMaterial = async () => {
    if (!selectedMaterialId || !canDelete || materialSaving) return;

    setMaterialSaving(true);
    setMaterialStatus('');
    setMaterialError('');
    try {
      await v2Api.deleteInventoryMaterial(selectedMaterialId);
      materials.setData((prev) => prev.filter((material) => material.id !== selectedMaterialId));
      setSelectedMaterialId('');
      setIsCreatingMaterial(true);
      setMaterialForm(createMaterialFormState());
      setMaterialStatus('Material deleted.');
    } catch (error) {
      setMaterialError(error.message || 'Could not delete material');
    } finally {
      setMaterialSaving(false);
    }
  };

  return (
    <div className="grid-two">
      <Surface
        eyebrow="Inventory"
        title="Services"
        description="Create, tune and retire service catalogue rows directly in the rollout shell."
        actions={
          <div className="surface-actions cluster">
            <label className="inline-search">
              <span>Filter</span>
              <input value={serviceSearch} onChange={(event) => setServiceSearch(event.target.value)} placeholder="Search title, slug or category" />
            </label>
            <button type="button" className="button-secondary" onClick={startNewService}>
              New service
            </button>
          </div>
        }
      >
        {services.loading ? <p className="muted">Loading services...</p> : null}
        {services.error ? <p className="error">{services.error}</p> : null}
        {!services.loading && !services.error && !filteredServices.length ? <EmptyState text="No service inventory rows found." /> : null}
        <div className="stack-list">
          {filteredServices.map((service) => (
            <SelectableCard key={service.id} selected={!isCreatingService && service.id === selectedServiceId} onSelect={() => selectService(service)}>
              <article className="summary-row">
                <div>
                  <strong>{service.title}</strong>
                  <p>{service.category || 'Uncategorised'}</p>
                </div>
                <div className="summary-row-meta">
                  <span>{service.slug || 'No slug'}</span>
                  <StatusPill tone={service.showOnWebsite ? 'accent' : 'neutral'}>{service.showOnWebsite ? 'Live' : 'Hidden'}</StatusPill>
                </div>
              </article>
            </SelectableCard>
          ))}
        </div>

        <form className="editor-form" onSubmit={saveService}>
          <div className="form-grid">
            <label>
              Title
              <input value={serviceForm.title} onChange={onServiceFieldChange('title')} placeholder="Bathrooms Premium" required />
            </label>
            <label>
              Slug
              <input value={serviceForm.slug} onChange={onServiceFieldChange('slug')} placeholder="bathrooms-premium" />
            </label>
            <label>
              Category
              <select value={serviceForm.category} onChange={onServiceFieldChange('category')}>
                {SERVICE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {titleCase(category)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Base price from
              <input value={serviceForm.basePriceFrom} onChange={onServiceFieldChange('basePriceFrom')} type="number" min="0" step="0.01" />
            </label>
            <label>
              Display order
              <input value={serviceForm.displayOrder} onChange={onServiceFieldChange('displayOrder')} type="number" min="0" />
            </label>
            <label>
              Hero image URL
              <input value={serviceForm.heroImageUrl} onChange={onServiceFieldChange('heroImageUrl')} placeholder="/Gallery/premium/..." />
            </label>
          </div>
          <label>
            Short description
            <textarea value={serviceForm.shortDescription} onChange={onServiceFieldChange('shortDescription')} rows={3} placeholder="Short brochure-facing summary." />
          </label>
          <label>
            Full description
            <textarea value={serviceForm.fullDescription} onChange={onServiceFieldChange('fullDescription')} rows={4} placeholder="Longer internal/brochure copy." />
          </label>
          <div className="checkbox-row">
            <label>
              <input checked={serviceForm.showOnWebsite} onChange={onServiceFieldChange('showOnWebsite')} type="checkbox" />
              Show on website
            </label>
            <label>
              <input checked={serviceForm.isFeatured} onChange={onServiceFieldChange('isFeatured')} type="checkbox" />
              Featured service
            </label>
            <label>
              <input checked={serviceForm.isActive} onChange={onServiceFieldChange('isActive')} type="checkbox" />
              Active
            </label>
          </div>
          <div className="action-row">
            <button type="submit" disabled={serviceSaving}>
              {serviceSaving ? 'Saving...' : selectedServiceId ? 'Save service' : 'Create service'}
            </button>
            {canDelete && selectedServiceId ? (
              <button type="button" className="button-secondary" onClick={deleteService} disabled={serviceSaving}>
                Delete service
              </button>
            ) : null}
          </div>
          {serviceStatus ? <p className="muted">{serviceStatus}</p> : null}
          {serviceError ? <p className="error">{serviceError}</p> : null}
        </form>
      </Surface>

      <Surface
        eyebrow="Inventory"
        title="Materials"
        description="Create and maintain stock rows, thresholds and supplier details under the same v2 contract."
        actions={
          <div className="surface-actions cluster">
            <label className="inline-search">
              <span>Filter</span>
              <input value={materialSearch} onChange={(event) => setMaterialSearch(event.target.value)} placeholder="Search name, SKU or supplier" />
            </label>
            <button type="button" className="button-secondary" onClick={startNewMaterial}>
              New material
            </button>
          </div>
        }
      >
        {materials.loading ? <p className="muted">Loading materials...</p> : null}
        {materials.error ? <p className="error">{materials.error}</p> : null}
        {!materials.loading && !materials.error && !filteredMaterials.length ? <EmptyState text="No material records found." /> : null}
        <div className="stack-list">
          {filteredMaterials.map((material) => {
            const lowStock = Number(material?.stockQty || 0) <= Number(material?.minStockQty || 0);
            return (
              <SelectableCard key={material.id} selected={!isCreatingMaterial && material.id === selectedMaterialId} onSelect={() => selectMaterial(material)}>
                <article className="summary-row">
                  <div>
                    <strong>{material.name}</strong>
                    <p>SKU {material.sku || 'pending'}</p>
                  </div>
                  <div className="summary-row-meta">
                    <StatusPill tone={lowStock ? 'danger' : 'neutral'}>
                      {material.stockQty}/{material.minStockQty}
                    </StatusPill>
                    <span>{material.supplier || 'No supplier'}</span>
                  </div>
                </article>
              </SelectableCard>
            );
          })}
        </div>

        <form className="editor-form" onSubmit={saveMaterial}>
          <div className="form-grid">
            <label>
              Name
              <input value={materialForm.name} onChange={onMaterialFieldChange('name')} placeholder="Calacatta Slab" required />
            </label>
            <label>
              SKU
              <input value={materialForm.sku} onChange={onMaterialFieldChange('sku')} placeholder="MAR-001" />
            </label>
            <label>
              Category
              <select value={materialForm.category} onChange={onMaterialFieldChange('category')}>
                {MATERIAL_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {titleCase(category)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Unit
              <input value={materialForm.unit} onChange={onMaterialFieldChange('unit')} placeholder="pcs" />
            </label>
            <label>
              Stock quantity
              <input value={materialForm.stockQty} onChange={onMaterialFieldChange('stockQty')} type="number" step="0.01" />
            </label>
            <label>
              Minimum stock
              <input value={materialForm.minStockQty} onChange={onMaterialFieldChange('minStockQty')} type="number" step="0.01" />
            </label>
            <label>
              Unit cost
              <input value={materialForm.unitCost} onChange={onMaterialFieldChange('unitCost')} type="number" min="0" step="0.01" />
            </label>
            <label>
              Supplier
              <input value={materialForm.supplier} onChange={onMaterialFieldChange('supplier')} placeholder="Stone House" />
            </label>
          </div>
          <label>
            Notes
            <textarea value={materialForm.notes} onChange={onMaterialFieldChange('notes')} rows={4} placeholder="Delivery note or stock remark." />
          </label>
          <div className="checkbox-row">
            <label>
              <input checked={materialForm.isActive} onChange={onMaterialFieldChange('isActive')} type="checkbox" />
              Active
            </label>
          </div>
          <div className="action-row">
            <button type="submit" disabled={materialSaving}>
              {materialSaving ? 'Saving...' : selectedMaterialId ? 'Save material' : 'Create material'}
            </button>
            {canDelete && selectedMaterialId ? (
              <button type="button" className="button-secondary" onClick={deleteMaterial} disabled={materialSaving}>
                Delete material
              </button>
            ) : null}
          </div>
          {materialStatus ? <p className="muted">{materialStatus}</p> : null}
          {materialError ? <p className="error">{materialError}</p> : null}
        </form>
      </Surface>
    </div>
  );
}

function ServiceCataloguePage() {
  const services = useAsyncState(() => v2Api.getPublicServices(), [], []);

  return (
    <Surface eyebrow="Services" title="Public service catalogue" description="The brochure-facing service list already consumed through the v2 public contract.">
      {services.loading ? <p className="muted">Loading services...</p> : null}
      {services.error ? <p className="error">{services.error}</p> : null}
      {!services.loading && !services.error && !services.data.length ? <EmptyState text="No public services are available right now." /> : null}
      <div className="quick-link-grid">
        {services.data.map((service) => (
          <article key={service.id || service.slug || service.title} className="quick-link-card quick-link-card--static">
            <strong>{service.title}</strong>
            <span>{service.shortDescription || 'Service summary pending.'}</span>
            <small>{service.category || 'Brochure route'}</small>
          </article>
        ))}
      </div>
    </Surface>
  );
}

function WorkspaceLayout() {
  const { user, logout } = useAuth();
  const role = normalizeText(user?.role || 'client');

  return (
    <div className="layout-app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <p className="eyebrow">Rollout shell</p>
          <h1>{roleLabels[role] || 'Workspace'}</h1>
          <p>{roleDescriptions[role]}</p>
        </div>

        <div className="sidebar-account">
          <strong>{user?.name || user?.email}</strong>
          <span>{user?.email}</span>
          <StatusPill tone="accent">{titleCase(role)}</StatusPill>
        </div>

        <nav className="nav">
          <NavLink to="/overview" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`.trim()}>
            Overview
          </NavLink>
          <NavLink to="/account" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`.trim()}>
            Account
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`.trim()}>
            Projects
          </NavLink>
          <NavLink to="/quotes" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`.trim()}>
            Quotes
          </NavLink>
          <NavLink to="/private-inbox" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`.trim()}>
            Private Inbox
          </NavLink>
          <NavLink to="/messages" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`.trim()}>
            Project Chat
          </NavLink>
          <NavLink to="/notifications" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`.trim()}>
            Notifications
          </NavLink>
          <NavLink to="/services-catalogue" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`.trim()}>
            Services
          </NavLink>
          {isStaffRole(role) ? (
            <NavLink to="/crm" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`.trim()}>
              CRM
            </NavLink>
          ) : null}
          {isStaffRole(role) ? (
            <NavLink to="/inventory" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`.trim()}>
              Inventory
            </NavLink>
          ) : null}
        </nav>

        <button type="button" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/quotes" element={<QuotesPage />} />
          <Route path="/private-inbox" element={<PrivateInboxPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/services-catalogue" element={<ServiceCataloguePage />} />
          <Route path="/crm" element={isStaffRole(role) ? <CrmPage /> : <Navigate to="/overview" replace />} />
          <Route path="/inventory" element={isStaffRole(role) ? <InventoryPage /> : <Navigate to="/overview" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="state">Loading session...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
