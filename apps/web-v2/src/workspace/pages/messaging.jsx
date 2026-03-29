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
function PrivateInboxPage() {
  const { user } = useAuth();
  const role = normalizeText(user?.role || 'client');
  const staffMode = isStaffRole(role);
  const directThreads = useAsyncState(() => v2Api.getDirectThreads(), [], []);
  const projects = useAsyncState(() => (!staffMode ? v2Api.getProjects() : Promise.resolve([])), [staffMode], []);
  const quotes = useAsyncState(() => (!staffMode ? v2Api.getQuotes() : Promise.resolve([])), [staffMode], []);
  const clients = useAsyncState(() => (staffMode ? v2Api.getCrmClients() : Promise.resolve([])), [staffMode], []);
  const staff = useAsyncState(() => (staffMode ? v2Api.getCrmStaff() : Promise.resolve([])), [staffMode], []);
  const [selectedThreadId, setSelectedThreadId] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [draft, setDraft] = React.useState('');
  const [selectedFiles, setSelectedFiles] = React.useState([]);
  const [sending, setSending] = React.useState(false);
  const [composerError, setComposerError] = React.useState('');
  const [recipientEmail, setRecipientEmail] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [isCreatingNewThread, setIsCreatingNewThread] = React.useState(false);
  const [messageState, setMessageState] = React.useState({
    threadId: '',
    thread: null,
    loading: false,
    error: '',
    messages: []
  });

  const deferredSearch = React.useDeferredValue(search);
  const preferredManager =
    projects.data.map((project) => project?.assignedManager).find((manager) => manager?.id) ||
    quotes.data.map((quote) => quote?.assignedManager).find((manager) => manager?.id) ||
    null;

  const peopleDirectory = (() => {
    if (!staffMode) return preferredManager ? [preferredManager] : [];
    const seen = new Set();
    return [...clients.data, ...staff.data]
      .filter((person) => person?.id && person.id !== user?.id && person?.email)
      .filter((person) => {
        const key = normalizeText(person.email);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) =>
        String(left?.name || left?.email || '').localeCompare(String(right?.name || right?.email || ''))
      );
  })();

  const filteredThreads = sortByRecent(directThreads.data, ['latestMessageAt', 'updatedAt', 'createdAt']).filter((thread) => {
    const needle = normalizeText(deferredSearch);
    if (!needle) return true;
    return [getDirectThreadTitle(thread, user?.id), getDirectThreadPreview(thread), getDirectThreadMeta(thread), thread?.subject]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });

  React.useEffect(() => {
    if (isCreatingNewThread) return;
    if (!filteredThreads.length) {
      if (selectedThreadId) setSelectedThreadId('');
      return;
    }
    if (!filteredThreads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(filteredThreads[0].id);
    }
  }, [filteredThreads, selectedThreadId, isCreatingNewThread]);

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
      .getDirectThreadMessages(selectedThreadId)
      .then((payload) => {
        const nextSelectedThread = directThreads.data.find((thread) => thread.id === selectedThreadId) || null;
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
        const nextSelectedThread = directThreads.data.find((thread) => thread.id === selectedThreadId) || null;
        if (!active) return;
        setMessageState({
          threadId: selectedThreadId,
          thread: nextSelectedThread,
          loading: false,
          error: error.message || 'Could not load private messages',
          messages: []
        });
      });

    return () => {
      active = false;
    };
  }, [selectedThreadId, directThreads.data]);

  React.useEffect(() => {
    if (!selectedThreadId) return;
    const selectedThread = directThreads.data.find((thread) => thread.id === selectedThreadId);
    if (Number(selectedThread?.unreadCount || 0) <= 0) return;

    let active = true;
    v2Api
      .markDirectThreadRead(selectedThreadId)
      .then(() => {
        if (!active) return;
        directThreads.setData((prev) => prev.map((thread) => (thread.id === selectedThreadId ? { ...thread, unreadCount: 0 } : thread)));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [selectedThreadId, directThreads.data]);

  const selectedThread = filteredThreads.find((thread) => thread.id === selectedThreadId) || messageState.thread;
  const canStartThread = Boolean(staffMode ? peopleDirectory.length : preferredManager?.id);
  const recipientLabel = preferredManager?.name || preferredManager?.email || 'Assigned manager';

  const resetComposer = () => {
    setDraft('');
    setSelectedFiles([]);
    setComposerError('');
  };

  const resolveRecipient = () => {
    if (!staffMode) return preferredManager;
    return peopleDirectory.find((person) => normalizeText(person?.email) === normalizeText(recipientEmail)) || null;
  };

  const startNewThread = () => {
    setIsCreatingNewThread(true);
    setSelectedThreadId('');
    setSubject('');
    setRecipientEmail('');
    resetComposer();
  };

  const onSelectThread = (threadId) => {
    setIsCreatingNewThread(false);
    setSelectedThreadId(threadId);
    setComposerError('');
  };

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


export { PrivateInboxPage, MessagesPage };
