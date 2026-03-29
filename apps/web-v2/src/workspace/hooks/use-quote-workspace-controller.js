import { useAuth } from '../../lib/auth.jsx';
import { QUOTE_WORKFLOW_STATUSES, normalizeText } from '../kit.jsx';
import { useQuoteWorkspaceState } from './use-quote-workspace-state.js';
import { useQuoteWorkspaceActions } from './use-quote-workspace-actions.js';
import { buildQuoteWorkspacePanels } from '../view-models/quote-panels.js';

/**
 * @returns {import('../view-models/quote-panels.js').QuoteWorkspacePanels}
 */
function useQuoteWorkspaceController() {
  const { user } = useAuth();
  const role = normalizeText(user?.role || 'client');
  const canManageQuotes = ['manager', 'admin'].includes(role);
  const canCreateQuotes = canManageQuotes || role === 'client';
  const canRespondToEstimates = role === 'client';

  const state = useQuoteWorkspaceState({ user, canManageQuotes, canRespondToEstimates });
  const actions = useQuoteWorkspaceActions({
    canManageQuotes,
    selectedQuoteId: state.selectedQuoteId,
    isCreatingQuote: state.isCreatingQuote,
    saving: state.saving,
    quoteFiles: state.quoteFiles,
    setSaving: state.setSaving,
    setActionError: state.setActionError,
    setActionMessage: state.setActionMessage,
    form: state.form,
    upsertQuote: state.upsertQuote,
    setQuoteFiles: state.setQuoteFiles,
    setIsCreatingQuote: state.setIsCreatingQuote,
    setSelectedQuoteId: state.setSelectedQuoteId,
    setForm: state.setForm,
    loadQuoteWorkspace: state.loadQuoteWorkspace,
    selectedQuote: state.selectedQuote,
    isSecondaryBusy: state.isSecondaryBusy,
    setSecondaryAction: state.setSecondaryAction,
    estimateForm: state.estimateForm,
    setEstimateForm: state.setEstimateForm,
    currentEstimate: state.currentEstimate,
    responseNote: state.responseNote,
    setResponseNote: state.setResponseNote,
    followUpQuoteFiles: state.followUpQuoteFiles,
    remainingQuotePhotoSlots: state.remainingQuotePhotoSlots,
    setFollowUpQuoteFiles: state.setFollowUpQuoteFiles,
    setFollowUpUploadInputKey: state.setFollowUpUploadInputKey
  });

  return buildQuoteWorkspacePanels({
    canCreateQuotes,
    search: state.search,
    setSearch: state.setSearch,
    startNewQuote: state.startNewQuote,
    quotes: state.quotes,
    filteredQuotes: state.filteredQuotes,
    isCreatingQuote: state.isCreatingQuote,
    selectedQuoteId: state.selectedQuoteId,
    selectQuote: state.selectQuote,
    canManageQuotes,
    selectedQuote: state.selectedQuote,
    detailState: state.detailState,
    form: state.form,
    setForm: state.setForm,
    clients: state.clients,
    managerOptions: state.managerOptions,
    onSubmit: actions.onSubmit,
    quoteFiles: state.quoteFiles,
    onQuoteFilesChange: state.onQuoteFilesChange,
    saving: state.saving,
    isSecondaryBusy: state.isSecondaryBusy,
    actionMessage: state.actionMessage,
    actionError: state.actionError,
    onTakeOwnership: actions.onTakeOwnership,
    onConvertToProject: actions.onConvertToProject,
    isBusyAction: state.isBusyAction,
    currentEstimate: state.currentEstimate,
    followUpUploadInputKey: state.followUpUploadInputKey,
    onFollowUpQuoteFilesChange: state.onFollowUpQuoteFilesChange,
    remainingQuotePhotoSlots: state.remainingQuotePhotoSlots,
    followUpQuoteFiles: state.followUpQuoteFiles,
    onUploadFollowUpPhotos: actions.onUploadFollowUpPhotos,
    estimateForm: state.estimateForm,
    setEstimateForm: state.setEstimateForm,
    onCreateEstimate: actions.onCreateEstimate,
    onSendEstimate: actions.onSendEstimate,
    canRespondToEstimates,
    responseNote: state.responseNote,
    setResponseNote: state.setResponseNote,
    clientEstimateNeedsDecision: state.clientEstimateNeedsDecision,
    onRespondToEstimate: actions.onRespondToEstimate,
    quoteWorkflowStatuses: QUOTE_WORKFLOW_STATUSES
  });
}

export { useQuoteWorkspaceController };
