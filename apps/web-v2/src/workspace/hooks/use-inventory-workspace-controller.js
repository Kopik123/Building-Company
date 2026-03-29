import { useAuth } from '../../lib/auth.jsx';
import { normalizeText } from '../kit.jsx';
import { useInventoryWorkspaceState } from './use-inventory-workspace-state.js';
import { useInventoryWorkspaceActions } from './use-inventory-workspace-actions.js';
import { buildInventoryWorkspacePanels } from '../view-models/inventory-panels.js';

/**
 * @returns {import('../view-models/inventory-panels.js').InventoryWorkspacePanelsViewModel}
 */
function useInventoryWorkspaceController() {
  const { user } = useAuth();
  const role = normalizeText(user?.role || 'employee');
  const canDelete = ['manager', 'admin'].includes(role);
  const state = useInventoryWorkspaceState();
  const actions = useInventoryWorkspaceActions({
    serviceSaving: state.serviceSaving,
    setServiceSaving: state.setServiceSaving,
    setServiceStatus: state.setServiceStatus,
    setServiceError: state.setServiceError,
    serviceForm: state.serviceForm,
    selectedServiceId: state.selectedServiceId,
    services: state.services,
    setIsCreatingService: state.setIsCreatingService,
    setSelectedServiceId: state.setSelectedServiceId,
    setServiceForm: state.setServiceForm,
    canDelete,
    materialSaving: state.materialSaving,
    setMaterialSaving: state.setMaterialSaving,
    setMaterialStatus: state.setMaterialStatus,
    setMaterialError: state.setMaterialError,
    materialForm: state.materialForm,
    selectedMaterialId: state.selectedMaterialId,
    materials: state.materials,
    setIsCreatingMaterial: state.setIsCreatingMaterial,
    setSelectedMaterialId: state.setSelectedMaterialId,
    setMaterialForm: state.setMaterialForm
  });

  return buildInventoryWorkspacePanels({
    services: state.services,
    serviceSearch: state.serviceSearch,
    setServiceSearch: state.setServiceSearch,
    startNewService: state.startNewService,
    filteredServices: state.filteredServices,
    isCreatingService: state.isCreatingService,
    selectedServiceId: state.selectedServiceId,
    selectService: state.selectService,
    serviceForm: state.serviceForm,
    onServiceFieldChange: state.onServiceFieldChange,
    saveService: actions.saveService,
    serviceSaving: state.serviceSaving,
    canDelete,
    deleteService: actions.deleteService,
    serviceStatus: state.serviceStatus,
    serviceError: state.serviceError,
    materials: state.materials,
    materialSearch: state.materialSearch,
    setMaterialSearch: state.setMaterialSearch,
    startNewMaterial: state.startNewMaterial,
    filteredMaterials: state.filteredMaterials,
    isCreatingMaterial: state.isCreatingMaterial,
    selectedMaterialId: state.selectedMaterialId,
    selectMaterial: state.selectMaterial,
    materialForm: state.materialForm,
    onMaterialFieldChange: state.onMaterialFieldChange,
    saveMaterial: actions.saveMaterial,
    materialSaving: state.materialSaving,
    deleteMaterial: actions.deleteMaterial,
    materialStatus: state.materialStatus,
    materialError: state.materialError
  });
}

export { useInventoryWorkspaceController };
