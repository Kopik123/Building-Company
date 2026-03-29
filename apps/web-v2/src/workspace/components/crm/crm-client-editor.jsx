import { CLIENT_LIFECYCLE_STATUSES, titleCase, formatDateTime } from '../../kit.jsx';

function CrmClientEditor({
  canEditPeople,
  selectedClient,
  onSaveClient,
  clientForm,
  onClientFieldChange,
  clientSaving,
  clientMessage,
  clientError
}) {
  if (!canEditPeople || !selectedClient) {
    return null;
  }

  return (
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
  );
}

export { CrmClientEditor };
