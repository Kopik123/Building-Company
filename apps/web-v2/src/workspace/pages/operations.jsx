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
function NotificationsPage() {
  const notifications = useAsyncState(() => v2Api.getNotifications(), [], []);
  const unread = useAsyncState(() => v2Api.getNotificationsUnreadCount(), [], 0);
  const [busyId, setBusyId] = React.useState('');
  const [markingAll, setMarkingAll] = React.useState(false);
  const [actionError, setActionError] = React.useState('');

  const onMarkRead = async (notificationId) => {
    setBusyId(notificationId);
    setActionError('');
    try {
      const updated = await v2Api.markNotificationRead(notificationId);
      notifications.setData((prev) =>
        prev.map((notification) => (notification.id === notificationId ? { ...notification, ...(updated || {}), isRead: true } : notification))
      );
      unread.setData((prev) => Math.max(0, Number(prev || 0) - 1));
    } catch (error) {
      setActionError(error.message || 'Could not mark notification as read');
    } finally {
      setBusyId('');
    }
  };

  const onMarkAllRead = async () => {
    setMarkingAll(true);
    setActionError('');
    try {
      await v2Api.markAllNotificationsRead();
      notifications.setData((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
      unread.setData(0);
    } catch (error) {
      setActionError(error.message || 'Could not mark all notifications as read');
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <Surface
      eyebrow="Notifications"
      title="Alert queue"
      description="Read-state actions now work inside the rollout shell instead of forcing a jump back to legacy pages."
      actions={
        <div className="surface-actions cluster">
          <StatusPill tone={Number(unread.data || 0) > 0 ? 'danger' : 'neutral'}>{unread.loading ? '...' : `${unread.data} unread`}</StatusPill>
          <button type="button" className="button-secondary" onClick={onMarkAllRead} disabled={markingAll || !notifications.data.length}>
            {markingAll ? 'Saving...' : 'Mark all read'}
          </button>
        </div>
      }
    >
      {notifications.loading ? <p className="muted">Loading notifications...</p> : null}
      {notifications.error ? <p className="error">{notifications.error}</p> : null}
      {actionError ? <p className="error">{actionError}</p> : null}
      {!notifications.loading && !notifications.error && !notifications.data.length ? <EmptyState text="No notifications right now." /> : null}
      <div className="stack-list">
        {sortByRecent(notifications.data, ['createdAt', 'updatedAt']).map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            onRead={() => onMarkRead(notification.id)}
            busy={busyId === notification.id}
          />
        ))}
      </div>
    </Surface>
  );
}

function CrmPage() {
  const { user } = useAuth();
  const role = normalizeText(user?.role || 'employee');
  const canCreateStaff = ['manager', 'admin'].includes(role);
  const canEditPeople = ['manager', 'admin'].includes(role);
  const clients = useAsyncState(() => v2Api.getCrmClients(), [], []);
  const staff = useAsyncState(() => v2Api.getCrmStaff(), [], []);
  const [search, setSearch] = React.useState('');
  const [staffForm, setStaffForm] = React.useState(() => createStaffFormState());
  const [selectedClientId, setSelectedClientId] = React.useState('');
  const [selectedStaffId, setSelectedStaffId] = React.useState('');
  const [clientForm, setClientForm] = React.useState(() => createClientEditorState());
  const [staffEditorForm, setStaffEditorForm] = React.useState(() => createStaffEditorState());
  const [saving, setSaving] = React.useState(false);
  const [clientSaving, setClientSaving] = React.useState(false);
  const [staffSaving, setStaffSaving] = React.useState(false);
  const [actionError, setActionError] = React.useState('');
  const [actionMessage, setActionMessage] = React.useState('');
  const [clientError, setClientError] = React.useState('');
  const [clientMessage, setClientMessage] = React.useState('');
  const [staffError, setStaffError] = React.useState('');
  const [staffMessage, setStaffMessage] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);

  const filteredClients = clients.data.filter((client) =>
    [client?.name, client?.email, client?.phone, client?.companyName, client?.crmLifecycleStatus].join(' ').toLowerCase().includes(normalizeText(deferredSearch))
  );
  const filteredStaff = staff.data.filter((member) =>
    [member?.name, member?.email, member?.role].join(' ').toLowerCase().includes(normalizeText(deferredSearch))
  );
  const selectedClient = clients.data.find((client) => client.id === selectedClientId) || null;
  const selectedStaff = staff.data.find((member) => member.id === selectedStaffId) || null;
  const clientActivity = useAsyncState(
    () => (canEditPeople && selectedClientId ? v2Api.getClientActivity(selectedClientId, { pageSize: 8 }) : Promise.resolve([])),
    [canEditPeople, selectedClientId],
    []
  );

  const onStaffFieldChange = (key) => (event) => {
    const nextValue = event?.target?.type === 'checkbox' ? event.target.checked : event.target.value;
    setStaffForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  const onClientFieldChange = (key) => (event) => {
    const nextValue = event?.target?.type === 'checkbox' ? event.target.checked : event.target.value;
    setClientForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  const onStaffEditorFieldChange = (key) => (event) => {
    const nextValue = event?.target?.type === 'checkbox' ? event.target.checked : event.target.value;
    setStaffEditorForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  React.useEffect(() => {
    if (!canEditPeople) return;
    if (!filteredClients.length) {
      if (selectedClientId) setSelectedClientId('');
      return;
    }
    if (!filteredClients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(filteredClients[0].id);
    }
  }, [filteredClients, selectedClientId, canEditPeople]);

  React.useEffect(() => {
    if (!canEditPeople) return;
    if (!filteredStaff.length) {
      if (selectedStaffId) setSelectedStaffId('');
      return;
    }
    if (!filteredStaff.some((member) => member.id === selectedStaffId)) {
      setSelectedStaffId(filteredStaff[0].id);
    }
  }, [filteredStaff, selectedStaffId, canEditPeople]);

  React.useEffect(() => {
    if (!canEditPeople || !selectedClient) return;
    setClientForm(clientToFormState(selectedClient));
  }, [selectedClient, canEditPeople]);

  React.useEffect(() => {
    if (!canEditPeople || !selectedStaff) return;
    setStaffEditorForm(staffToFormState(selectedStaff));
  }, [selectedStaff, canEditPeople]);

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

function InventoryPage() {
  const { user } = useAuth();
  const role = normalizeText(user?.role || 'employee');
  const canDelete = ['manager', 'admin'].includes(role);
  const services = useAsyncState(() => v2Api.getInventoryServices(), [], []);
  const materials = useAsyncState(() => v2Api.getInventoryMaterials(), [], []);
  const [serviceSearch, setServiceSearch] = React.useState('');
  const [materialSearch, setMaterialSearch] = React.useState('');
  const [selectedServiceId, setSelectedServiceId] = React.useState('');
  const [selectedMaterialId, setSelectedMaterialId] = React.useState('');
  const [isCreatingService, setIsCreatingService] = React.useState(false);
  const [isCreatingMaterial, setIsCreatingMaterial] = React.useState(false);
  const [serviceForm, setServiceForm] = React.useState(() => createServiceFormState());
  const [materialForm, setMaterialForm] = React.useState(() => createMaterialFormState());
  const [serviceSaving, setServiceSaving] = React.useState(false);
  const [materialSaving, setMaterialSaving] = React.useState(false);
  const [serviceStatus, setServiceStatus] = React.useState('');
  const [serviceError, setServiceError] = React.useState('');
  const [materialStatus, setMaterialStatus] = React.useState('');
  const [materialError, setMaterialError] = React.useState('');

  const filteredServices = services.data.filter((service) =>
    [service?.title, service?.slug, service?.category, service?.shortDescription].join(' ').toLowerCase().includes(normalizeText(serviceSearch))
  );
  const filteredMaterials = materials.data.filter((material) =>
    [material?.name, material?.sku, material?.category, material?.supplier].join(' ').toLowerCase().includes(normalizeText(materialSearch))
  );

  React.useEffect(() => {
    if (isCreatingService) return;
    if (!filteredServices.length) {
      if (selectedServiceId) setSelectedServiceId('');
      return;
    }
    if (!filteredServices.some((service) => service.id === selectedServiceId)) {
      setSelectedServiceId(filteredServices[0].id);
    }
  }, [filteredServices, selectedServiceId, isCreatingService]);

  React.useEffect(() => {
    if (isCreatingMaterial) return;
    if (!filteredMaterials.length) {
      if (selectedMaterialId) setSelectedMaterialId('');
      return;
    }
    if (!filteredMaterials.some((material) => material.id === selectedMaterialId)) {
      setSelectedMaterialId(filteredMaterials[0].id);
    }
  }, [filteredMaterials, selectedMaterialId, isCreatingMaterial]);

  React.useEffect(() => {
    if (isCreatingService) return;
    const selectedService = services.data.find((service) => service.id === selectedServiceId);
    if (!selectedService) return;
    setServiceForm(serviceToFormState(selectedService));
  }, [selectedServiceId, services.data, isCreatingService]);

  React.useEffect(() => {
    if (isCreatingMaterial) return;
    const selectedMaterial = materials.data.find((material) => material.id === selectedMaterialId);
    if (!selectedMaterial) return;
    setMaterialForm(materialToFormState(selectedMaterial));
  }, [selectedMaterialId, materials.data, isCreatingMaterial]);

  const onServiceFieldChange = (key) => (event) => {
    const nextValue = event?.target?.type === 'checkbox' ? event.target.checked : event.target.value;
    setServiceForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  const onMaterialFieldChange = (key) => (event) => {
    const nextValue = event?.target?.type === 'checkbox' ? event.target.checked : event.target.value;
    setMaterialForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  const startNewService = () => {
    setIsCreatingService(true);
    setSelectedServiceId('');
    setServiceForm(createServiceFormState());
    setServiceStatus('');
    setServiceError('');
  };

  const startNewMaterial = () => {
    setIsCreatingMaterial(true);
    setSelectedMaterialId('');
    setMaterialForm(createMaterialFormState());
    setMaterialStatus('');
    setMaterialError('');
  };

  const selectService = (service) => {
    setIsCreatingService(false);
    setSelectedServiceId(service.id);
    setServiceForm(serviceToFormState(service));
    setServiceStatus('');
    setServiceError('');
  };

  const selectMaterial = (material) => {
    setIsCreatingMaterial(false);
    setSelectedMaterialId(material.id);
    setMaterialForm(materialToFormState(material));
    setMaterialStatus('');
    setMaterialError('');
  };

  const saveService = async (event) => {
    event.preventDefault();
    if (serviceSaving) return;

    setServiceSaving(true);
    setServiceStatus('');
    setServiceError('');

    try {
      const payload = {
        title: String(serviceForm.title || '').trim(),
        slug: toNullablePayload(serviceForm.slug),
        category: serviceForm.category,
        shortDescription: toNullablePayload(serviceForm.shortDescription),
        fullDescription: toNullablePayload(serviceForm.fullDescription),
        basePriceFrom: serviceForm.basePriceFrom === '' ? null : Number(serviceForm.basePriceFrom),
        heroImageUrl: toNullablePayload(serviceForm.heroImageUrl),
        displayOrder: toNumberPayload(serviceForm.displayOrder, 0),
        showOnWebsite: Boolean(serviceForm.showOnWebsite),
        isFeatured: Boolean(serviceForm.isFeatured),
        isActive: Boolean(serviceForm.isActive)
      };
      const savedService = selectedServiceId
        ? await v2Api.updateInventoryService(selectedServiceId, payload)
        : await v2Api.createInventoryService(payload);
      if (!savedService?.id) throw new Error('Service response missing payload');

      services.setData((prev) =>
        [...prev.filter((service) => service.id !== savedService.id), savedService]
          .sort((left, right) => (left.displayOrder || 0) - (right.displayOrder || 0) || String(left.title || '').localeCompare(String(right.title || '')))
      );
      setIsCreatingService(false);
      setSelectedServiceId(savedService.id);
      setServiceForm(serviceToFormState(savedService));
      setServiceStatus(selectedServiceId ? 'Service saved.' : 'Service created.');
    } catch (error) {
      setServiceError(error.message || 'Could not save service');
    } finally {
      setServiceSaving(false);
    }
  };

  const deleteService = async () => {
    if (!selectedServiceId || !canDelete || serviceSaving) return;

    setServiceSaving(true);
    setServiceStatus('');
    setServiceError('');
    try {
      await v2Api.deleteInventoryService(selectedServiceId);
      services.setData((prev) => prev.filter((service) => service.id !== selectedServiceId));
      setSelectedServiceId('');
      setIsCreatingService(true);
      setServiceForm(createServiceFormState());
      setServiceStatus('Service deleted.');
    } catch (error) {
      setServiceError(error.message || 'Could not delete service');
    } finally {
      setServiceSaving(false);
    }
  };

  const saveMaterial = async (event) => {
    event.preventDefault();
    if (materialSaving) return;

    setMaterialSaving(true);
    setMaterialStatus('');
    setMaterialError('');

    try {
      const payload = {
        name: String(materialForm.name || '').trim(),
        sku: toNullablePayload(materialForm.sku),
        category: materialForm.category,
        unit: String(materialForm.unit || 'pcs').trim() || 'pcs',
        stockQty: Number(materialForm.stockQty || 0),
        minStockQty: Number(materialForm.minStockQty || 0),
        unitCost: materialForm.unitCost === '' ? null : Number(materialForm.unitCost),
        supplier: toNullablePayload(materialForm.supplier),
        notes: toNullablePayload(materialForm.notes),
        isActive: Boolean(materialForm.isActive)
      };
      const savedMaterial = selectedMaterialId
        ? await v2Api.updateInventoryMaterial(selectedMaterialId, payload)
        : await v2Api.createInventoryMaterial(payload);
      if (!savedMaterial?.id) throw new Error('Material response missing payload');

      materials.setData((prev) =>
        [...prev.filter((material) => material.id !== savedMaterial.id), savedMaterial]
          .sort((left, right) => String(left.category || '').localeCompare(String(right.category || '')) || String(left.name || '').localeCompare(String(right.name || '')))
      );
      setIsCreatingMaterial(false);
      setSelectedMaterialId(savedMaterial.id);
      setMaterialForm(materialToFormState(savedMaterial));
      setMaterialStatus(selectedMaterialId ? 'Material saved.' : 'Material created.');
    } catch (error) {
      setMaterialError(error.message || 'Could not save material');
    } finally {
      setMaterialSaving(false);
    }
  };

  const deleteMaterial = async () => {
    if (!selectedMaterialId || !canDelete || materialSaving) return;

    setMaterialSaving(true);
    setMaterialStatus('');
    setMaterialError('');
    try {
      await v2Api.deleteInventoryMaterial(selectedMaterialId);
      materials.setData((prev) => prev.filter((material) => material.id !== selectedMaterialId));
      setSelectedMaterialId('');
      setIsCreatingMaterial(true);
      setMaterialForm(createMaterialFormState());
      setMaterialStatus('Material deleted.');
    } catch (error) {
      setMaterialError(error.message || 'Could not delete material');
    } finally {
      setMaterialSaving(false);
    }
  };

  return (
    <div className="grid-two">
      <Surface
        eyebrow="Inventory"
        title="Services"
        description="Create, tune and retire service catalogue rows directly in the rollout shell."
        actions={
          <div className="surface-actions cluster">
            <label className="inline-search">
              <span>Filter</span>
              <input value={serviceSearch} onChange={(event) => setServiceSearch(event.target.value)} placeholder="Search title, slug or category" />
            </label>
            <button type="button" className="button-secondary" onClick={startNewService}>
              New service
            </button>
          </div>
        }
      >
        {services.loading ? <p className="muted">Loading services...</p> : null}
        {services.error ? <p className="error">{services.error}</p> : null}
        {!services.loading && !services.error && !filteredServices.length ? <EmptyState text="No service inventory rows found." /> : null}
        <div className="stack-list">
          {filteredServices.map((service) => (
            <SelectableCard key={service.id} selected={!isCreatingService && service.id === selectedServiceId} onSelect={() => selectService(service)}>
              <article className="summary-row">
                <div>
                  <strong>{service.title}</strong>
                  <p>{service.category || 'Uncategorised'}</p>
                </div>
                <div className="summary-row-meta">
                  <span>{service.slug || 'No slug'}</span>
                  <StatusPill tone={service.showOnWebsite ? 'accent' : 'neutral'}>{service.showOnWebsite ? 'Live' : 'Hidden'}</StatusPill>
                </div>
              </article>
            </SelectableCard>
          ))}
        </div>

        <form className="editor-form" onSubmit={saveService}>
          <div className="form-grid">
            <label>
              Title
              <input value={serviceForm.title} onChange={onServiceFieldChange('title')} placeholder="Bathrooms Premium" required />
            </label>
            <label>
              Slug
              <input value={serviceForm.slug} onChange={onServiceFieldChange('slug')} placeholder="bathrooms-premium" />
            </label>
            <label>
              Category
              <select value={serviceForm.category} onChange={onServiceFieldChange('category')}>
                {SERVICE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {titleCase(category)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Base price from
              <input value={serviceForm.basePriceFrom} onChange={onServiceFieldChange('basePriceFrom')} type="number" min="0" step="0.01" />
            </label>
            <label>
              Display order
              <input value={serviceForm.displayOrder} onChange={onServiceFieldChange('displayOrder')} type="number" min="0" />
            </label>
            <label>
              Hero image URL
              <input value={serviceForm.heroImageUrl} onChange={onServiceFieldChange('heroImageUrl')} placeholder="/Gallery/premium/..." />
            </label>
          </div>
          <label>
            Short description
            <textarea value={serviceForm.shortDescription} onChange={onServiceFieldChange('shortDescription')} rows={3} placeholder="Short brochure-facing summary." />
          </label>
          <label>
            Full description
            <textarea value={serviceForm.fullDescription} onChange={onServiceFieldChange('fullDescription')} rows={4} placeholder="Longer internal/brochure copy." />
          </label>
          <div className="checkbox-row">
            <label>
              <input checked={serviceForm.showOnWebsite} onChange={onServiceFieldChange('showOnWebsite')} type="checkbox" />
              Show on website
            </label>
            <label>
              <input checked={serviceForm.isFeatured} onChange={onServiceFieldChange('isFeatured')} type="checkbox" />
              Featured service
            </label>
            <label>
              <input checked={serviceForm.isActive} onChange={onServiceFieldChange('isActive')} type="checkbox" />
              Active
            </label>
          </div>
          <div className="action-row">
            <button type="submit" disabled={serviceSaving}>
              {serviceSaving ? 'Saving...' : selectedServiceId ? 'Save service' : 'Create service'}
            </button>
            {canDelete && selectedServiceId ? (
              <button type="button" className="button-secondary" onClick={deleteService} disabled={serviceSaving}>
                Delete service
              </button>
            ) : null}
          </div>
          {serviceStatus ? <p className="muted">{serviceStatus}</p> : null}
          {serviceError ? <p className="error">{serviceError}</p> : null}
        </form>
      </Surface>

      <Surface
        eyebrow="Inventory"
        title="Materials"
        description="Create and maintain stock rows, thresholds and supplier details under the same v2 contract."
        actions={
          <div className="surface-actions cluster">
            <label className="inline-search">
              <span>Filter</span>
              <input value={materialSearch} onChange={(event) => setMaterialSearch(event.target.value)} placeholder="Search name, SKU or supplier" />
            </label>
            <button type="button" className="button-secondary" onClick={startNewMaterial}>
              New material
            </button>
          </div>
        }
      >
        {materials.loading ? <p className="muted">Loading materials...</p> : null}
        {materials.error ? <p className="error">{materials.error}</p> : null}
        {!materials.loading && !materials.error && !filteredMaterials.length ? <EmptyState text="No material records found." /> : null}
        <div className="stack-list">
          {filteredMaterials.map((material) => {
            const lowStock = Number(material?.stockQty || 0) <= Number(material?.minStockQty || 0);
            return (
              <SelectableCard key={material.id} selected={!isCreatingMaterial && material.id === selectedMaterialId} onSelect={() => selectMaterial(material)}>
                <article className="summary-row">
                  <div>
                    <strong>{material.name}</strong>
                    <p>SKU {material.sku || 'pending'}</p>
                  </div>
                  <div className="summary-row-meta">
                    <StatusPill tone={lowStock ? 'danger' : 'neutral'}>
                      {material.stockQty}/{material.minStockQty}
                    </StatusPill>
                    <span>{material.supplier || 'No supplier'}</span>
                  </div>
                </article>
              </SelectableCard>
            );
          })}
        </div>

        <form className="editor-form" onSubmit={saveMaterial}>
          <div className="form-grid">
            <label>
              Name
              <input value={materialForm.name} onChange={onMaterialFieldChange('name')} placeholder="Calacatta Slab" required />
            </label>
            <label>
              SKU
              <input value={materialForm.sku} onChange={onMaterialFieldChange('sku')} placeholder="MAR-001" />
            </label>
            <label>
              Category
              <select value={materialForm.category} onChange={onMaterialFieldChange('category')}>
                {MATERIAL_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {titleCase(category)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Unit
              <input value={materialForm.unit} onChange={onMaterialFieldChange('unit')} placeholder="pcs" />
            </label>
            <label>
              Stock quantity
              <input value={materialForm.stockQty} onChange={onMaterialFieldChange('stockQty')} type="number" step="0.01" />
            </label>
            <label>
              Minimum stock
              <input value={materialForm.minStockQty} onChange={onMaterialFieldChange('minStockQty')} type="number" step="0.01" />
            </label>
            <label>
              Unit cost
              <input value={materialForm.unitCost} onChange={onMaterialFieldChange('unitCost')} type="number" min="0" step="0.01" />
            </label>
            <label>
              Supplier
              <input value={materialForm.supplier} onChange={onMaterialFieldChange('supplier')} placeholder="Stone House" />
            </label>
          </div>
          <label>
            Notes
            <textarea value={materialForm.notes} onChange={onMaterialFieldChange('notes')} rows={4} placeholder="Delivery note or stock remark." />
          </label>
          <div className="checkbox-row">
            <label>
              <input checked={materialForm.isActive} onChange={onMaterialFieldChange('isActive')} type="checkbox" />
              Active
            </label>
          </div>
          <div className="action-row">
            <button type="submit" disabled={materialSaving}>
              {materialSaving ? 'Saving...' : selectedMaterialId ? 'Save material' : 'Create material'}
            </button>
            {canDelete && selectedMaterialId ? (
              <button type="button" className="button-secondary" onClick={deleteMaterial} disabled={materialSaving}>
                Delete material
              </button>
            ) : null}
          </div>
          {materialStatus ? <p className="muted">{materialStatus}</p> : null}
          {materialError ? <p className="error">{materialError}</p> : null}
        </form>
      </Surface>
    </div>
  );
}

function ServiceCataloguePage() {
  const services = useAsyncState(() => v2Api.getPublicServices(), [], []);

  return (
    <Surface eyebrow="Services" title="Public service catalogue" description="The brochure-facing service list already consumed through the v2 public contract.">
      {services.loading ? <p className="muted">Loading services...</p> : null}
      {services.error ? <p className="error">{services.error}</p> : null}
      {!services.loading && !services.error && !services.data.length ? <EmptyState text="No public services are available right now." /> : null}
      <div className="quick-link-grid">
        {services.data.map((service) => (
          <article key={service.id || service.slug || service.title} className="quick-link-card quick-link-card--static">
            <strong>{service.title}</strong>
            <span>{service.shortDescription || 'Service summary pending.'}</span>
            <small>{service.category || 'Brochure route'}</small>
          </article>
        ))}
      </div>
    </Surface>
  );
}


export { NotificationsPage, CrmPage, InventoryPage, ServiceCataloguePage };
