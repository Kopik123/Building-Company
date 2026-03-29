function buildCrmWorkspacePanels({
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
}) {
  return {
    summaryPanel: {
      search,
      setSearch,
      clients,
      staff
    },
    createStaffPanel: {
      canCreateStaff,
      onCreateStaff,
      staffForm,
      onStaffFieldChange,
      role,
      saving,
      actionMessage,
      actionError
    },
    clientsPanel: {
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
    },
    staffPanel: {
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
    }
  };
}

export { buildCrmWorkspacePanels };
