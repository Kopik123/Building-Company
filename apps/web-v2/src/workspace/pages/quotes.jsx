import React from 'react';
import { useAuth } from '../../lib/auth.jsx';
import { QuoteWorkspacePanels } from '../components/quotes-sections.jsx';
import { useQuoteWorkspaceState } from '../hooks/use-quote-workspace-state.js';
import { useQuoteWorkspaceActions } from '../hooks/use-quote-workspace-actions.js';
import { buildQuoteWorkspacePanels } from '../view-models/quote-panels.js';
import {
  normalizeText,
  QUOTE_WORKFLOW_STATUSES
} from '../kit.jsx';

function QuotesPage() {
  const { user } = useAuth();
  const role = normalizeText(user?.role || 'client');
  const canManageQuotes = ['manager', 'admin'].includes(role);
  const canCreateQuotes = canManageQuotes || role === 'client';
  const canRespondToEstimates = role === 'client';
  const {
    quotes,
    clients,
    search,
    setSearch,
    selectedQuoteId,
    setSelectedQuoteId,
    isCreatingQuote,
    setIsCreatingQuote,
    saving,
    setSaving,
    secondaryAction,
    setSecondaryAction,
    isSecondaryBusy,
    isBusyAction,
    actionError,
    setActionError,
    actionMessage,
    setActionMessage,
    form,
    setForm,
    quoteFiles,
    setQuoteFiles,
    followUpQuoteFiles,
    setFollowUpQuoteFiles,
    followUpUploadInputKey,
    setFollowUpUploadInputKey,
    estimateForm,
    setEstimateForm,
    responseNote,
    setResponseNote,
    detailState,
    managerOptions,
    filteredQuotes,
    selectedQuote,
    remainingQuotePhotoSlots,
    currentEstimate,
    clientEstimateNeedsDecision,
    upsertQuote,
    onQuoteFilesChange,
    onFollowUpQuoteFilesChange,
    loadQuoteWorkspace,
    startNewQuote,
    selectQuote
  } = useQuoteWorkspaceState({ user, canManageQuotes, canRespondToEstimates });

  const {
    onSubmit,
    onTakeOwnership,
    onCreateEstimate,
    onSendEstimate,
    onRespondToEstimate,
    onConvertToProject,
    onUploadFollowUpPhotos
  } = useQuoteWorkspaceActions({
    canManageQuotes,
    selectedQuoteId,
    isCreatingQuote,
    saving,
    quoteFiles,
    setSaving,
    setActionError,
    setActionMessage,
    form,
    upsertQuote,
    setQuoteFiles,
    setIsCreatingQuote,
    setSelectedQuoteId,
    setForm,
    loadQuoteWorkspace,
    selectedQuote,
    isSecondaryBusy,
    setSecondaryAction,
    estimateForm,
    setEstimateForm,
    currentEstimate,
    responseNote,
    setResponseNote,
    followUpQuoteFiles,
    remainingQuotePhotoSlots,
    setFollowUpQuoteFiles,
    setFollowUpUploadInputKey
  });

  const {
    quoteBoardPanel,
    quoteDetailPanel,
    quoteAttachmentsPanel,
    quoteEstimatesPanel,
    quoteTimelinePanel
  } = buildQuoteWorkspacePanels({
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
    quoteWorkflowStatuses: QUOTE_WORKFLOW_STATUSES
  });

  return (
    <QuoteWorkspacePanels
      quoteBoardPanel={quoteBoardPanel}
      quoteDetailPanel={quoteDetailPanel}
      quoteAttachmentsPanel={quoteAttachmentsPanel}
      quoteEstimatesPanel={quoteEstimatesPanel}
      quoteTimelinePanel={quoteTimelinePanel}
    />
  );
}

export { QuotesPage };
