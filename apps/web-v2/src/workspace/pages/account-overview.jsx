import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import { v2Api } from '../../lib/api';
import {
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
} from '../kit.jsx';
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
  const overview = useAsyncState(() => v2Api.getOverview(), [role], createEmptyOverviewSummary());
  const activity = useAsyncState(() => (staffMode ? v2Api.getActivity({ pageSize: 6 }) : Promise.resolve([])), [staffMode], []);
  const overviewData = overview.data || createEmptyOverviewSummary();
  const metrics = overviewData.metrics || createEmptyOverviewSummary().metrics;
  const sortedProjects = sortByRecent(overviewData.projects, ['updatedAt', 'endDate', 'startDate', 'createdAt']);
  const sortedThreads = sortByRecent(overviewData.threads, ['latestMessageAt', 'updatedAt', 'createdAt']);
  const sortedDirectThreads = sortByRecent(overviewData.directThreads, ['latestMessageAt', 'updatedAt', 'createdAt']);
  const sortedNotifications = sortByRecent(overviewData.notifications, ['createdAt', 'updatedAt']);
  const lowStockMaterials = Array.isArray(overviewData.lowStockMaterials) ? overviewData.lowStockMaterials : [];
  const publicServices = Array.isArray(overviewData.publicServices) ? overviewData.publicServices : [];

  const quickLinks = staffMode
    ? [
        { to: '/projects', label: 'Project flow', detail: 'Review live jobs, ownership and media counts.', meta: `${metrics.activeProjectCount} active` },
        { to: '/private-inbox', label: 'Private inbox', detail: 'Run one-to-one client and staff communication routes.', meta: `${metrics.directThreadCount} private` },
        { to: '/messages', label: 'Project chat', detail: 'Open project threads and keep delivery moving.', meta: `${metrics.projectThreadCount} threads` },
        { to: '/quotes', label: 'Quote board', detail: 'Track pending and in-progress quote work.', meta: `${metrics.openQuoteCount} open` },
        { to: '/inventory', label: 'Stock watch', detail: 'Spot low-stock items before they block delivery.', meta: `${metrics.lowStockMaterialCount} flagged` }
      ]
    : [
        { to: '/projects', label: 'Projects', detail: 'Check progress, media counts and assigned manager routes.', meta: `${metrics.activeProjectCount} active` },
        { to: '/private-inbox', label: 'Direct manager', detail: 'Keep the private route open with your assigned manager.', meta: `${metrics.directThreadCount} threads` },
        { to: '/messages', label: 'Project chat', detail: 'Open the shared route for delivery questions and updates.', meta: `${metrics.projectThreadCount} threads` },
        { to: '/quotes', label: 'Quote follow-up', detail: 'Track active quote requests and priorities.', meta: `${metrics.openQuoteCount} open` },
        { to: '/notifications', label: 'Alerts', detail: 'Clear unread notifications without losing the project thread.', meta: `${metrics.unreadNotificationCount} unread` }
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
        <MetricCard label="Projects" value={metrics.projectCount} detail={`${metrics.activeProjectCount} active routes`} tone="accent" />
        <MetricCard label="Quotes" value={metrics.quoteCount} detail={`${metrics.openQuoteCount} open requests`} />
        <MetricCard
          label="Inbox routes"
          value={metrics.projectThreadCount + metrics.directThreadCount}
          detail={`${metrics.directThreadCount} private / ${metrics.projectThreadCount} project`}
        />
        <MetricCard label="Unread alerts" value={metrics.unreadNotificationCount} detail="Notifications still waiting for acknowledgement" tone="danger" />
        {staffMode ? <MetricCard label="Clients" value={metrics.clientCount} detail={`${metrics.staffCount} staff profiles loaded`} /> : null}
        {staffMode ? (
          <MetricCard label="Low stock" value={metrics.lowStockMaterialCount} detail="Materials at or below minimum stock" tone="danger" />
        ) : (
          <MetricCard label="Service routes" value={metrics.publicServiceCount} detail="Current brochure catalogue contract" />
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
            {overview.loading ? <p className="muted">Loading project routes...</p> : null}
            {overview.error ? <p className="error">{overview.error}</p> : null}
            {!overview.loading && !overview.error && !sortedProjects.length ? (
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
            {overview.loading ? <p className="muted">Loading thread summaries...</p> : null}
            {overview.error ? <p className="error">{overview.error}</p> : null}
            {!overview.loading && !overview.error && !sortedThreads.length && !sortedDirectThreads.length ? (
              <EmptyState text="Thread previews will appear here once the first project or quote route is created." />
            ) : null}
            {sortedDirectThreads.slice(0, 2).map((thread) => (
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
            {overview.loading ? <p className="muted">Loading quotes...</p> : null}
            {overview.error ? <p className="error">{overview.error}</p> : null}
            {!overview.loading && !overview.error && !overviewData.quotes.length ? <EmptyState text="No quotes are currently linked to this workspace." /> : null}
            {sortByRecent(overviewData.quotes, ['updatedAt', 'createdAt']).slice(0, 3).map((quote) => (
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
            {overview.loading ? <p className="muted">Loading notifications...</p> : null}
            {overview.error ? <p className="error">{overview.error}</p> : null}
            {!overview.loading && !overview.error && !sortedNotifications.length ? (
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
              <MetricCard label="Clients" value={overviewData.crm?.clientCount || 0} detail="Active CRM client records" />
              <MetricCard label="Staff" value={overviewData.crm?.staffCount || 0} detail="Employee, manager and admin profiles" />
            </div>
          </Surface>

          <Surface eyebrow="Activity" title="Company feed" description="Durable project, quote and CRM events from the current workflow." actions={<Link to="/projects">Open projects</Link>}>
            <div className="stack-list">
              {activity.loading ? <p className="muted">Loading activity feed...</p> : null}
              {activity.error ? <p className="error">{activity.error}</p> : null}
              {!activity.loading && !activity.error && !activity.data.length ? <EmptyState text="Activity will appear here once the next operational change is saved." /> : null}
              {activity.data.map((entry) => (
                <article key={entry.id} className="summary-row">
                  <div>
                    <strong>{formatActivityTitle(entry)}</strong>
                    <p>{formatActivityMessage(entry)}</p>
                  </div>
                  <div className="summary-row-meta">
                    <StatusPill tone={getActivityTone(entry)}>{titleCase(entry.entityType || 'activity')}</StatusPill>
                    <span>{formatActivityMeta(entry)}</span>
                  </div>
                </article>
              ))}
            </div>
          </Surface>
        </div>
      ) : null}

      {staffMode ? (
        <div className="grid-two">
          <Surface eyebrow="Inventory" title="Stock watch" description="Quick signal for material levels that need follow-up." actions={<Link to="/inventory">Open inventory</Link>}>
            <div className="stack-list">
              {overview.loading ? <p className="muted">Loading stock levels...</p> : null}
              {overview.error ? <p className="error">{overview.error}</p> : null}
              {!overview.loading && !overview.error && !lowStockMaterials.length ? <EmptyState text="No low-stock materials right now." /> : null}
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
            {publicServices.slice(0, 4).map((service) => (
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


export { AccountPage, OverviewPage };
