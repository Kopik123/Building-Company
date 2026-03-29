/**
 * @typedef {Object} InventoryServicePanel
 * @property {Object} services
 * @property {string} serviceSearch
 * @property {Function} setServiceSearch
 * @property {Function} startNewService
 * @property {Array<Object>} filteredServices
 * @property {boolean} isCreatingService
 * @property {string | null} selectedServiceId
 * @property {Function} selectService
 * @property {Object} serviceForm
 * @property {Function} onServiceFieldChange
 * @property {Function} saveService
 * @property {boolean} serviceSaving
 * @property {boolean} canDelete
 * @property {Function} deleteService
 * @property {string} serviceStatus
 * @property {string} serviceError
 */

/**
 * @typedef {Object} InventoryMaterialPanel
 * @property {Object} materials
 * @property {string} materialSearch
 * @property {Function} setMaterialSearch
 * @property {Function} startNewMaterial
 * @property {Array<Object>} filteredMaterials
 * @property {boolean} isCreatingMaterial
 * @property {string | null} selectedMaterialId
 * @property {Function} selectMaterial
 * @property {Object} materialForm
 * @property {Function} onMaterialFieldChange
 * @property {Function} saveMaterial
 * @property {boolean} materialSaving
 * @property {boolean} canDelete
 * @property {Function} deleteMaterial
 * @property {string} materialStatus
 * @property {string} materialError
 */

/**
 * @typedef {Object} InventoryWorkspacePanelsViewModel
 * @property {InventoryServicePanel} servicePanel
 * @property {InventoryMaterialPanel} materialPanel
 */

/**
 * @param {Object} config
 * @returns {InventoryWorkspacePanelsViewModel}
 */
function buildInventoryWorkspacePanels({
  services,
  serviceSearch,
  setServiceSearch,
  startNewService,
  filteredServices,
  isCreatingService,
  selectedServiceId,
  selectService,
  serviceForm,
  onServiceFieldChange,
  saveService,
  serviceSaving,
  canDelete,
  deleteService,
  serviceStatus,
  serviceError,
  materials,
  materialSearch,
  setMaterialSearch,
  startNewMaterial,
  filteredMaterials,
  isCreatingMaterial,
  selectedMaterialId,
  selectMaterial,
  materialForm,
  onMaterialFieldChange,
  saveMaterial,
  materialSaving,
  deleteMaterial,
  materialStatus,
  materialError
}) {
  return {
    servicePanel: {
      services,
      serviceSearch,
      setServiceSearch,
      startNewService,
      filteredServices,
      isCreatingService,
      selectedServiceId,
      selectService,
      serviceForm,
      onServiceFieldChange,
      saveService,
      serviceSaving,
      canDelete,
      deleteService,
      serviceStatus,
      serviceError
    },
    materialPanel: {
      materials,
      materialSearch,
      setMaterialSearch,
      startNewMaterial,
      filteredMaterials,
      isCreatingMaterial,
      selectedMaterialId,
      selectMaterial,
      materialForm,
      onMaterialFieldChange,
      saveMaterial,
      materialSaving,
      canDelete,
      deleteMaterial,
      materialStatus,
      materialError
    }
  };
}

export { buildInventoryWorkspacePanels };
