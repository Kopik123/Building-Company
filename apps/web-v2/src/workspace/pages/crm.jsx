import { CrmWorkspacePanels } from '../components/crm-sections.jsx';
import { useCrmWorkspaceController } from '../hooks/use-crm-workspace-controller.js';

function CrmPage() {
  const { summaryPanel, createStaffPanel, clientsPanel, staffPanel } = useCrmWorkspaceController();

  return (
    <CrmWorkspacePanels
      summaryPanel={summaryPanel}
      createStaffPanel={createStaffPanel}
      clientsPanel={clientsPanel}
      staffPanel={staffPanel}
    />
  );
}

export { CrmPage };
