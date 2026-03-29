import React from 'react';
import { useAuth } from '../../lib/auth.jsx';
import { InventoryWorkspacePanels } from '../components/inventory-sections.jsx';
import { useInventoryWorkspaceState } from '../hooks/use-inventory-workspace-state.js';
import { useInventoryWorkspaceActions } from '../hooks/use-inventory-workspace-actions.js';
import { buildInventoryWorkspacePanels } from '../view-models/inventory-panels.js';
import { normalizeText } from '../kit.jsx';

function InventoryPage() {
  const { user } = useAuth();
  const role = normalizeText(user?.role || 'employee');
  const canDelete = ['manager', 'admin'].includes(role);
  const {
    services,
    materials,
    serviceSearch,
    setServiceSearch,
    materialSearch,
    setMaterialSearch,
    selectedServiceId,
    setSelectedServiceId,
    selectedMaterialId,
    setSelectedMaterialId,
    isCreatingService,
    setIsCreatingService,
    isCreatingMaterial,
    setIsCreatingMaterial,
    serviceForm,
    setServiceForm,
    materialForm,
    setMaterialForm,
    serviceSaving,
    setServiceSaving,
    materialSaving,
    setMaterialSaving,
    serviceStatus,
    setServiceStatus,
    serviceError,
    setServiceError,
    materialStatus,
    setMaterialStatus,
    materialError,
    setMaterialError,
    filteredServices,
    filteredMaterials,
    onServiceFieldChange,
    onMaterialFieldChange,
    startNewService,
    startNewMaterial,
    selectService,
    selectMaterial
  } = useInventoryWorkspaceState();

  const { saveService, deleteService, saveMaterial, deleteMaterial } = useInventoryWorkspaceActions({
    serviceSaving,
    setServiceSaving,
    setServiceStatus,
    setServiceError,
    serviceForm,
    selectedServiceId,
    services,
    setIsCreatingService,
    setSelectedServiceId,
    setServiceForm,
    canDelete,
    materialSaving,
    setMaterialSaving,
    setMaterialStatus,
    setMaterialError,
    materialForm,
    selectedMaterialId,
    materials,
    setIsCreatingMaterial,
    setSelectedMaterialId,
    setMaterialForm
  });

  const { servicePanel, materialPanel } = buildInventoryWorkspacePanels({
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
  });

  return <InventoryWorkspacePanels servicePanel={servicePanel} materialPanel={materialPanel} />;
}

export { InventoryPage };
