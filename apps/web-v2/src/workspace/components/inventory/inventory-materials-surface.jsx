import { Surface } from '../../kit.jsx';
import { InventoryMaterialsList } from './inventory-materials-list.jsx';
import { InventoryMaterialEditor } from './inventory-material-editor.jsx';

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
      <InventoryMaterialsList
        materials={materials}
        filteredMaterials={filteredMaterials}
        isCreatingMaterial={isCreatingMaterial}
        selectedMaterialId={selectedMaterialId}
        selectMaterial={selectMaterial}
      />
      <InventoryMaterialEditor
        materialForm={materialForm}
        onMaterialFieldChange={onMaterialFieldChange}
        saveMaterial={saveMaterial}
        materialSaving={materialSaving}
        selectedMaterialId={selectedMaterialId}
        canDelete={canDelete}
        deleteMaterial={deleteMaterial}
        materialStatus={materialStatus}
        materialError={materialError}
      />
    </Surface>
  );
}

export { InventoryMaterialsSurface };
