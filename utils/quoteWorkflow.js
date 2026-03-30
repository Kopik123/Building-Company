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

const LEGACY_QUOTE_STATUSES = Object.freeze(['pending', 'in_progress', 'responded', 'closed']);
const LEGACY_TO_WORKFLOW_STATUS = Object.freeze({
  pending: 'submitted',
  in_progress: 'assigned',
  responded: 'estimate_sent',
  closed: 'closed_lost'
});

const WORKFLOW_TO_LEGACY_STATUS = Object.freeze({
  submitted: 'pending',
  triaged: 'pending',
  assigned: 'in_progress',
  awaiting_client_info: 'in_progress',
  estimate_in_progress: 'in_progress',
  estimate_sent: 'responded',
  client_review: 'responded',
  approved_ready_for_project: 'responded',
  converted_to_project: 'closed',
  closed_lost: 'closed'
});

const QUOTE_EVENT_VISIBILITIES = Object.freeze(['internal', 'client', 'public']);

const normalizeWorkflowStatus = (value, fallback = QUOTE_WORKFLOW_STATUSES[0]) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (QUOTE_WORKFLOW_STATUSES.includes(normalized)) return normalized;
  if (LEGACY_TO_WORKFLOW_STATUS[normalized]) return LEGACY_TO_WORKFLOW_STATUS[normalized];
  return fallback;
};

const normalizeLegacyQuoteStatus = (value, fallback = LEGACY_QUOTE_STATUSES[0]) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (LEGACY_QUOTE_STATUSES.includes(normalized)) return normalized;
  return WORKFLOW_TO_LEGACY_STATUS[normalizeWorkflowStatus(normalized)] || fallback;
};

const deriveLegacyQuoteStatus = (workflowStatus) =>
  WORKFLOW_TO_LEGACY_STATUS[normalizeWorkflowStatus(workflowStatus)] || LEGACY_QUOTE_STATUSES[0];

const normalizeEstimateDecisionStatus = (value, fallback = ESTIMATE_DECISION_STATUSES[0]) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (ESTIMATE_DECISION_STATUSES.includes(normalized)) return normalized;
  if (normalized === 'approved') return 'accepted';
  return fallback;
};

const normalizeEstimateStatus = (value, fallback = ESTIMATE_STATUSES[0]) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (ESTIMATE_STATUSES.includes(normalized)) return normalized;
  return fallback;
};

const buildQuoteProjectTitle = (quote, acceptedEstimate) => {
  const estimateTitle = String(acceptedEstimate?.title || '').trim();
  if (estimateTitle) return estimateTitle;

  const projectType = String(quote?.projectType || 'Project').trim();
  const place = String(quote?.postcode || quote?.location || '').trim();
  if (place) return `${projectType} - ${place}`;
  return projectType || 'Project';
};

const buildQuoteThreadName = (quote) => {
  const projectType = String(quote?.projectType || 'Quote').trim();
  const person = String(quote?.guestName || quote?.client?.name || quote?.client?.email || 'Client').trim();
  const place = String(quote?.postcode || quote?.location || '').trim();
  return [projectType, person, place ? `(${place})` : ''].filter(Boolean).join(' ').trim();
};

module.exports = {
  QUOTE_WORKFLOW_STATUSES,
  ESTIMATE_DECISION_STATUSES,
  ESTIMATE_STATUSES,
  LEGACY_QUOTE_STATUSES,
  QUOTE_EVENT_VISIBILITIES,
  normalizeWorkflowStatus,
  normalizeLegacyQuoteStatus,
  normalizeEstimateDecisionStatus,
  normalizeEstimateStatus,
  deriveLegacyQuoteStatus,
  buildQuoteProjectTitle,
  buildQuoteThreadName
};
