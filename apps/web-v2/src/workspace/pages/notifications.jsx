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

export { NotificationsPage };
