import { SERVICE_CATEGORIES, titleCase } from '../../kit.jsx';

function InventoryServiceEditor({
  serviceForm,
  onServiceFieldChange,
  saveService,
  serviceSaving,
  selectedServiceId,
  canDelete,
  deleteService,
  serviceStatus,
  serviceError
}) {
  return (
    <form className="editor-form" onSubmit={saveService}>
      <div className="form-grid">
        <label>
          Title
          <input value={serviceForm.title} onChange={onServiceFieldChange('title')} placeholder="Bathrooms Premium" required />
        </label>
        <label>
          Slug
          <input value={serviceForm.slug} onChange={onServiceFieldChange('slug')} placeholder="bathrooms-premium" />
        </label>
        <label>
          Category
          <select value={serviceForm.category} onChange={onServiceFieldChange('category')}>
            {SERVICE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {titleCase(category)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Base price from
          <input value={serviceForm.basePriceFrom} onChange={onServiceFieldChange('basePriceFrom')} type="number" min="0" step="0.01" />
        </label>
        <label>
          Display order
          <input value={serviceForm.displayOrder} onChange={onServiceFieldChange('displayOrder')} type="number" min="0" />
        </label>
        <label>
          Hero image URL
          <input value={serviceForm.heroImageUrl} onChange={onServiceFieldChange('heroImageUrl')} placeholder="/Gallery/premium/..." />
        </label>
      </div>
      <label>
        Short description
        <textarea value={serviceForm.shortDescription} onChange={onServiceFieldChange('shortDescription')} rows={3} placeholder="Short brochure-facing summary." />
      </label>
      <label>
        Full description
        <textarea value={serviceForm.fullDescription} onChange={onServiceFieldChange('fullDescription')} rows={4} placeholder="Longer internal/brochure copy." />
      </label>
      <div className="checkbox-row">
        <label>
          <input checked={serviceForm.showOnWebsite} onChange={onServiceFieldChange('showOnWebsite')} type="checkbox" />
          Show on website
        </label>
        <label>
          <input checked={serviceForm.isFeatured} onChange={onServiceFieldChange('isFeatured')} type="checkbox" />
          Featured service
        </label>
        <label>
          <input checked={serviceForm.isActive} onChange={onServiceFieldChange('isActive')} type="checkbox" />
          Active
        </label>
      </div>
      <div className="action-row">
        <button type="submit" disabled={serviceSaving}>
          {serviceSaving ? 'Saving...' : selectedServiceId ? 'Save service' : 'Create service'}
        </button>
        {canDelete && selectedServiceId ? (
          <button type="button" className="button-secondary" onClick={deleteService} disabled={serviceSaving}>
            Delete service
          </button>
        ) : null}
      </div>
      {serviceStatus ? <p className="muted">{serviceStatus}</p> : null}
      {serviceError ? <p className="error">{serviceError}</p> : null}
    </form>
  );
}

export { InventoryServiceEditor };
