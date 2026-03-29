/**
 * @typedef {Object} QuoteWorkspacePanels
 * @property {Object} quoteBoardPanel
 * @property {Object} quoteDetailPanel
 * @property {Object} quoteAttachmentsPanel
 * @property {Object} quoteEstimatesPanel
 * @property {Object} quoteTimelinePanel
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
