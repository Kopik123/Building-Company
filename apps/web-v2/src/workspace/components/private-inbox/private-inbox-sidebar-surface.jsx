import { Surface, EmptyState, DirectThreadRow } from '../../kit.jsx';

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

export { PrivateInboxSidebarSurface };
