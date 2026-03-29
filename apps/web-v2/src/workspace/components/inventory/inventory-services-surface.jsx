import { Surface } from '../../kit.jsx';
import { InventoryServicesList } from './inventory-services-list.jsx';
import { InventoryServiceEditor } from './inventory-service-editor.jsx';

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
            <input value={serviceSearch} onChange={(event) => setServiceSearch(event.target.value)} placeholder="Search title, slug or category" />
          </label>
          <button type="button" className="button-secondary" onClick={startNewService}>
            New service
          </button>
        </div>
      }
    >
      <InventoryServicesList
        services={services}
        filteredServices={filteredServices}
        isCreatingService={isCreatingService}
        selectedServiceId={selectedServiceId}
        selectService={selectService}
      />
      <InventoryServiceEditor
        serviceForm={serviceForm}
        onServiceFieldChange={onServiceFieldChange}
        saveService={saveService}
        serviceSaving={serviceSaving}
        selectedServiceId={selectedServiceId}
        canDelete={canDelete}
        deleteService={deleteService}
        serviceStatus={serviceStatus}
        serviceError={serviceError}
      />
    </Surface>
  );
}

export { InventoryServicesSurface };
