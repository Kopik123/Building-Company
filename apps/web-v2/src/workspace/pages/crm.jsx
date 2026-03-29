import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import { v2Api } from '../../lib/api';
import { useCrmWorkspaceState } from '../hooks/use-crm-workspace-state.js';
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

function CrmPage() {
  const { user } = useAuth();
  const role = normalizeText(user?.role || 'employee');
  const canCreateStaff = ['manager', 'admin'].includes(role);
  const canEditPeople = ['manager', 'admin'].includes(role);
  const {
    clients,
    staff,
    search,
    setSearch,
    staffForm,
    setStaffForm,
    selectedClientId,
    setSelectedClientId,
    selectedStaffId,
    setSelectedStaffId,
    clientForm,
    setClientForm,
    staffEditorForm,
    setStaffEditorForm,
    saving,
    setSaving,
    clientSaving,
    setClientSaving,
    staffSaving,
    setStaffSaving,
    actionError,
    setActionError,
    actionMessage,
    setActionMessage,
    clientError,
    setClientError,
    clientMessage,
    setClientMessage,
    staffError,
    setStaffError,
    staffMessage,
    setStaffMessage,
    filteredClients,
    filteredStaff,
    selectedClient,
    selectedStaff,
    clientActivity,
    onStaffFieldChange,
    onClientFieldChange,
    onStaffEditorFieldChange
  } = useCrmWorkspaceState({ canEditPeople });

  const onCreateStaff = async (event) => {
    event.preventDefault();
    if (!canCreateStaff || saving) return;

    setSaving(true);
    setActionError('');
    setActionMessage('');

    try {
      const createdStaff = await v2Api.createCrmStaff({
        name: String(staffForm.name || '').trim(),
        email: String(staffForm.email || '').trim(),
        password: staffForm.password,
        phone: toNullablePayload(staffForm.phone),
        role: staffForm.role
      });

      if (!createdStaff?.id) throw new Error('Staff response missing payload');

      staff.setData((prev) => sortByRecent([createdStaff, ...prev.filter((member) => member.id !== createdStaff.id)], ['createdAt', 'updatedAt']));
      setStaffForm(createStaffFormState());
      setActionMessage('Staff member created.');
    } catch (error) {
      setActionError(error.message || 'Could not create staff member');
    } finally {
      setSaving(false);
    }
  };

  const onSaveClient = async (event) => {
    event.preventDefault();
    if (!selectedClientId || !canEditPeople || clientSaving) return;

    setClientSaving(true);
    setClientError('');
    setClientMessage('');
    try {
      const updatedClient = await v2Api.updateCrmClient(selectedClientId, {
        name: String(clientForm.name || '').trim(),
        phone: toNullablePayload(clientForm.phone),
        companyName: toNullablePayload(clientForm.companyName),
        crmLifecycleStatus: clientForm.crmLifecycleStatus,
        isActive: Boolean(clientForm.isActive)
      });
      if (!updatedClient?.id) throw new Error('Client response missing payload');

      clients.setData((prev) => prev.map((client) => (client.id === updatedClient.id ? updatedClient : client)));
      setClientForm(clientToFormState(updatedClient));
      setClientMessage('Client saved.');
    } catch (error) {
      setClientError(error.message || 'Could not save client');
    } finally {
      setClientSaving(false);
    }
  };

  const onSaveStaff = async (event) => {
    event.preventDefault();
    if (!selectedStaffId || !canEditPeople || staffSaving) return;

    setStaffSaving(true);
    setStaffError('');
    setStaffMessage('');
    try {
      const payload = {
        name: String(staffEditorForm.name || '').trim(),
        phone: toNullablePayload(staffEditorForm.phone),
        isActive: Boolean(staffEditorForm.isActive)
      };
      if (role === 'admin') {
        payload.role = staffEditorForm.role;
      }
      const updatedStaff = await v2Api.updateCrmStaff(selectedStaffId, payload);
      if (!updatedStaff?.id) throw new Error('Staff response missing payload');

      staff.setData((prev) =>
        prev.map((member) => (member.id === updatedStaff.id ? updatedStaff : member)).sort((left, right) => String(left.email || '').localeCompare(String(right.email || '')))
      );
      setStaffEditorForm(staffToFormState(updatedStaff));
      setStaffMessage('Staff record saved.');
    } catch (error) {
      setStaffError(error.message || 'Could not save staff record');
    } finally {
      setStaffSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <Surface
        eyebrow="CRM"
        title="People directory"
        description="`CRM` now covers search-ready people lists for assignment workflows, plus v2-native staff creation for managers and admins."
        actions={
          <label className="inline-search">
            <span>Filter people</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or phone" />
          </label>
        }
      >
        <div className="mini-grid">
          <MetricCard label="Clients" value={clients.data.length} detail="Live client records" />
          <MetricCard label="Staff" value={staff.data.length} detail="Employee, manager and admin profiles" tone="accent" />
        </div>
      </Surface>

      {canCreateStaff ? (
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
      ) : null}

      <div className="grid-two">
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
      </div>
    </div>
  );
}

export { CrmPage };
