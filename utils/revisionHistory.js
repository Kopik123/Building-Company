const crypto = require('crypto');

const MAX_REVISION_HISTORY = 40;

const normalizeRevisionHistory = (value) => (
  Array.isArray(value)
    ? value.filter((entry) => entry && typeof entry === 'object')
    : []
);

const appendRevisionEntry = (history, entry) => {
  const nextEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry
  };
  return [...normalizeRevisionHistory(history), nextEntry].slice(-MAX_REVISION_HISTORY);
};

const buildEstimateRevisionSnapshot = (estimate) => ({
  id: estimate.id || null,
  quoteId: estimate.quoteId || null,
  projectId: estimate.projectId || null,
  title: estimate.title || null,
  status: estimate.status || null,
  subtotal: estimate.subtotal ?? null,
  total: estimate.total ?? null,
  notes: estimate.notes || null,
  clientVisible: Boolean(estimate.clientVisible),
  sentToClientAt: estimate.sentToClientAt || null,
  revisionNumber: estimate.revisionNumber || 1,
  documentUrl: estimate.documentUrl || null,
  documentFilename: estimate.documentFilename || null
});

const buildQuoteRevisionSnapshot = (quote) => ({
  id: quote.id || null,
  workflowStatus: quote.workflowStatus || null,
  status: quote.status || null,
  siteVisitStatus: quote.siteVisitStatus || null,
  siteVisitDate: quote.siteVisitDate || null,
  siteVisitTimeWindow: quote.siteVisitTimeWindow || null,
  proposedStartDate: quote.proposedStartDate || null,
  scopeOfWork: quote.scopeOfWork || null,
  materialsPlan: quote.materialsPlan || null,
  labourEstimate: quote.labourEstimate || null,
  estimateDocumentUrl: quote.estimateDocumentUrl || null,
  clientDecisionStatus: quote.clientDecisionStatus || null,
  clientDecisionNotes: quote.clientDecisionNotes || null,
  clientReviewStartedAt: quote.clientReviewStartedAt || null,
  archivedAt: quote.archivedAt || null
});

const toPlainRevision = (entity) => (typeof entity?.toJSON === 'function' ? entity.toJSON() : { ...(entity || {}) });

const buildEstimateRevisionPayload = ({
  estimate,
  actor,
  changeType,
  note,
  changedFields = [],
  updates = {},
  incrementRevision = true
}) => {
  const current = toPlainRevision(estimate);
  const currentRevision = Math.max(1, Number(current.revisionNumber || 1));
  const nextRevisionNumber = incrementRevision ? currentRevision + 1 : currentRevision;
  const nextState = {
    ...current,
    ...updates,
    revisionNumber: nextRevisionNumber
  };

  return {
    ...updates,
    revisionNumber: nextRevisionNumber,
    revisionHistory: appendRevisionEntry(current.revisionHistory, {
      entity: 'estimate',
      changeType,
      changedById: actor?.id || null,
      changedByRole: actor?.role || null,
      note: note || null,
      changedFields,
      snapshot: buildEstimateRevisionSnapshot(nextState)
    })
  };
};

const buildQuoteRevisionPayload = ({ quote, actor, changeType, note, changedFields = [], updates = {} }) => {
  const current = typeof quote?.toJSON === 'function' ? quote.toJSON() : { ...(quote || {}) };
  const nextState = { ...current, ...updates };
  return {
    ...updates,
    revisionHistory: appendRevisionEntry(current.revisionHistory, {
      entity: 'quote',
      changeType,
      changedById: actor?.id || null,
      changedByRole: actor?.role || null,
      note: note || null,
      changedFields,
      snapshot: buildQuoteRevisionSnapshot(nextState)
    })
  };
};

module.exports = {
  MAX_REVISION_HISTORY,
  normalizeRevisionHistory,
  appendRevisionEntry,
  buildEstimateRevisionSnapshot,
  buildQuoteRevisionSnapshot,
  buildEstimateRevisionPayload,
  buildQuoteRevisionPayload
};
