import { InventoryServicesSurface } from './inventory/inventory-services-surface.jsx';
import { InventoryMaterialsSurface } from './inventory/inventory-materials-surface.jsx';

function InventoryWorkspacePanels({ servicePanel, materialPanel }) {
  return (
    <div className="grid-two">
      <InventoryServicesSurface servicePanel={servicePanel} />
      <InventoryMaterialsSurface materialPanel={materialPanel} />
    </div>
  );
}

export { InventoryWorkspacePanels };
