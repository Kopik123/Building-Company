import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import { v2Api } from '../../lib/api';
import { useQuoteWorkspaceState } from '../hooks/use-quote-workspace-state.js';
import {
  CLIENT_LIFECYCLE_STATUSES,
  ESTIMATE_DECISION_STATUSES,
  MATERIAL_CATEGORIES,
  QUOTE_CONTACT_METHODS,
  PROJECT_STATUSES,
  PROJECT_STAGES,
  QUOTE_PRIORITIES,
  QUOTE_PROJECT_TYPES,
  QUOTE_STATUSES,
  QUOTE_WORKFLOW_STATUSES,
  SERVICE_CATEGORIES,
  STAFF_CREATION_ROLES,
  STAFF_ROLES,
  roleLabels,
  roleDescriptions,
  activeProjectStatuses,
  openQuoteStatuses,
  MAX_QUOTE_PHOTO_FILES,
  FINAL_PROJECT_STAGE,
  createEmptyOverviewSummary,
  isStaffRole,
  normalizeText,
  titleCase,
  formatDateTime,
  formatActivityTitle,
  formatActivityMessage,
  formatActivityMeta,
  getActivityTone,
  compactNumber,
  getTimestamp,
  sortByRecent,
  getThreadTitle,
  getThreadMeta,
  getThreadPreview,
  getDirectCounterparty,
  getDirectThreadTitle,
  getDirectThreadPreview,
  getDirectThreadMeta,
  getNotificationTone,
  getPriorityTone,
  updateThreadAfterSend,
  updateDirectThreadAfterSend,
  toInputValue,
  createProjectFormState,
  projectToFormState,
  createQuoteFormState,
  quoteToFormState,
  createStaffFormState,
  createClientEditorState,
  clientToFormState,
  createStaffEditorState,
  staffToFormState,
  createServiceFormState,
  serviceToFormState,
  createMaterialFormState,
  materialToFormState,
  toNullablePayload,
  toNumberPayload,
  formatMoney,
  getNextProjectStage,
  getEstimateHistoryLabel,
  getEstimateCardSummary,
  getSelectedFileKey,
  mergeSelectedFiles,
  getRemainingQuotePhotoSlots,
  validateQuotePhotoSelection,
  createEstimateFormState,
  useAsyncState,
  Surface,
  MetricCard,
  EmptyState,
  StatusPill,
  QuickLinkCard,
  SelectableCard,
  ProjectCard,
  QuoteCard,
  EstimateCard,
  QuoteEventRow,
  ThreadRow,
  DirectThreadRow,
  MessageBubble,
  QuoteAttachmentList,
  NotificationRow
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
    staff,
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
    setDetailState,
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
      let savedQuote = selectedQuoteId ? await v2Api.updateQuote(selectedQuoteId, payload) : await v2Api.createQuote(payload);
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
      setEstimateForm((prev) => createEstimateFormState({
        title: prev.title,
        description: prev.description || selectedQuote.description || ''
      }));
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

  return (
    <div className="grid-two">
      <Surface
        eyebrow="Quotes"
        title="Quote board"
        description={
          canManageQuotes
            ? 'Lead intake, ownership, offers and project conversion now live in the rollout shell.'
            : canRespondToEstimates
              ? 'Track your requests, review offers and move approved work into project onboarding.'
              : 'Portable quote summaries from `api/v2`, shared between web and the future mobile app.'
        }
        actions={
          <div className="surface-actions cluster">
            <label className="inline-search">
              <span>Filter</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search quote, location or guest" />
            </label>
            {canCreateQuotes ? (
              <button type="button" className="button-secondary" onClick={startNewQuote}>
                New quote
              </button>
            ) : null}
          </div>
        }
      >
        {quotes.loading ? <p className="muted">Loading quotes...</p> : null}
        {quotes.error ? <p className="error">{quotes.error}</p> : null}
        {!quotes.loading && !quotes.error && !filteredQuotes.length ? <EmptyState text="No quote routes are available right now." /> : null}
        <div className="stack-list">
          {filteredQuotes.map((quote) => (
            <SelectableCard key={quote.id} selected={!isCreatingQuote && quote.id === selectedQuoteId} onSelect={() => selectQuote(quote)}>
              <QuoteCard quote={quote} />
            </SelectableCard>
          ))}
        </div>
      </Surface>

      <div className="page-stack">
        <Surface
          eyebrow="Quote detail"
          title={isCreatingQuote ? 'New quote' : selectedQuote?.projectType || 'Select a quote'}
          description={
            isCreatingQuote
              ? canManageQuotes
                ? 'Create an internal, guest or linked client quote directly in `web-v2`.'
                : 'Submit a new quote request from the authenticated client workspace.'
              : selectedQuote
                ? `Stage: ${titleCase(selectedQuote.workflowStatus || selectedQuote.status || 'submitted')}`
                : 'Select a quote to review its timeline, offers and next action.'
          }
        >
          {!selectedQuote && !isCreatingQuote ? <EmptyState text="No quote selected." /> : null}
          {detailState.loading && !isCreatingQuote ? <p className="muted">Loading quote workspace...</p> : null}
          {detailState.error && !isCreatingQuote ? <p className="error">{detailState.error}</p> : null}
          {(isCreatingQuote || canManageQuotes) && (selectedQuote || isCreatingQuote) ? (
            <form className="editor-form" onSubmit={onSubmit}>
              {selectedQuote && !isCreatingQuote ? <QuoteCard quote={selectedQuote} /> : null}
              <div className="form-grid">
                <label>
                  Project type
                  <select value={form.projectType} onChange={(event) => setForm((prev) => ({ ...prev, projectType: event.target.value }))}>
                    {QUOTE_PROJECT_TYPES.map((projectType) => (
                      <option key={projectType} value={projectType}>
                        {titleCase(projectType)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Location
                  <input value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} placeholder="Manchester" required />
                </label>
                {canManageQuotes ? (
                  <>
                    <label>
                      Client
                      <select value={form.clientId} onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value }))}>
                        <option value="">Guest / unlinked quote</option>
                        {clients.data.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name || client.email || client.id}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Assigned manager
                      <select value={form.assignedManagerId} onChange={(event) => setForm((prev) => ({ ...prev, assignedManagerId: event.target.value }))}>
                        <option value="">Unassigned</option>
                        {managerOptions.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name || member.email || member.id}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Quote status
                      <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
                        {QUOTE_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {titleCase(status)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Quote priority
                      <select value={form.priority} onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}>
                        {QUOTE_PRIORITIES.map((priority) => (
                          <option key={priority} value={priority}>
                            {titleCase(priority)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Guest name
                      <input value={form.guestName} onChange={(event) => setForm((prev) => ({ ...prev, guestName: event.target.value }))} placeholder="Guest or lead name" />
                    </label>
                    <label>
                      Guest email
                      <input value={form.guestEmail} onChange={(event) => setForm((prev) => ({ ...prev, guestEmail: event.target.value }))} type="email" placeholder="guest@example.com" />
                    </label>
                    <label>
                      Guest phone
                      <input value={form.guestPhone} onChange={(event) => setForm((prev) => ({ ...prev, guestPhone: event.target.value }))} placeholder="+44 ..." />
                    </label>
                  </>
                ) : null}
                <label>
                  Contact method
                  <select value={form.contactMethod} onChange={(event) => setForm((prev) => ({ ...prev, contactMethod: event.target.value }))}>
                    {QUOTE_CONTACT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {titleCase(method)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Postcode
                  <input value={form.postcode} onChange={(event) => setForm((prev) => ({ ...prev, postcode: event.target.value }))} placeholder="M20 2AB" />
                </label>
                <label>
                  Budget range
                  <input value={form.budgetRange} onChange={(event) => setForm((prev) => ({ ...prev, budgetRange: event.target.value }))} placeholder="40k-60k" />
                </label>
                {canManageQuotes ? (
                  <label>
                    Contact email
                    <input value={form.contactEmail} onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))} type="email" placeholder="contact@example.com" />
                  </label>
                ) : null}
                <label>
                  Contact phone
                  <input value={form.contactPhone} onChange={(event) => setForm((prev) => ({ ...prev, contactPhone: event.target.value }))} placeholder="+44 ..." />
                </label>
              </div>
              <label>
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Scope, intent and lead context for this quote."
                  rows={5}
                  required
                />
              </label>
              <label className="file-input">
                <span>Reference photos</span>
                <input type="file" accept="image/*" multiple onChange={onQuoteFilesChange} />
              </label>
              {quoteFiles.length ? (
                <div className="attachment-list">
                  {quoteFiles.map((file) => (
                    <span key={`${file.name}-${file.size}`} className="attachment-chip attachment-chip--muted">
                      {file.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted">Optional: attach up to {MAX_QUOTE_PHOTO_FILES} reference photos.</p>
              )}
              {selectedQuote && !isCreatingQuote ? (
                <div className="meta-wrap">
                  <span>Workflow: {titleCase(selectedQuote.workflowStatus || 'submitted')}</span>
                  <span>Client: {selectedQuote.client?.email || 'Guest quote'}</span>
                  <span>Assigned manager: {selectedQuote.assignedManager?.email || 'Unassigned'}</span>
                  <span>Photos: {selectedQuote.attachmentCount || 0}</span>
                  <span>Created: {formatDateTime(selectedQuote.createdAt)}</span>
                </div>
              ) : null}
              {clients.loading || staff.loading ? <p className="muted">Loading linked CRM people...</p> : null}
              <div className="action-row">
                <button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : selectedQuoteId ? 'Save quote' : 'Create quote'}
                </button>
                {canManageQuotes && selectedQuote && !isCreatingQuote ? (
                  <button type="button" className="button-secondary" onClick={onTakeOwnership} disabled={isSecondaryBusy}>
                    {isBusyAction('take-ownership') ? 'Updating...' : 'Take ownership'}
                  </button>
                ) : null}
                {canManageQuotes && selectedQuote?.canConvertToProject ? (
                  <button type="button" className="button-secondary" onClick={onConvertToProject} disabled={isSecondaryBusy}>
                    {isBusyAction('quote-convert') ? 'Converting...' : 'Convert to project'}
                  </button>
                ) : null}
              </div>
            </form>
          ) : null}
          {selectedQuote && !isCreatingQuote && !canManageQuotes ? (
            <div className="stack-list">
              <QuoteCard quote={selectedQuote} />
              <div className="meta-wrap">
                <span>Workflow: {titleCase(selectedQuote.workflowStatus || 'submitted')}</span>
                <span>Source: {titleCase(selectedQuote.sourceChannel || 'portal')}</span>
                <span>Photos: {selectedQuote.attachmentCount || 0}</span>
                <span>Current estimate: {currentEstimate ? `v${currentEstimate.versionNumber || 1}` : 'Not sent yet'}</span>
                <span>Assigned manager: {selectedQuote.assignedManager?.name || selectedQuote.assignedManager?.email || 'Pending assignment'}</span>
              </div>
            </div>
          ) : null}
          {actionMessage ? <p className="muted">{actionMessage}</p> : null}
          {actionError ? <p className="error">{actionError}</p> : null}
        </Surface>

        {selectedQuote && !isCreatingQuote ? (
          <Surface
            eyebrow="Attachments"
            title="Quote photos"
            description={
              canManageQuotes
                ? 'Reference images attached by the client or operations team for this quote.'
                : 'Reference images attached to your quote request.'
            }
          >
            <QuoteAttachmentList attachments={selectedQuote.attachments} />
            {!canManageQuotes ? (
              <div className="editor-form">
                <label className="file-input">
                  <span>Add more reference photos</span>
                  <input key={followUpUploadInputKey} type="file" accept="image/*" multiple onChange={onFollowUpQuoteFilesChange} />
                </label>
                <p className="muted">
                  {remainingQuotePhotoSlots > 0
                    ? `This quote currently stores ${selectedQuote.attachmentCount || 0} of ${MAX_QUOTE_PHOTO_FILES} photos. You can add ${remainingQuotePhotoSlots} more.`
                    : `This quote already stores the maximum ${MAX_QUOTE_PHOTO_FILES} photos.`}
                </p>
                {followUpQuoteFiles.length ? (
                  <div className="attachment-list">
                    {followUpQuoteFiles.map((file) => (
                      <span key={getSelectedFileKey(file)} className="attachment-chip attachment-chip--muted">
                        {file.name}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="action-row">
                  <button type="button" onClick={onUploadFollowUpPhotos} disabled={!followUpQuoteFiles.length || isSecondaryBusy || remainingQuotePhotoSlots <= 0}>
                    {isBusyAction('follow-up-upload') ? 'Uploading...' : 'Upload more photos'}
                  </button>
                </div>
              </div>
            ) : null}
          </Surface>
        ) : null}

        {selectedQuote && !isCreatingQuote ? (
          <Surface
            eyebrow="Estimates"
            title="Offers and approvals"
            description={
              canManageQuotes
                ? 'Draft, send and promote the current offer into a live project once the client accepts.'
                : 'Review the latest commercial offer and send your decision back to the team.'
            }
          >
            {!detailState.estimates.length ? <EmptyState text="No estimates attached to this quote yet." /> : null}
            <div className="stack-list">
              {detailState.estimates.map((estimate) => (
                <EstimateCard
                  key={estimate.id}
                  estimate={estimate}
                  actions={
                    canManageQuotes && normalizeText(estimate.status) === 'draft' && estimate.isCurrentVersion ? (
                      <button type="button" className="button-secondary" onClick={() => onSendEstimate(estimate.id)} disabled={isSecondaryBusy}>
                        Send to client
                      </button>
                    ) : null
                  }
                />
              ))}
            </div>

            {canManageQuotes ? (
              <form className="editor-form" onSubmit={onCreateEstimate}>
                {currentEstimate ? (
                  <p className="muted">
                    Drafting a new estimate version will move {`v${currentEstimate.versionNumber || 1}`} into version history and keep only the new version actionable for the client.
                  </p>
                ) : null}
                <div className="form-grid">
                  <label>
                    Estimate title
                    <input value={estimateForm.title} onChange={(event) => setEstimateForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Bathroom renovation offer" required />
                  </label>
                  <label>
                    Estimate total
                    <input value={estimateForm.total} onChange={(event) => setEstimateForm((prev) => ({ ...prev, total: event.target.value }))} placeholder="12500" type="number" min="0" step="0.01" />
                  </label>
                  <label>
                    Client message
                    <input value={estimateForm.clientMessage} onChange={(event) => setEstimateForm((prev) => ({ ...prev, clientMessage: event.target.value }))} placeholder="What the client should know before review." />
                  </label>
                  <label>
                    Current workflow
                    <select value={selectedQuote.workflowStatus || QUOTE_WORKFLOW_STATUSES[0]} disabled>
                      {QUOTE_WORKFLOW_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {titleCase(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Estimate scope summary
                  <textarea
                    value={estimateForm.description}
                    onChange={(event) => setEstimateForm((prev) => ({ ...prev, description: event.target.value }))}
                    rows={4}
                    placeholder="Headline scope and commercial framing for this estimate."
                  />
                </label>
                <label>
                  Internal notes
                  <textarea
                    value={estimateForm.notes}
                    onChange={(event) => setEstimateForm((prev) => ({ ...prev, notes: event.target.value }))}
                    rows={3}
                    placeholder="Internal notes for the sales and delivery team."
                  />
                </label>
                <div className="action-row">
                  <button type="submit" disabled={isSecondaryBusy}>
                    {isBusyAction('estimate-draft') ? 'Saving...' : currentEstimate ? 'Draft new version' : 'Draft estimate'}
                  </button>
                  {selectedQuote.canConvertToProject ? (
                    <button type="button" className="button-secondary" onClick={onConvertToProject} disabled={isSecondaryBusy}>
                      Convert to project
                    </button>
                  ) : null}
                </div>
              </form>
            ) : null}

            {canRespondToEstimates && currentEstimate ? (
              <div className="editor-form">
                <div className="meta-wrap">
                  <span>Current offer: {currentEstimate.title || 'Estimate'}</span>
                  <span>Version: v{currentEstimate.versionNumber || 1}</span>
                  <span>Status: {titleCase(currentEstimate.status || 'draft')}</span>
                  <span>Decision: {titleCase(currentEstimate.decisionStatus || ESTIMATE_DECISION_STATUSES[0])}</span>
                  <span>Total: {formatMoney(currentEstimate.total)}</span>
                </div>
                {currentEstimate.clientMessage ? <p className="muted">Manager note: {currentEstimate.clientMessage}</p> : null}
                {currentEstimate.decisionNote ? <p className="muted">Latest decision note: {currentEstimate.decisionNote}</p> : null}
                <label>
                  Response note
                  <textarea
                    value={responseNote}
                    onChange={(event) => setResponseNote(event.target.value)}
                    rows={3}
                    placeholder="Questions, revision requests or approval note."
                  />
                </label>
                <div className="action-row">
                  <button type="button" onClick={() => onRespondToEstimate('accepted')} disabled={!clientEstimateNeedsDecision || isSecondaryBusy}>
                    Accept estimate
                  </button>
                  <button type="button" className="button-secondary" onClick={() => onRespondToEstimate('revision_requested')} disabled={!clientEstimateNeedsDecision || isSecondaryBusy}>
                    Request revision
                  </button>
                  <button type="button" className="button-secondary" onClick={() => onRespondToEstimate('declined')} disabled={!clientEstimateNeedsDecision || isSecondaryBusy}>
                    Decline estimate
                  </button>
                </div>
              </div>
            ) : null}
          </Surface>
        ) : null}

        {selectedQuote && !isCreatingQuote ? (
          <Surface
            eyebrow="Timeline"
            title="Quote activity"
            description={
              canManageQuotes
                ? 'Every intake, assignment, offer and conversion event for the current quote.'
                : 'A client-visible timeline of what happened next.'
            }
          >
            {!detailState.events.length ? <EmptyState text="No quote events have been recorded yet." /> : null}
            <div className="stack-list">
              {detailState.events.map((event) => (
                <QuoteEventRow key={event.id} event={event} />
              ))}
            </div>
          </Surface>
        ) : null}
      </div>
    </div>
  );
}

export { QuotesPage };
