import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import { v2Api } from '../../lib/api';
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

function MessagesPage() {
  const { user } = useAuth();
  const threads = useAsyncState(() => v2Api.getThreads(), [], []);
  const [selectedThreadId, setSelectedThreadId] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [draft, setDraft] = React.useState('');
  const [selectedFiles, setSelectedFiles] = React.useState([]);
  const [sending, setSending] = React.useState(false);
  const [composerError, setComposerError] = React.useState('');
  const [isSwitchingThread, startThreadTransition] = React.useTransition();
  const [messageState, setMessageState] = React.useState({
    threadId: '',
    thread: null,
    loading: false,
    error: '',
    messages: []
  });

  const deferredSearch = React.useDeferredValue(search);
  const filteredThreads = sortByRecent(threads.data, ['latestMessageAt', 'updatedAt', 'createdAt']).filter((thread) => {
    const needle = normalizeText(deferredSearch);
    if (!needle) return true;
    return [getThreadTitle(thread), getThreadPreview(thread), getThreadMeta(thread), thread?.project?.title, thread?.project?.location, thread?.quote?.projectType]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });

  React.useEffect(() => {
    if (!filteredThreads.length) {
      if (selectedThreadId) setSelectedThreadId('');
      return;
    }
    if (!filteredThreads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(filteredThreads[0].id);
    }
  }, [filteredThreads, selectedThreadId]);

  React.useEffect(() => {
    if (!selectedThreadId) {
      setMessageState({
        threadId: '',
        thread: null,
        loading: false,
        error: '',
        messages: []
      });
      return;
    }

    let active = true;
    setMessageState((prev) => ({
      ...prev,
      threadId: selectedThreadId,
      loading: true,
      error: ''
    }));

    v2Api
      .getThreadMessages(selectedThreadId)
      .then((payload) => {
        const nextSelectedThread = threads.data.find((thread) => thread.id === selectedThreadId) || null;
        if (!active) return;
        setMessageState({
          threadId: selectedThreadId,
          thread: payload.thread || nextSelectedThread,
          loading: false,
          error: '',
          messages: sortByRecent(payload.messages, ['createdAt']).reverse()
        });
      })
      .catch((error) => {
        const nextSelectedThread = threads.data.find((thread) => thread.id === selectedThreadId) || null;
        if (!active) return;
        setMessageState({
          threadId: selectedThreadId,
          thread: nextSelectedThread,
          loading: false,
          error: error.message || 'Could not load messages',
          messages: []
        });
      });

    return () => {
      active = false;
    };
  }, [selectedThreadId, threads.data]);

  const selectedThread = filteredThreads.find((thread) => thread.id === selectedThreadId) || messageState.thread;

  const onSelectThread = (threadId) => {
    startThreadTransition(() => {
      setSelectedThreadId(threadId);
      setComposerError('');
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!selectedThreadId || sending) return;

    const trimmedBody = String(draft || '').trim();
    if (!trimmedBody && !selectedFiles.length) {
      setComposerError('Write a message or attach at least one file.');
      return;
    }

    setSending(true);
    setComposerError('');

    try {
      const message = selectedFiles.length
        ? await v2Api.uploadThreadMessage(selectedThreadId, { body: trimmedBody, files: selectedFiles })
        : await v2Api.sendThreadMessage(selectedThreadId, trimmedBody);

      if (!message) throw new Error('Message response missing payload');

      setDraft('');
      setSelectedFiles([]);
      setMessageState((prev) => ({
        ...prev,
        error: '',
        messages: [...prev.messages, message]
      }));
      threads.setData((prev) => updateThreadAfterSend(prev, selectedThreadId, message));
    } catch (error) {
      setComposerError(error.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="messages-shell">
      <Surface
        eyebrow="Project chat"
        title="Threaded project communication"
        description="Group/project thread summaries, history and text/file send flow under the rollout shell."
        className="messages-sidebar-panel"
        actions={
          <label className="inline-search inline-search--wide">
            <span>Find thread</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search thread, project or location" />
          </label>
        }
      >
        {threads.loading ? <p className="muted">Loading thread summaries...</p> : null}
        {threads.error ? <p className="error">{threads.error}</p> : null}
        {!threads.loading && !threads.error && !filteredThreads.length ? <EmptyState text="No project threads are available yet." /> : null}
        <div className="thread-list">
          {filteredThreads.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} selected={thread.id === selectedThreadId} onSelect={() => onSelectThread(thread.id)} />
          ))}
        </div>
      </Surface>

      <Surface
        eyebrow="Conversation"
        title={selectedThread ? getThreadTitle(selectedThread) : 'Select a thread'}
        description={selectedThread ? getThreadMeta(selectedThread) || 'Open thread details and latest delivery context.' : 'Choose a thread from the left to load its messages.'}
        className="messages-thread-panel"
        actions={
          selectedThread ? (
            <div className="surface-actions cluster">
              <StatusPill tone="accent">{selectedThread.messageCount || 0} messages</StatusPill>
              {isSwitchingThread ? <span className="muted">Switching...</span> : null}
            </div>
          ) : null
        }
      >
        {!selectedThread ? <EmptyState text="No thread selected." /> : null}
        {selectedThread && messageState.loading ? <p className="muted">Loading messages...</p> : null}
        {selectedThread && messageState.error ? <p className="error">{messageState.error}</p> : null}
        {selectedThread && !messageState.loading && !messageState.error && !messageState.messages.length ? (
          <EmptyState text="This thread has no messages yet." />
        ) : null}
        {selectedThread ? (
          <>
            <div className="message-list">
              {messageState.messages.map((message) => (
                <MessageBubble key={message.id} message={message} currentUserId={user?.id} />
              ))}
            </div>
            <form className="composer" onSubmit={onSubmit}>
              <label>
                Message
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Write the next project update, question or handoff note."
                  rows={4}
                />
              </label>
              <div className="composer-actions">
                <label className="file-input">
                  <span>Attach files</span>
                  <input
                    type="file"
                    multiple
                    onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
                  />
                </label>
                <button type="submit" disabled={sending}>
                  {sending ? 'Sending...' : 'Send update'}
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
          </>
        ) : null}
      </Surface>
    </div>
  );
}

export { MessagesPage };
