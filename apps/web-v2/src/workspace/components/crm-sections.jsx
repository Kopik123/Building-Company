import { CrmSummarySurface } from './crm/crm-summary-surface.jsx';
import { CrmCreateStaffSurface } from './crm/crm-create-staff-surface.jsx';
import { CrmClientsSurface } from './crm/crm-clients-surface.jsx';
import { CrmStaffSurface } from './crm/crm-staff-surface.jsx';

function CrmWorkspacePanels({ summaryPanel, createStaffPanel, clientsPanel, staffPanel }) {
  return (
    <div className="page-stack">
      <CrmSummarySurface summaryPanel={summaryPanel} />
      <CrmCreateStaffSurface createStaffPanel={createStaffPanel} />
      <div className="grid-two">
        <CrmClientsSurface clientsPanel={clientsPanel} />
        <CrmStaffSurface staffPanel={staffPanel} />
      </div>
    </div>
  );
}

export { CrmWorkspacePanels };
