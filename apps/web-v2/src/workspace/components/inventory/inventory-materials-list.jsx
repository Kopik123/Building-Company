import { EmptyState, SelectableCard, StatusPill } from '../../kit.jsx';

function InventoryMaterialsList({ materials, filteredMaterials, isCreatingMaterial, selectedMaterialId, selectMaterial }) {
  if (materials.loading) {
    return <p className="muted">Loading materials...</p>;
  }

  if (materials.error) {
    return <p className="error">{materials.error}</p>;
  }

  if (!filteredMaterials.length) {
    return <EmptyState text="No material records found." />;
  }

  return (
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
  );
}

export { InventoryMaterialsList };
