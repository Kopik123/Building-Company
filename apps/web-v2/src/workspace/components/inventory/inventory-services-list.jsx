import { EmptyState, SelectableCard, StatusPill } from '../../kit.jsx';

function InventoryServicesList({ services, filteredServices, isCreatingService, selectedServiceId, selectService }) {
  if (services.loading) {
    return <p className="muted">Loading services...</p>;
  }

  if (services.error) {
    return <p className="error">{services.error}</p>;
  }

  if (!filteredServices.length) {
    return <EmptyState text="No service inventory rows found." />;
  }

  return (
    <div className="stack-list">
      {filteredServices.map((service) => (
        <SelectableCard key={service.id} selected={!isCreatingService && service.id === selectedServiceId} onSelect={() => selectService(service)}>
          <article className="summary-row">
            <div>
              <strong>{service.title}</strong>
              <p>{service.category || 'Uncategorised'}</p>
            </div>
            <div className="summary-row-meta">
              <span>{service.slug || 'No slug'}</span>
              <StatusPill tone={service.showOnWebsite ? 'accent' : 'neutral'}>{service.showOnWebsite ? 'Live' : 'Hidden'}</StatusPill>
            </div>
          </article>
        </SelectableCard>
      ))}
    </div>
  );
}

export { InventoryServicesList };
