import { Surface, EmptyState, SelectableCard, StatusPill, MATERIAL_CATEGORIES, titleCase } from '../../kit.jsx';

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
  );
}

export { InventoryMaterialsSurface };
