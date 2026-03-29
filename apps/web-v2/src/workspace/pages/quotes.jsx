import React from 'react';
import { useAuth } from '../../lib/auth.jsx';
import { v2Api } from '../../lib/api';
import { QuoteWorkspacePanels } from '../components/quotes-sections.jsx';
import { useQuoteWorkspaceState } from '../hooks/use-quote-workspace-state.js';
import {
  normalizeText,
  QUOTE_WORKFLOW_STATUSES,
  MAX_QUOTE_PHOTO_FILES,
  quoteToFormState,
  toNullablePayload,
  createEstimateFormState
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

  const onSubmit = async (event) => {
    event.preventDefault();
    if ((!selectedQuoteId && !isCreatingQuote) || saving) return;
    if (quoteFiles.length > MAX_QUOTE_PHOTO_FILES) {
      setActionError(`Attach up to ${MAX_QUOTE_PHOTO_FILES} photos per quote.`);
      return;
    }

    setSaving(true);
    setActionError('');
    setActionMessage('');

    try {
      const selectedQuoteFiles = [...quoteFiles];
      const payload = {
        projectType: form.projectType,
        location: String(form.location || '').trim(),
        description: String(form.description || '').trim(),
        priority: form.priority,
        contactMethod: form.contactMethod || null,
        postcode: toNullablePayload(form.postcode),
        budgetRange: toNullablePayload(form.budgetRange),
        contactPhone: toNullablePayload(form.contactPhone)
      };
      if (canManageQuotes) {
        Object.assign(payload, {
          status: form.status,
          clientId: form.clientId || null,
          assignedManagerId: form.assignedManagerId || null,
          guestName: toNullablePayload(form.guestName),
          guestEmail: toNullablePayload(form.guestEmail),
          guestPhone: toNullablePayload(form.guestPhone),
          contactEmail: toNullablePayload(form.contactEmail)
        });
      }
      let savedQuote = selectedQuoteId
        ? await v2Api.updateQuote(selectedQuoteId, payload)
        : await v2Api.createQuote(payload);
      if (!savedQuote?.id) throw new Error('Quote response missing payload');

      let uploadedPhotoCount = 0;
      if (selectedQuoteFiles.length) {
        try {
          const attachmentResult = await v2Api.uploadQuoteAttachments(savedQuote.id, { files: selectedQuoteFiles });
          if (attachmentResult?.quote?.id) {
            savedQuote = attachmentResult.quote;
          }
          uploadedPhotoCount = selectedQuoteFiles.length;
          setQuoteFiles([]);
        } catch (uploadError) {
          setActionError(`Quote saved, but photo upload failed: ${uploadError.message || 'Try again.'}`);
        }
      }

      upsertQuote(savedQuote);
      setIsCreatingQuote(false);
      setSelectedQuoteId(savedQuote.id);
      if (canManageQuotes) setForm(quoteToFormState(savedQuote));
      await loadQuoteWorkspace(savedQuote.id);
      setActionMessage(
        uploadedPhotoCount
          ? selectedQuoteId
            ? `Quote saved and ${uploadedPhotoCount} photo(s) uploaded.`
            : `Quote created with ${uploadedPhotoCount} photo(s).`
          : selectedQuoteId
            ? 'Quote saved.'
            : 'Quote created.'
      );
    } catch (error) {
      setActionError(error.message || 'Could not save quote');
    } finally {
      setSaving(false);
    }
  };

  const onTakeOwnership = async () => {
    if (!selectedQuote?.id || isSecondaryBusy) return;
    setSecondaryAction('take-ownership');
    setActionError('');
    setActionMessage('');
    try {
      const result = await v2Api.assignQuote(selectedQuote.id, {});
      upsertQuote(result.quote);
      await loadQuoteWorkspace(selectedQuote.id);
      setActionMessage('Quote ownership updated.');
    } catch (error) {
      setActionError(error.message || 'Could not take ownership of this quote');
    } finally {
      setSecondaryAction('');
    }
  };

  const onCreateEstimate = async (event) => {
    event.preventDefault();
    if (!selectedQuote?.id || isSecondaryBusy) return;

    setSecondaryAction('estimate-draft');
    setActionError('');
    setActionMessage('');
    try {
      await v2Api.createQuoteEstimate(selectedQuote.id, {
        title: String(estimateForm.title || '').trim(),
        total: toNullablePayload(estimateForm.total),
        description: toNullablePayload(estimateForm.description),
        notes: toNullablePayload(estimateForm.notes)
      });
      await loadQuoteWorkspace(selectedQuote.id);
      setEstimateForm((prev) =>
        createEstimateFormState({
          title: prev.title,
          description: prev.description || selectedQuote.description || ''
        })
      );
      setActionMessage('Estimate drafted.');
    } catch (error) {
      setActionError(error.message || 'Could not draft estimate');
    } finally {
      setSecondaryAction('');
    }
  };

  const onSendEstimate = async (estimateId) => {
    if (!selectedQuote?.id || !estimateId || isSecondaryBusy) return;

    setSecondaryAction('estimate-send');
    setActionError('');
    setActionMessage('');
    try {
      const result = await v2Api.sendQuoteEstimate(estimateId, {
        clientMessage: toNullablePayload(estimateForm.clientMessage)
      });
      upsertQuote(result.quote);
      await loadQuoteWorkspace(selectedQuote.id);
      setActionMessage('Estimate sent to client.');
    } catch (error) {
      setActionError(error.message || 'Could not send estimate');
    } finally {
      setSecondaryAction('');
    }
  };

  const onRespondToEstimate = async (decision) => {
    if (!currentEstimate?.id || isSecondaryBusy) return;

    setSecondaryAction('estimate-response');
    setActionError('');
    setActionMessage('');
    try {
      const result = await v2Api.respondToEstimate(currentEstimate.id, {
        decision,
        note: toNullablePayload(responseNote)
      });
      upsertQuote(result.quote);
      await loadQuoteWorkspace(selectedQuote.id);
      setResponseNote('');
      setActionMessage(`Estimate ${decision.replaceAll('_', ' ')}.`);
    } catch (error) {
      setActionError(error.message || 'Could not send estimate response');
    } finally {
      setSecondaryAction('');
    }
  };

  const onConvertToProject = async () => {
    if (!selectedQuote?.id || isSecondaryBusy) return;

    setSecondaryAction('quote-convert');
    setActionError('');
    setActionMessage('');
    try {
      const result = await v2Api.convertQuoteToProject(selectedQuote.id);
      upsertQuote(result.quote);
      await loadQuoteWorkspace(selectedQuote.id);
      setActionMessage(`Project created: ${result.project?.title || result.project?.id}.`);
    } catch (error) {
      setActionError(error.message || 'Could not convert quote into project');
    } finally {
      setSecondaryAction('');
    }
  };

  const onUploadFollowUpPhotos = async () => {
    if (!selectedQuote?.id || !followUpQuoteFiles.length || isSecondaryBusy) return;
    if (remainingQuotePhotoSlots <= 0) {
      setActionError(`This quote already has the maximum ${MAX_QUOTE_PHOTO_FILES} photos.`);
      return;
    }
    if (followUpQuoteFiles.length > remainingQuotePhotoSlots) {
      setActionError(`This quote can store up to ${MAX_QUOTE_PHOTO_FILES} photos. You can add ${remainingQuotePhotoSlots} more right now.`);
      return;
    }

    setSecondaryAction('follow-up-upload');
    setActionError('');
    setActionMessage('');
    try {
      const attachmentResult = await v2Api.uploadQuoteAttachments(selectedQuote.id, { files: followUpQuoteFiles });
      if (attachmentResult?.quote?.id) {
        upsertQuote(attachmentResult.quote);
      }
      await loadQuoteWorkspace(selectedQuote.id);
      setFollowUpQuoteFiles([]);
      setFollowUpUploadInputKey((value) => value + 1);
      setActionMessage(
        followUpQuoteFiles.length === 1
          ? 'Added 1 more quote photo.'
          : `Added ${followUpQuoteFiles.length} more quote photos.`
      );
    } catch (error) {
      setActionError(error.message || 'Could not upload additional quote photos');
    } finally {
      setSecondaryAction('');
    }
  };

  const quoteBoardPanel = {
    canCreateQuotes,
    search,
    setSearch,
    startNewQuote,
    quotes,
    filteredQuotes,
    isCreatingQuote,
    selectedQuoteId,
    selectQuote
  };

  const quoteDetailPanel = {
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
  };

  const quoteAttachmentsPanel = {
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
  };

  const quoteEstimatesPanel = {
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
    quoteWorkflowStatuses: QUOTE_WORKFLOW_STATUSES
  };

  const quoteTimelinePanel = {
    selectedQuote,
    isCreatingQuote,
    detailState
  };

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
