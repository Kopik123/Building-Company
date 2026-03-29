import React from 'react';
import { useAuth } from '../../lib/auth.jsx';
import { CrmWorkspacePanels } from '../components/crm-sections.jsx';
import { useCrmWorkspaceState } from '../hooks/use-crm-workspace-state.js';
import { useCrmWorkspaceActions } from '../hooks/use-crm-workspace-actions.js';
import { buildCrmWorkspacePanels } from '../view-models/crm-panels.js';
import { normalizeText } from '../kit.jsx';

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

  const { onCreateStaff, onSaveClient, onSaveStaff } = useCrmWorkspaceActions({
    canCreateStaff,
    canEditPeople,
    role,
    staff,
    staffForm,
    setStaffForm,
    saving,
    setSaving,
    setActionError,
    setActionMessage,
    selectedClientId,
    clientSaving,
    setClientSaving,
    setClientError,
    setClientMessage,
    clientForm,
    clients,
    setClientForm,
    selectedStaffId,
    staffSaving,
    setStaffSaving,
    setStaffError,
    setStaffMessage,
    staffEditorForm,
    setStaffEditorForm
  });

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
