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

module.exports = {
  MAX_REVISION_HISTORY,
  normalizeRevisionHistory,
  appendRevisionEntry,
  buildEstimateRevisionSnapshot,
  buildQuoteRevisionSnapshot
};
