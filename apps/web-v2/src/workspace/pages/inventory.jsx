import { InventoryWorkspacePanels } from '../components/inventory-sections.jsx';
import { useInventoryWorkspaceController } from '../hooks/use-inventory-workspace-controller.js';

function InventoryPage() {
  const { servicePanel, materialPanel } = useInventoryWorkspaceController();

  return <InventoryWorkspacePanels servicePanel={servicePanel} materialPanel={materialPanel} />;
}

export { InventoryPage };
