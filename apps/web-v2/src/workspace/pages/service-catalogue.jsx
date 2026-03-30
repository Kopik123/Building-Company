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

export { ServiceCataloguePage };
