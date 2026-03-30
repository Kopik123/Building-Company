/**
 * @typedef {Object} CrmSummaryPanel
 * @property {string} search
 * @property {Function} setSearch
 * @property {Object} clients
 * @property {Object} staff
 */

/**
 * @typedef {Object} CrmCreateStaffPanel
 * @property {boolean} canCreateStaff
 * @property {Function} onCreateStaff
 * @property {Object} staffForm
 * @property {Function} onStaffFieldChange
 * @property {string} role
 * @property {boolean} saving
 * @property {string} actionMessage
 * @property {string} actionError
 */

/**
 * @typedef {Object} CrmClientsPanel
 * @property {Object} clients
 * @property {Array<Object>} filteredClients
 * @property {string | null} selectedClientId
 * @property {Function} setSelectedClientId
 * @property {boolean} canEditPeople
 * @property {Object | null} selectedClient
 * @property {Function} onSaveClient
 * @property {Object} clientForm
 * @property {Function} onClientFieldChange
 * @property {boolean} clientSaving
 * @property {string} clientMessage
 * @property {string} clientError
 * @property {Object} clientActivity
 */

/**
 * @typedef {Object} CrmStaffPanel
 * @property {Object} staff
 * @property {Array<Object>} filteredStaff
 * @property {string | null} selectedStaffId
 * @property {Function} setSelectedStaffId
 * @property {boolean} canEditPeople
 * @property {Object | null} selectedStaff
 * @property {Function} onSaveStaff
 * @property {Object} staffEditorForm
 * @property {Function} onStaffEditorFieldChange
 * @property {string} role
 * @property {boolean} staffSaving
 * @property {string} staffMessage
 * @property {string} staffError
 */

/**
 * @typedef {Object} CrmWorkspacePanels
 * @property {CrmSummaryPanel} summaryPanel
 * @property {CrmCreateStaffPanel} createStaffPanel
 * @property {CrmClientsPanel} clientsPanel
 * @property {CrmStaffPanel} staffPanel
 */

/**
 * @param {Object} config
 * @returns {CrmWorkspacePanels}
 */
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
