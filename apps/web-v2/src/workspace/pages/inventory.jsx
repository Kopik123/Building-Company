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

export { InventoryPage };
