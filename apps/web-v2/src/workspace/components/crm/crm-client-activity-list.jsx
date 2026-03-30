import {
  EmptyState,
  StatusPill,
  titleCase,
  formatActivityTitle,
  formatActivityMessage,
  formatActivityMeta,
  getActivityTone
} from '../../kit.jsx';

function CrmClientActivityList({ canEditPeople, selectedClient, clientActivity }) {
  if (!canEditPeople || !selectedClient) {
    return null;
  }

  return (
    <div className="stack-list">
      <h3>Client activity</h3>
      {clientActivity.loading ? <p className="muted">Loading client activity...</p> : null}
      {clientActivity.error ? <p className="error">{clientActivity.error}</p> : null}
      {!clientActivity.loading && !clientActivity.error && !clientActivity.data.length ? (
        <EmptyState text="Client activity will appear here after the next quote, CRM or project event." />
      ) : null}
      {clientActivity.data.map((entry) => (
        <article key={entry.id} className="summary-row">
          <div>
            <strong>{formatActivityTitle(entry)}</strong>
            <p>{formatActivityMessage(entry)}</p>
          </div>
          <div className="summary-row-meta">
            <StatusPill tone={getActivityTone(entry)}>{titleCase(entry.entityType || 'activity')}</StatusPill>
            <span>{formatActivityMeta(entry)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export { CrmClientActivityList };
