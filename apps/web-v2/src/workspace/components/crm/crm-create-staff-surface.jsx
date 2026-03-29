import { Surface, STAFF_CREATION_ROLES, titleCase } from '../../kit.jsx';

function CrmCreateStaffSurface({ createStaffPanel }) {
  const { canCreateStaff, onCreateStaff, staffForm, onStaffFieldChange, role, saving, actionMessage, actionError } = createStaffPanel;

  if (!canCreateStaff) return null;

  return (
    <Surface eyebrow="CRM actions" title="Create staff member" description="This manager/admin action now runs through `api/v2/crm/staff` instead of the legacy manager shell.">
      <form className="editor-form" onSubmit={onCreateStaff}>
        <div className="form-grid">
          <label>
            Create staff name
            <input value={staffForm.name} onChange={onStaffFieldChange('name')} placeholder="Leah Builder" required />
          </label>
          <label>
            Create staff email
            <input value={staffForm.email} onChange={onStaffFieldChange('email')} type="email" placeholder="leah@example.com" required />
          </label>
          <label>
            Temporary password
            <input value={staffForm.password} onChange={onStaffFieldChange('password')} type="password" minLength={8} required />
          </label>
          <label>
            Create staff phone
            <input value={staffForm.phone} onChange={onStaffFieldChange('phone')} placeholder="+44 ..." />
          </label>
          <label>
            Create staff role
            <select value={staffForm.role} onChange={onStaffFieldChange('role')}>
              {STAFF_CREATION_ROLES.filter((staffRole) => role === 'admin' || staffRole !== 'manager').map((staffRole) => (
                <option key={staffRole} value={staffRole}>
                  {titleCase(staffRole)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="action-row">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Create staff member'}
          </button>
        </div>
        {actionMessage ? <p className="muted">{actionMessage}</p> : null}
        {actionError ? <p className="error">{actionError}</p> : null}
      </form>
    </Surface>
  );
}

export { CrmCreateStaffSurface };
