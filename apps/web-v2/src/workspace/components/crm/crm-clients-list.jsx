import { EmptyState, SelectableCard } from '../../kit.jsx';

function CrmClientsList({ clients, filteredClients, selectedClientId, setSelectedClientId }) {
  if (clients.loading) {
    return <p className="muted">Loading clients...</p>;
  }

  if (clients.error) {
    return <p className="error">{clients.error}</p>;
  }

  if (!filteredClients.length) {
    return <EmptyState text="No clients found." />;
  }

  return (
    <div className="stack-list">
      {filteredClients.map((client) => (
        <SelectableCard key={client.id} selected={client.id === selectedClientId} onSelect={() => setSelectedClientId(client.id)}>
          <article className="summary-row">
            <div>
              <strong>{client.name || 'Client'}</strong>
              <p>{client.email || 'No email available'}</p>
            </div>
            <div className="summary-row-meta">
              <span>{client.phone || 'No phone'}</span>
              {client.companyName ? <span>{client.companyName}</span> : null}
            </div>
          </article>
        </SelectableCard>
      ))}
    </div>
  );
}

export { CrmClientsList };
