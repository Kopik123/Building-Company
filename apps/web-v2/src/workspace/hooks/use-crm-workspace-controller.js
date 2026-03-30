import { useAuth } from '../../lib/auth.jsx';
import { normalizeText } from '../kit.jsx';
import { useCrmWorkspaceState } from './use-crm-workspace-state.js';
import { useCrmWorkspaceActions } from './use-crm-workspace-actions.js';
import { buildCrmWorkspacePanels } from '../view-models/crm-panels.js';

/**
 * @returns {import('../view-models/crm-panels.js').CrmWorkspacePanels}
 */
function useCrmWorkspaceController() {
  const { user } = useAuth();
  const role = normalizeText(user?.role || 'employee');
  const canCreateStaff = ['manager', 'admin'].includes(role);
  const canEditPeople = ['manager', 'admin'].includes(role);

  const state = useCrmWorkspaceState({ canEditPeople });
  const actions = useCrmWorkspaceActions({
    canCreateStaff,
    canEditPeople,
    role,
    staff: state.staff,
    staffForm: state.staffForm,
    setStaffForm: state.setStaffForm,
    saving: state.saving,
    setSaving: state.setSaving,
    setActionError: state.setActionError,
    setActionMessage: state.setActionMessage,
    selectedClientId: state.selectedClientId,
    clientSaving: state.clientSaving,
    setClientSaving: state.setClientSaving,
    setClientError: state.setClientError,
    setClientMessage: state.setClientMessage,
    clientForm: state.clientForm,
    clients: state.clients,
    setClientForm: state.setClientForm,
    selectedStaffId: state.selectedStaffId,
    staffSaving: state.staffSaving,
    setStaffSaving: state.setStaffSaving,
    setStaffError: state.setStaffError,
    setStaffMessage: state.setStaffMessage,
    staffEditorForm: state.staffEditorForm,
    setStaffEditorForm: state.setStaffEditorForm
  });

  return buildCrmWorkspacePanels({
    search: state.search,
    setSearch: state.setSearch,
    clients: state.clients,
    staff: state.staff,
    canCreateStaff,
    onCreateStaff: actions.onCreateStaff,
    staffForm: state.staffForm,
    onStaffFieldChange: state.onStaffFieldChange,
    role,
    saving: state.saving,
    actionMessage: state.actionMessage,
    actionError: state.actionError,
    filteredClients: state.filteredClients,
    selectedClientId: state.selectedClientId,
    setSelectedClientId: state.setSelectedClientId,
    canEditPeople,
    selectedClient: state.selectedClient,
    onSaveClient: actions.onSaveClient,
    clientForm: state.clientForm,
    onClientFieldChange: state.onClientFieldChange,
    clientSaving: state.clientSaving,
    clientMessage: state.clientMessage,
    clientError: state.clientError,
    clientActivity: state.clientActivity,
    filteredStaff: state.filteredStaff,
    selectedStaffId: state.selectedStaffId,
    setSelectedStaffId: state.setSelectedStaffId,
    selectedStaff: state.selectedStaff,
    onSaveStaff: actions.onSaveStaff,
    staffEditorForm: state.staffEditorForm,
    onStaffEditorFieldChange: state.onStaffEditorFieldChange,
    staffSaving: state.staffSaving,
    staffMessage: state.staffMessage,
    staffError: state.staffError
  });
}

export { useCrmWorkspaceController };
