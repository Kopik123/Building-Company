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
  deriveLegacyQuoteStatus
};
