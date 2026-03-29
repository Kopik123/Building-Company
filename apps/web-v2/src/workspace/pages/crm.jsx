import React from 'react';
import { useAuth } from '../../lib/auth.jsx';
import { v2Api } from '../../lib/api';
import { CrmWorkspacePanels } from '../components/crm-sections.jsx';
import { useCrmWorkspaceState } from '../hooks/use-crm-workspace-state.js';
import { buildCrmWorkspacePanels } from '../view-models/crm-panels.js';
import {
  normalizeText,
  sortByRecent,
  toNullablePayload,
  createStaffFormState,
  clientToFormState,
  staffToFormState
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

      staff.setData((prev) =>
        sortByRecent([createdStaff, ...prev.filter((member) => member.id !== createdStaff.id)], ['createdAt', 'updatedAt'])
      );
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
        prev
          .map((member) => (member.id === updatedStaff.id ? updatedStaff : member))
          .sort((left, right) => String(left.email || '').localeCompare(String(right.email || '')))
      );
      setStaffEditorForm(staffToFormState(updatedStaff));
      setStaffMessage('Staff record saved.');
    } catch (error) {
      setStaffError(error.message || 'Could not save staff record');
    } finally {
      setStaffSaving(false);
    }
  };

  const { summaryPanel, createStaffPanel, clientsPanel, staffPanel } = buildCrmWorkspacePanels({
    search,
    setSearch,
    clients,
    staff,
    canCreateStaff,
    onCreateStaff,
    staffForm,
    onStaffFieldChange,
    role,
    saving,
    actionMessage,
    actionError,
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
    clientActivity,
    filteredStaff,
    selectedStaffId,
    setSelectedStaffId,
    selectedStaff,
    onSaveStaff,
    staffEditorForm,
    onStaffEditorFieldChange,
    staffSaving,
    staffMessage,
    staffError
  });

  return (
    <CrmWorkspacePanels
      summaryPanel={summaryPanel}
      createStaffPanel={createStaffPanel}
      clientsPanel={clientsPanel}
      staffPanel={staffPanel}
    />
  );
}

export { CrmPage };
