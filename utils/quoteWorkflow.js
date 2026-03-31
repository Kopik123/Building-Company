const QUOTE_WORKFLOW_STATUSES = [
  'new',
  'manager_review',
  'visit_proposed',
  'visit_reschedule_requested',
  'visit_confirmed',
  'first_view',
  'quote_requested',
  'client_review',
  'changes_requested',
  'accepted',
  'rejected',
  'archived'
];

const QUOTE_VISIT_STATUSES = [
  'not_scheduled',
  'proposed',
  'reschedule_requested',
  'confirmed',
  'completed'
];

const QUOTE_CLIENT_DECISION_STATUSES = ['pending', 'accepted', 'rejected', 'request_edit'];
const QUOTE_CLIENT_DECISION_STATUSES_NON_PENDING = QUOTE_CLIENT_DECISION_STATUSES.filter((value) => value !== 'pending');

/**
 * Maps the richer quote workflow fields back to the legacy `Quote.status` enum
 * so existing filters and screens keep working during the transition period.
 * - archived / rejected workflows map to `closed`
 * - quote sent / review / accepted style workflows map to `responded`
 * - assigned or visit / first-view workflows map to `in_progress`
 * - everything else remains `pending`
 */
const deriveLegacyQuoteStatus = ({ workflowStatus, assignedManagerId, archivedAt, clientDecisionStatus }) => {
  const normalizedWorkflowStatus = String(workflowStatus || '').trim().toLowerCase();
  const normalizedDecisionStatus = String(clientDecisionStatus || '').trim().toLowerCase();

  if (archivedAt || ['archived', 'rejected'].includes(normalizedWorkflowStatus) || normalizedDecisionStatus === 'rejected') {
    return 'closed';
  }

  if (
    ['quote_requested', 'client_review', 'changes_requested', 'accepted'].includes(normalizedWorkflowStatus)
    || ['accepted', 'request_edit'].includes(normalizedDecisionStatus)
  ) {
    return 'responded';
  }

  if (
    assignedManagerId
    || [
      'manager_review',
      'visit_proposed',
      'visit_reschedule_requested',
      'visit_confirmed',
      'first_view'
    ].includes(normalizedWorkflowStatus)
  ) {
    return 'in_progress';
  }

  return 'pending';
};

module.exports = {
  QUOTE_WORKFLOW_STATUSES,
  QUOTE_VISIT_STATUSES,
  QUOTE_CLIENT_DECISION_STATUSES,
  QUOTE_CLIENT_DECISION_STATUSES_NON_PENDING,
  deriveLegacyQuoteStatus
};
