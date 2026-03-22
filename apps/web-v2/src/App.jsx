import React from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { v2Api } from './lib/api';

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
        { to: '/messages', label: 'Inbox route', detail: 'Open project threads and keep delivery moving.', meta: `${threads.data.length} threads` },
        { to: '/quotes', label: 'Quote board', detail: 'Track pending and in-progress quote work.', meta: `${openQuotes.length} open` },
        { to: '/inventory', label: 'Stock watch', detail: 'Spot low-stock items before they block delivery.', meta: `${lowStockMaterials.length} flagged` }
      ]
    : [
        { to: '/projects', label: 'Projects', detail: 'Check progress, media counts and assigned manager routes.', meta: `${activeProjects.length} active` },
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
        <MetricCard label="Threads" value={threads.data.length} detail="Shared message routes across projects and quotes" />
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
            {threads.loading ? <p className="muted">Loading thread summaries...</p> : null}
            {threads.error ? <p className="error">{threads.error}</p> : null}
            {!threads.loading && !threads.error && !sortedThreads.length ? (
              <EmptyState text="Thread previews will appear here once the first project or quote route is created." />
            ) : null}
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
  const projects = useAsyncState(() => v2Api.getProjects(), [], []);
  const [search, setSearch] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);

  const filteredProjects = sortByRecent(projects.data, ['updatedAt', 'endDate', 'startDate', 'createdAt']).filter((project) => {
    const needle = normalizeText(deferredSearch);
    if (!needle) return true;
    return [project?.title, project?.location, project?.description, project?.status, project?.client?.email, project?.assignedManager?.email]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });

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

function QuotesPage() {
  const quotes = useAsyncState(() => v2Api.getQuotes(), [], []);

  return (
    <Surface eyebrow="Quotes" title="Quote board" description="Portable quote summaries from `api/v2`, shared between web and the future mobile app.">
      {quotes.loading ? <p className="muted">Loading quotes...</p> : null}
      {quotes.error ? <p className="error">{quotes.error}</p> : null}
      {!quotes.loading && !quotes.error && !quotes.data.length ? <EmptyState text="No quote routes are available right now." /> : null}
      <div className="stack-list">
        {sortByRecent(quotes.data, ['updatedAt', 'createdAt']).map((quote) => (
          <QuoteCard key={quote.id} quote={quote} />
        ))}
      </div>
    </Surface>
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
        if (!active) return;
        setMessageState({
          threadId: selectedThreadId,
          thread: payload.thread || filteredThreads.find((thread) => thread.id === selectedThreadId) || null,
          loading: false,
          error: '',
          messages: sortByRecent(payload.messages, ['createdAt']).reverse()
        });
      })
      .catch((error) => {
        if (!active) return;
        setMessageState({
          threadId: selectedThreadId,
          thread: filteredThreads.find((thread) => thread.id === selectedThreadId) || null,
          loading: false,
          error: error.message || 'Could not load messages',
          messages: []
        });
      });

    return () => {
      active = false;
    };
  }, [selectedThreadId, filteredThreads]);

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
        eyebrow="Inbox"
        title="Threaded project communication"
        description="The first real parity step after rollout: thread summaries, message history and text/file send flow now live in `web-v2`."
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
  const clients = useAsyncState(() => v2Api.getCrmClients(), [], []);
  const staff = useAsyncState(() => v2Api.getCrmStaff(), [], []);

  return (
    <div className="grid-two">
      <Surface eyebrow="CRM" title="Clients" description="Current client records exposed by the v2 CRM contract.">
        {clients.loading ? <p className="muted">Loading clients...</p> : null}
        {clients.error ? <p className="error">{clients.error}</p> : null}
        {!clients.loading && !clients.error && !clients.data.length ? <EmptyState text="No clients found." /> : null}
        <div className="stack-list">
          {clients.data.map((client) => (
            <article key={client.id} className="summary-row">
              <div>
                <strong>{client.name || 'Client'}</strong>
                <p>{client.email || 'No email available'}</p>
              </div>
              <div className="summary-row-meta">
                <span>{client.phone || 'No phone'}</span>
              </div>
            </article>
          ))}
        </div>
      </Surface>

      <Surface eyebrow="CRM" title="Staff" description="Employee, manager and admin profiles currently loaded.">
        {staff.loading ? <p className="muted">Loading staff...</p> : null}
        {staff.error ? <p className="error">{staff.error}</p> : null}
        {!staff.loading && !staff.error && !staff.data.length ? <EmptyState text="No staff records found." /> : null}
        <div className="stack-list">
          {staff.data.map((member) => (
            <article key={member.id} className="summary-row">
              <div>
                <strong>{member.name || 'Staff member'}</strong>
                <p>{member.email || 'No email available'}</p>
              </div>
              <div className="summary-row-meta">
                <StatusPill tone="accent">{titleCase(member.role || 'staff')}</StatusPill>
              </div>
            </article>
          ))}
        </div>
      </Surface>
    </div>
  );
}

function InventoryPage() {
  const services = useAsyncState(() => v2Api.getInventoryServices(), [], []);
  const materials = useAsyncState(() => v2Api.getInventoryMaterials(), [], []);

  return (
    <div className="grid-two">
      <Surface eyebrow="Inventory" title="Services" description="Inventory-side service catalogue rows.">
        {services.loading ? <p className="muted">Loading services...</p> : null}
        {services.error ? <p className="error">{services.error}</p> : null}
        {!services.loading && !services.error && !services.data.length ? <EmptyState text="No service inventory rows found." /> : null}
        <div className="stack-list">
          {services.data.map((service) => (
            <article key={service.id} className="summary-row">
              <div>
                <strong>{service.title}</strong>
                <p>{service.category || 'Uncategorised'}</p>
              </div>
              <div className="summary-row-meta">
                <span>{service.slug || 'No slug'}</span>
              </div>
            </article>
          ))}
        </div>
      </Surface>

      <Surface eyebrow="Inventory" title="Materials" description="Live stock figures with low-stock signals.">
        {materials.loading ? <p className="muted">Loading materials...</p> : null}
        {materials.error ? <p className="error">{materials.error}</p> : null}
        {!materials.loading && !materials.error && !materials.data.length ? <EmptyState text="No material records found." /> : null}
        <div className="stack-list">
          {materials.data.map((material) => {
            const lowStock = Number(material?.stockQty || 0) <= Number(material?.minStockQty || 0);
            return (
              <article key={material.id} className="summary-row">
                <div>
                  <strong>{material.name}</strong>
                  <p>SKU {material.sku || 'pending'}</p>
                </div>
                <div className="summary-row-meta">
                  <StatusPill tone={lowStock ? 'danger' : 'neutral'}>
                    {material.stockQty}/{material.minStockQty}
                  </StatusPill>
                </div>
              </article>
            );
          })}
        </div>
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
          <NavLink to="/messages" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`.trim()}>
            Inbox
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
