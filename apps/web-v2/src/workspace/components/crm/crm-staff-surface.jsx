import { Surface, EmptyState, SelectableCard, StatusPill, STAFF_ROLES, titleCase, formatDateTime } from '../../kit.jsx';

function CrmStaffSurface({ staffPanel }) {
  const {
    staff,
    filteredStaff,
    selectedStaffId,
    setSelectedStaffId,
    canEditPeople,
    selectedStaff,
    onSaveStaff,
    staffEditorForm,
    onStaffEditorFieldChange,
    role,
    staffSaving,
    staffMessage,
    staffError
  } = staffPanel;

  return (
    <Surface eyebrow="CRM" title="Staff" description="Employee, manager and admin profiles currently loaded, with manager/admin patch flows in `web-v2`.">
      {staff.loading ? <p className="muted">Loading staff...</p> : null}
      {staff.error ? <p className="error">{staff.error}</p> : null}
      {!staff.loading && !staff.error && !filteredStaff.length ? <EmptyState text="No staff records found." /> : null}
      <div className="stack-list">
        {filteredStaff.map((member) => (
          <SelectableCard key={member.id} selected={member.id === selectedStaffId} onSelect={() => setSelectedStaffId(member.id)}>
            <article className="summary-row">
              <div>
                <strong>{member.name || 'Staff member'}</strong>
                <p>{member.email || 'No email available'}</p>
              </div>
              <div className="summary-row-meta">
                <StatusPill tone="accent">{titleCase(member.role || 'staff')}</StatusPill>
                <span>{member.phone || 'No phone'}</span>
              </div>
            </article>
          </SelectableCard>
        ))}
      </div>
      {canEditPeople && selectedStaff ? (
        <form className="editor-form" onSubmit={onSaveStaff}>
          <div className="form-grid">
            <label>
              Update staff name
              <input value={staffEditorForm.name} onChange={onStaffEditorFieldChange('name')} required />
            </label>
            <label>
              Update staff phone
              <input value={staffEditorForm.phone} onChange={onStaffEditorFieldChange('phone')} placeholder="+44 ..." />
            </label>
            <label>
              Update staff role
              <select value={staffEditorForm.role} onChange={onStaffEditorFieldChange('role')} disabled={role !== 'admin'}>
                {STAFF_ROLES.map((staffRole) => (
                  <option key={staffRole} value={staffRole}>
                    {titleCase(staffRole)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={Boolean(staffEditorForm.isActive)} onChange={onStaffEditorFieldChange('isActive')} />
            <span>Staff record is active</span>
          </label>
          <div className="meta-wrap">
            <span>Email: {selectedStaff.email || 'No email available'}</span>
            <span>Updated: {formatDateTime(selectedStaff.updatedAt || selectedStaff.createdAt)}</span>
          </div>
          <div className="action-row">
            <button type="submit" disabled={staffSaving}>
              {staffSaving ? 'Saving...' : 'Save staff record'}
            </button>
          </div>
          {staffMessage ? <p className="muted">{staffMessage}</p> : null}
          {staffError ? <p className="error">{staffError}</p> : null}
        </form>
      ) : null}
    </Surface>
  );
}

export { CrmStaffSurface };
