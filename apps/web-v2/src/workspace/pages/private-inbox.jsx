import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import { v2Api } from '../../lib/api';
import { usePrivateInboxWorkspaceState } from '../hooks/use-private-inbox-workspace-state.js';
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

function PrivateInboxPage() {
  const { user } = useAuth();
  const {
    staffMode,
    directThreads,
    projects,
    quotes,
    clients,
    staff,
    selectedThreadId,
    setSelectedThreadId,
    search,
    setSearch,
    draft,
    setDraft,
    selectedFiles,
    setSelectedFiles,
    sending,
    setSending,
    composerError,
    setComposerError,
    recipientEmail,
    setRecipientEmail,
    subject,
    setSubject,
    isCreatingNewThread,
    setIsCreatingNewThread,
    messageState,
    setMessageState,
    preferredManager,
    peopleDirectory,
    filteredThreads,
    selectedThread,
    canStartThread,
    recipientLabel,
    resetComposer,
    resolveRecipient,
    startNewThread,
    onSelectThread
  } = usePrivateInboxWorkspaceState({ user });

  const onSubmit = async (event) => {
    event.preventDefault();
    if (sending) return;

    const trimmedBody = String(draft || '').trim();
    if (!trimmedBody && !selectedFiles.length) {
      setComposerError('Write a message or attach at least one file.');
      return;
    }

    setSending(true);
    setComposerError('');

    try {
      let threadId = selectedThreadId;
      let nextMessage = null;
      let nextThread = selectedThread;

      if (!threadId) {
        const recipient = resolveRecipient();
        if (!recipient?.id) {
          throw new Error(staffMode ? 'Choose an existing client or staff email first.' : 'No assigned manager is available for a private route yet.');
        }

        const threadSubject = String(subject || '').trim() || `Private conversation - ${recipient.name || recipient.email}`;
        const created = await v2Api.createDirectThread({
          recipientUserId: recipient.id,
          subject: threadSubject,
          body: selectedFiles.length ? '' : trimmedBody,
          createOnly: selectedFiles.length > 0
        });

        if (!created.thread?.id) {
          throw new Error('Private thread response missing thread payload');
        }

        threadId = created.thread.id;
        nextThread = created.thread;
        nextMessage = created.message || null;
        directThreads.setData((prev) =>
          sortByRecent([created.thread, ...prev.filter((thread) => thread.id !== created.thread.id)], ['latestMessageAt', 'updatedAt', 'createdAt'])
        );
      }

      if (selectedFiles.length) {
        nextMessage = await v2Api.uploadDirectThreadMessage(threadId, { body: trimmedBody, files: selectedFiles });
      } else if (selectedThreadId) {
        nextMessage = await v2Api.sendDirectThreadMessage(threadId, trimmedBody);
      }

      if (!nextMessage) {
        throw new Error('Private message response missing payload');
      }

      setIsCreatingNewThread(false);
      setSelectedThreadId(threadId);
      setRecipientEmail('');
      setSubject('');
      resetComposer();
      setMessageState((prev) => ({
        ...prev,
        threadId,
        thread: nextThread || prev.thread,
        error: '',
        loading: false,
        messages: selectedThreadId ? [...prev.messages, nextMessage] : [nextMessage]
      }));
      directThreads.setData((prev) => updateDirectThreadAfterSend(prev, threadId, nextMessage));
    } catch (error) {
      setComposerError(error.message || 'Could not send private message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="messages-shell">
      <Surface
        eyebrow="Private inbox"
        title="Direct conversation routes"
        description="Private client and staff messaging now runs through `api/v2` instead of staying trapped in the legacy inbox route."
        className="messages-sidebar-panel"
        actions={
          <div className="surface-actions cluster">
            <label className="inline-search inline-search--wide">
              <span>Find thread</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search person or subject" />
            </label>
            {staffMode ? (
              <button type="button" className="button-secondary" onClick={startNewThread}>
                New thread
              </button>
            ) : null}
          </div>
        }
      >
        {directThreads.loading ? <p className="muted">Loading private threads...</p> : null}
        {directThreads.error ? <p className="error">{directThreads.error}</p> : null}
        {!directThreads.loading && !directThreads.error && !filteredThreads.length ? (
          <EmptyState text={staffMode ? 'No private threads yet. Start one from the composer.' : 'No direct manager thread yet.'} />
        ) : null}
        <div className="thread-list">
          {filteredThreads.map((thread) => (
            <DirectThreadRow
              key={thread.id}
              thread={thread}
              currentUserId={user?.id}
              selected={thread.id === selectedThreadId}
              onSelect={() => onSelectThread(thread.id)}
            />
          ))}
        </div>
      </Surface>

      <Surface
        eyebrow="Conversation"
        title={selectedThread ? getDirectThreadTitle(selectedThread, user?.id) : 'Start private route'}
        description={
          selectedThread
            ? getDirectThreadMeta(selectedThread) || 'Open the thread and continue the private route.'
            : staffMode
              ? 'Pick an existing person and write the opening message.'
              : canStartThread
                ? `Your private route will open with ${recipientLabel}.`
                : 'A direct route becomes available once a manager is assigned.'
        }
        className="messages-thread-panel"
      >
        {!selectedThread && !canStartThread ? <EmptyState text="No private route can be opened yet." /> : null}
        {selectedThread && messageState.loading ? <p className="muted">Loading private messages...</p> : null}
        {selectedThread && messageState.error ? <p className="error">{messageState.error}</p> : null}
        {selectedThread && !messageState.loading && !messageState.error && !messageState.messages.length ? (
          <EmptyState text="This private thread has no messages yet." />
        ) : null}
        {selectedThread ? (
          <div className="message-list">
            {messageState.messages.map((message) => (
              <MessageBubble key={message.id} message={message} currentUserId={user?.id} />
            ))}
          </div>
        ) : null}

        {canStartThread ? (
          <form className="composer" onSubmit={onSubmit}>
            {!selectedThread ? (
              <>
                {staffMode ? (
                  <label>
                    Recipient email
                    <input
                      value={recipientEmail}
                      onChange={(event) => setRecipientEmail(event.target.value)}
                      list="private-inbox-people"
                      placeholder="Choose an existing client or staff email"
                    />
                    <datalist id="private-inbox-people">
                      {peopleDirectory.map((person) => (
                        <option key={person.id} value={person.email}>
                          {person.name || person.email}
                        </option>
                      ))}
                    </datalist>
                  </label>
                ) : (
                  <p className="muted">Recipient: {recipientLabel}</p>
                )}
                {staffMode ? (
                  <label>
                    Subject
                    <input
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      placeholder="Private conversation subject"
                    />
                  </label>
                ) : null}
              </>
            ) : null}

            <label>
              Message
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={selectedThread ? 'Write the next private update or decision.' : 'Write the opening private message.'}
                rows={4}
              />
            </label>
            <div className="composer-actions">
              <label className="file-input">
                <span>Attach files</span>
                <input type="file" multiple onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))} />
              </label>
              <button type="submit" disabled={sending}>
                {sending ? 'Sending...' : selectedThread ? 'Send private update' : 'Open private route'}
              </button>
            </div>
            {selectedFiles.length ? (
              <div className="attachment-list">
                {selectedFiles.map((file) => (
                  <span key={`${file.name}-${file.size}`} className="attachment-chip attachment-chip--muted">
                    {file.name}
                  </span>
                ))}
              </div>
            ) : null}
            {composerError ? <p className="error">{composerError}</p> : null}
          </form>
        ) : null}
      </Surface>
    </div>
  );
}

export { PrivateInboxPage };
