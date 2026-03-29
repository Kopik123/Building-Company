import { MATERIAL_CATEGORIES, titleCase } from '../../kit.jsx';

function InventoryMaterialEditor({
  materialForm,
  onMaterialFieldChange,
  saveMaterial,
  materialSaving,
  selectedMaterialId,
  canDelete,
  deleteMaterial,
  materialStatus,
  materialError
}) {
  return (
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
  );
}

export { InventoryMaterialEditor };
