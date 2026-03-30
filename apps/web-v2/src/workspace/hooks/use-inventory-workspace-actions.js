import { v2Api } from '../../lib/api';
import {
  createServiceFormState,
  serviceToFormState,
  createMaterialFormState,
  materialToFormState,
  toNullablePayload,
  toNumberPayload
} from '../kit.jsx';

function useInventoryWorkspaceActions({
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
}) {
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

  return {
    saveService,
    deleteService,
    saveMaterial,
    deleteMaterial
  };
}

export { useInventoryWorkspaceActions };
