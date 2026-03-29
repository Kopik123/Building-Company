import React from 'react';
import { useAuth } from '../../lib/auth.jsx';
import { v2Api } from '../../lib/api';
import { PrivateInboxPanels } from '../components/private-inbox-sections.jsx';
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
    <PrivateInboxPanels
      search={search}
      setSearch={setSearch}
      staffMode={staffMode}
      startNewThread={startNewThread}
      directThreads={directThreads}
      filteredThreads={filteredThreads}
      user={user}
      selectedThreadId={selectedThreadId}
      onSelectThread={onSelectThread}
      selectedThread={selectedThread}
      canStartThread={canStartThread}
      recipientLabel={recipientLabel}
      messageState={messageState}
      peopleDirectory={peopleDirectory}
      recipientEmail={recipientEmail}
      setRecipientEmail={setRecipientEmail}
      subject={subject}
      setSubject={setSubject}
      draft={draft}
      setDraft={setDraft}
      onSubmit={onSubmit}
      selectedFiles={selectedFiles}
      setSelectedFiles={setSelectedFiles}
      composerError={composerError}
      sending={sending}
    />
  );

}

export { PrivateInboxPage };
