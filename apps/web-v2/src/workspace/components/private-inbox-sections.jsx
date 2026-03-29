import {
  Surface,
  EmptyState,
  DirectThreadRow,
  MessageBubble,
  getDirectThreadTitle,
  getDirectThreadMeta
} from '../kit.jsx';

function PrivateInboxSidebarSurface({ sidebarPanel }) {
  const {
    search,
    setSearch,
    staffMode,
    startNewThread,
    directThreads,
    filteredThreads,
    user,
    selectedThreadId,
    onSelectThread
  } = sidebarPanel;

  return (
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
  );
}

function PrivateInboxConversationSurface({ conversationPanel }) {
  const {
    selectedThread,
    user,
    staffMode,
    canStartThread,
    recipientLabel,
    messageState,
    peopleDirectory,
    recipientEmail,
    setRecipientEmail,
    subject,
    setSubject,
    draft,
    setDraft,
    onSubmit,
    selectedFiles,
    setSelectedFiles,
    composerError,
    sending
  } = conversationPanel;

  return (
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
                  <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Private conversation subject" />
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
  );
}

function PrivateInboxPanels({ sidebarPanel, conversationPanel }) {
  return (
    <div className="messages-shell">
      <PrivateInboxSidebarSurface sidebarPanel={sidebarPanel} />
      <PrivateInboxConversationSurface conversationPanel={conversationPanel} />
    </div>
  );
}

export { PrivateInboxPanels };
