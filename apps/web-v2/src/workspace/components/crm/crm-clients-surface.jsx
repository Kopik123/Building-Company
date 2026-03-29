import {
  Surface,
  EmptyState,
  SelectableCard,
  StatusPill,
  CLIENT_LIFECYCLE_STATUSES,
  titleCase,
  formatDateTime,
  formatActivityTitle,
  formatActivityMessage,
  formatActivityMeta,
  getActivityTone
} from '../../kit.jsx';

function CrmClientsSurface({ clientsPanel }) {
  const {
    clients,
    filteredClients,
    selectedClientId,
    setSelectedClientId,
    canEditPeople,
    selectedClient,
    onSaveClient,
    clientForm,
    onClientFieldChange,
    clientSaving,
    clientMessage,
    clientError,
    clientActivity
  } = clientsPanel;

  return (
    <Surface eyebrow="CRM" title="Clients" description="Current client records exposed by the v2 CRM contract, with manager-side editing in the rollout shell.">
      {clients.loading ? <p className="muted">Loading clients...</p> : null}
      {clients.error ? <p className="error">{clients.error}</p> : null}
      {!clients.loading && !clients.error && !filteredClients.length ? <EmptyState text="No clients found." /> : null}
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
      {canEditPeople && selectedClient ? (
        <form className="editor-form" onSubmit={onSaveClient}>
          <div className="form-grid">
            <label>
              Client name
              <input value={clientForm.name} onChange={onClientFieldChange('name')} required />
            </label>
            <label>
              Client phone
              <input value={clientForm.phone} onChange={onClientFieldChange('phone')} placeholder="+44 ..." />
            </label>
            <label>
              Company name
              <input value={clientForm.companyName} onChange={onClientFieldChange('companyName')} placeholder="Client company" />
            </label>
            <label>
              CRM lifecycle
              <select value={clientForm.crmLifecycleStatus} onChange={onClientFieldChange('crmLifecycleStatus')}>
                {CLIENT_LIFECYCLE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {titleCase(status)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={Boolean(clientForm.isActive)} onChange={onClientFieldChange('isActive')} />
            <span>Client record is active</span>
          </label>
          <div className="meta-wrap">
            <span>Email: {selectedClient.email || 'No email available'}</span>
            <span>Lifecycle: {titleCase(selectedClient.crmLifecycleStatus || 'lead')}</span>
            <span>Updated: {formatDateTime(selectedClient.updatedAt || selectedClient.createdAt)}</span>
          </div>
          <div className="action-row">
            <button type="submit" disabled={clientSaving}>
              {clientSaving ? 'Saving...' : 'Save client'}
            </button>
          </div>
          {clientMessage ? <p className="muted">{clientMessage}</p> : null}
          {clientError ? <p className="error">{clientError}</p> : null}
        </form>
      ) : null}
      {canEditPeople && selectedClient ? (
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
      ) : null}
    </Surface>
  );
}

export { CrmClientsSurface };
