import {
  Surface,
  EmptyState,
  SelectableCard,
  StatusPill,
  SERVICE_CATEGORIES,
  MATERIAL_CATEGORIES,
  titleCase
} from '../kit.jsx';

function InventoryServicesSurface({ servicePanel }) {
  const {
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
  } = servicePanel;

  return (
    <Surface
      eyebrow="Inventory"
      title="Services"
      description="Create, tune and retire service catalogue rows directly in the rollout shell."
      actions={
        <div className="surface-actions cluster">
          <label className="inline-search">
            <span>Filter</span>
            <input
              value={serviceSearch}
              onChange={(event) => setServiceSearch(event.target.value)}
              placeholder="Search title, slug or category"
            />
          </label>
          <button type="button" className="button-secondary" onClick={startNewService}>
            New service
          </button>
        </div>
      }
    >
      {services.loading ? <p className="muted">Loading services...</p> : null}
      {services.error ? <p className="error">{services.error}</p> : null}
      {!services.loading && !services.error && !filteredServices.length ? (
        <EmptyState text="No service inventory rows found." />
      ) : null}

      <div className="stack-list">
        {filteredServices.map((service) => (
          <SelectableCard
            key={service.id}
            selected={!isCreatingService && service.id === selectedServiceId}
            onSelect={() => selectService(service)}
          >
            <article className="summary-row">
              <div>
                <strong>{service.title}</strong>
                <p>{service.category || 'Uncategorised'}</p>
              </div>
              <div className="summary-row-meta">
                <span>{service.slug || 'No slug'}</span>
                <StatusPill tone={service.showOnWebsite ? 'accent' : 'neutral'}>
                  {service.showOnWebsite ? 'Live' : 'Hidden'}
                </StatusPill>
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
          <textarea
            value={serviceForm.shortDescription}
            onChange={onServiceFieldChange('shortDescription')}
            rows={3}
            placeholder="Short brochure-facing summary."
          />
        </label>
        <label>
          Full description
          <textarea
            value={serviceForm.fullDescription}
            onChange={onServiceFieldChange('fullDescription')}
            rows={4}
            placeholder="Longer internal/brochure copy."
          />
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
  );
}

function InventoryMaterialsSurface({ materialPanel }) {
  const {
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
  } = materialPanel;

  return (
    <Surface
      eyebrow="Inventory"
      title="Materials"
      description="Create and maintain stock rows, thresholds and supplier details under the same v2 contract."
      actions={
        <div className="surface-actions cluster">
          <label className="inline-search">
            <span>Filter</span>
            <input
              value={materialSearch}
              onChange={(event) => setMaterialSearch(event.target.value)}
              placeholder="Search name, SKU or supplier"
            />
          </label>
          <button type="button" className="button-secondary" onClick={startNewMaterial}>
            New material
          </button>
        </div>
      }
    >
      {materials.loading ? <p className="muted">Loading materials...</p> : null}
      {materials.error ? <p className="error">{materials.error}</p> : null}
      {!materials.loading && !materials.error && !filteredMaterials.length ? (
        <EmptyState text="No material records found." />
      ) : null}

      <div className="stack-list">
        {filteredMaterials.map((material) => {
          const lowStock = Number(material?.stockQty || 0) <= Number(material?.minStockQty || 0);
          return (
            <SelectableCard
              key={material.id}
              selected={!isCreatingMaterial && material.id === selectedMaterialId}
              onSelect={() => selectMaterial(material)}
            >
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
          <textarea
            value={materialForm.notes}
            onChange={onMaterialFieldChange('notes')}
            rows={4}
            placeholder="Delivery note or stock remark."
          />
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
  );
}

function InventoryWorkspacePanels({ servicePanel, materialPanel }) {
  return (
    <div className="grid-two">
      <InventoryServicesSurface servicePanel={servicePanel} />
      <InventoryMaterialsSurface materialPanel={materialPanel} />
    </div>
  );
}

export { InventoryWorkspacePanels };
