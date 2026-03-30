const { sortQuoteAttachments, toQuoteAttachmentSummary } = require('./quoteAttachments');

const DEFAULT_STAGED_WORKFLOW_STATUS = 'submitted';
const DEFAULT_STAGED_PRIORITY = 'medium';

const getNewQuoteIncludeClient = (User, attributes = ['id', 'name', 'email', 'phone', 'companyName']) => ([{
  model: User,
  as: 'client',
  attributes,
  required: false
}]);

const hasNewQuoteStore = (NewQuote, method = 'findAll') => typeof NewQuote?.[method] === 'function';

const loadStagedNewQuote = async (NewQuote, includeClient, id) => {
  if (!hasNewQuoteStore(NewQuote, 'findByPk')) return null;
  return NewQuote.findByPk(id, { include: includeClient });
};

const canAccessStagedNewQuote = (newQuote, user) => {
  if (!newQuote || !user) return false;
  const role = String(user.role || '').toLowerCase();
  if (role === 'client') return newQuote.clientId === user.id;
  return ['manager', 'admin', 'employee'].includes(role);
};

const matchesStagedQuoteFilters = (quote, filters = {}, options = {}) => {
  if (!quote) return false;

  const workflowStatus = String(options.workflowStatus || DEFAULT_STAGED_WORKFLOW_STATUS).trim().toLowerCase();
  const priority = String(options.priority || DEFAULT_STAGED_PRIORITY).trim().toLowerCase();

  if (filters.status && String(filters.status).trim().toLowerCase() !== 'pending') return false;
  if (filters.workflowStatus && String(filters.workflowStatus).trim().toLowerCase() !== workflowStatus) return false;
  if (filters.priority && String(filters.priority).trim().toLowerCase() !== priority) return false;
  if (filters.projectType && String(filters.projectType).trim().toLowerCase() !== String(quote.projectType || '').trim().toLowerCase()) {
    return false;
  }

  if (filters.q) {
    const needle = String(filters.q || '').trim().toLowerCase();
    const haystack = [
      quote.quoteRef,
      quote.referenceCode,
      quote.projectType,
      quote.location,
      quote.postcode,
      quote.client?.name,
      quote.client?.email,
      quote.guestName,
      quote.guestEmail,
      quote.budgetRange,
      quote.description
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!haystack.includes(needle)) return false;
  }

  return true;
};

const toLegacyQuoteSummary = (quote) => {
  const plain = typeof quote?.toJSON === 'function' ? quote.toJSON() : { ...(quote || {}) };
  const attachments = sortQuoteAttachments(Array.isArray(plain.attachments) ? plain.attachments : []).map(toQuoteAttachmentSummary);
  return {
    ...plain,
    attachments,
    attachmentCount: Number(plain.attachmentCount ?? attachments.length) || attachments.length
  };
};

module.exports = {
  DEFAULT_STAGED_PRIORITY,
  DEFAULT_STAGED_WORKFLOW_STATUS,
  canAccessStagedNewQuote,
  getNewQuoteIncludeClient,
  hasNewQuoteStore,
  loadStagedNewQuote,
  matchesStagedQuoteFilters,
  toLegacyQuoteSummary
};
