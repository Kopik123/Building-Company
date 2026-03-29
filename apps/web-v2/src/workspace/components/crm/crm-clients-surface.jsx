import { Surface } from '../../kit.jsx';
import { CrmClientsList } from './crm-clients-list.jsx';
import { CrmClientEditor } from './crm-client-editor.jsx';
import { CrmClientActivityList } from './crm-client-activity-list.jsx';

function CrmClientsSurface({ clientsPanel }) {
  const {
    clients,
    filteredClients,
    selectedClientId,
    setSelectedClientId,
    canEditPeople,
    selectedClient,
    onSaveClient,
    clientForm,
    onClientFieldChange,
    clientSaving,
    clientMessage,
    clientError,
    clientActivity
  } = clientsPanel;

  return (
    <Surface eyebrow="CRM" title="Clients" description="Current client records exposed by the v2 CRM contract, with manager-side editing in the rollout shell.">
      <CrmClientsList
        clients={clients}
        filteredClients={filteredClients}
        selectedClientId={selectedClientId}
        setSelectedClientId={setSelectedClientId}
      />
      <CrmClientEditor
        canEditPeople={canEditPeople}
        selectedClient={selectedClient}
        onSaveClient={onSaveClient}
        clientForm={clientForm}
        onClientFieldChange={onClientFieldChange}
        clientSaving={clientSaving}
        clientMessage={clientMessage}
        clientError={clientError}
      />
      <CrmClientActivityList canEditPeople={canEditPeople} selectedClient={selectedClient} clientActivity={clientActivity} />
    </Surface>
  );
}

export { CrmClientsSurface };
