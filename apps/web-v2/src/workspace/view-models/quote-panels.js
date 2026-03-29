/**
 * @typedef {Object} QuoteBoardPanel
 * @property {boolean} canCreateQuotes
 * @property {string} search
 * @property {Function} setSearch
 * @property {Function} startNewQuote
 * @property {Object} quotes
 * @property {Array<Object>} filteredQuotes
 * @property {boolean} isCreatingQuote
 * @property {string | null} selectedQuoteId
 * @property {Function} selectQuote
 */

/**
 * @typedef {Object} QuoteDetailPanel
 * @property {boolean} canManageQuotes
 * @property {boolean} isCreatingQuote
 * @property {Object | null} selectedQuote
 * @property {Object} detailState
 * @property {Object} form
 * @property {Function} setForm
 * @property {Array<Object>} clients
 * @property {Array<Object>} managerOptions
 * @property {Function} onSubmit
 * @property {Array<File>} quoteFiles
 * @property {Function} onQuoteFilesChange
 * @property {boolean} saving
 * @property {boolean} isSecondaryBusy
 * @property {string} actionMessage
 * @property {string} actionError
 * @property {Function} onTakeOwnership
 * @property {Function} onConvertToProject
 * @property {Function} isBusyAction
 * @property {string | null} selectedQuoteId
 * @property {Object | null} currentEstimate
 */

/**
 * @typedef {Object} QuoteAttachmentsPanel
 * @property {boolean} canManageQuotes
 * @property {Object | null} selectedQuote
 * @property {boolean} isCreatingQuote
 * @property {string | number} followUpUploadInputKey
 * @property {Function} onFollowUpQuoteFilesChange
 * @property {number} remainingQuotePhotoSlots
 * @property {Array<File>} followUpQuoteFiles
 * @property {Function} onUploadFollowUpPhotos
 * @property {boolean} isSecondaryBusy
 * @property {Function} isBusyAction
 */

/**
 * @typedef {Object} QuoteEstimatesPanel
 * @property {Object | null} selectedQuote
 * @property {boolean} isCreatingQuote
 * @property {boolean} canManageQuotes
 * @property {Object} detailState
 * @property {Object | null} currentEstimate
 * @property {Object} estimateForm
 * @property {Function} setEstimateForm
 * @property {Function} onCreateEstimate
 * @property {Function} onSendEstimate
 * @property {Function} onConvertToProject
 * @property {boolean} isSecondaryBusy
 * @property {Function} isBusyAction
 * @property {boolean} canRespondToEstimates
 * @property {string} responseNote
 * @property {Function} setResponseNote
 * @property {boolean} clientEstimateNeedsDecision
 * @property {Function} onRespondToEstimate
 * @property {Array<string>} quoteWorkflowStatuses
 */

/**
 * @typedef {Object} QuoteTimelinePanel
 * @property {Object | null} selectedQuote
 * @property {boolean} isCreatingQuote
 * @property {Object} detailState
 */

/**
 * @typedef {Object} QuoteWorkspacePanels
 * @property {QuoteBoardPanel} quoteBoardPanel
 * @property {QuoteDetailPanel} quoteDetailPanel
 * @property {QuoteAttachmentsPanel} quoteAttachmentsPanel
 * @property {QuoteEstimatesPanel} quoteEstimatesPanel
 * @property {QuoteTimelinePanel} quoteTimelinePanel
 */

/**
 * @param {Object} config
 * @returns {QuoteWorkspacePanels}
 */
function buildQuoteWorkspacePanels({
  canCreateQuotes,
  search,
  setSearch,
  startNewQuote,
  quotes,
  filteredQuotes,
  isCreatingQuote,
  selectedQuoteId,
  selectQuote,
  canManageQuotes,
  selectedQuote,
  detailState,
  form,
  setForm,
  clients,
  managerOptions,
  onSubmit,
  quoteFiles,
  onQuoteFilesChange,
  saving,
  isSecondaryBusy,
  actionMessage,
  actionError,
  onTakeOwnership,
  onConvertToProject,
  isBusyAction,
  currentEstimate,
  followUpUploadInputKey,
  onFollowUpQuoteFilesChange,
  remainingQuotePhotoSlots,
  followUpQuoteFiles,
  onUploadFollowUpPhotos,
  estimateForm,
  setEstimateForm,
  onCreateEstimate,
  onSendEstimate,
  canRespondToEstimates,
  responseNote,
  setResponseNote,
  clientEstimateNeedsDecision,
  onRespondToEstimate,
  quoteWorkflowStatuses
}) {
  return {
    quoteBoardPanel: {
      canCreateQuotes,
      search,
      setSearch,
      startNewQuote,
      quotes,
      filteredQuotes,
      isCreatingQuote,
      selectedQuoteId,
      selectQuote
    },
    quoteDetailPanel: {
      canManageQuotes,
      isCreatingQuote,
      selectedQuote,
      detailState,
      form,
      setForm,
      clients,
      managerOptions,
      onSubmit,
      quoteFiles,
      onQuoteFilesChange,
      saving,
      isSecondaryBusy,
      actionMessage,
      actionError,
      onTakeOwnership,
      onConvertToProject,
      isBusyAction,
      selectedQuoteId,
      currentEstimate
    },
    quoteAttachmentsPanel: {
      canManageQuotes,
      selectedQuote,
      isCreatingQuote,
      followUpUploadInputKey,
      onFollowUpQuoteFilesChange,
      remainingQuotePhotoSlots,
      followUpQuoteFiles,
      onUploadFollowUpPhotos,
      isSecondaryBusy,
      isBusyAction
    },
    quoteEstimatesPanel: {
      selectedQuote,
      isCreatingQuote,
      canManageQuotes,
      detailState,
      currentEstimate,
      estimateForm,
      setEstimateForm,
      onCreateEstimate,
      onSendEstimate,
      onConvertToProject,
      isSecondaryBusy,
      isBusyAction,
      canRespondToEstimates,
      responseNote,
      setResponseNote,
      clientEstimateNeedsDecision,
      onRespondToEstimate,
      quoteWorkflowStatuses
    },
    quoteTimelinePanel: {
      selectedQuote,
      isCreatingQuote,
      detailState
    }
  };
}

export { buildQuoteWorkspacePanels };
