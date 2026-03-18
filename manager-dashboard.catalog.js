(() => {
  const createManagerCatalogController = ({
    state,
    el,
    api,
    buildQuery,
    renderPagination,
    createControlField,
    createCheckboxField,
    createEditActions,
    createMutedNode,
    setStatus,
    escapeHtml,
    defaultPageSize,
    renderOperationsShell,
    requestManagerWorkflowRender,
    syncEstimateReferenceOptions
  }) => {
    const renderServices = () => {
      el.servicesList.innerHTML = '';
      if (!state.services.length) {
        el.servicesList.appendChild(createMutedNode('No services found for current filters.'));
        renderPagination(el.servicesPagination, el.servicesPrev, el.servicesNext, state.servicesPagination);
        renderOperationsShell();
        return;
      }

      const frag = document.createDocumentFragment();
      state.services.forEach((service) => {
        const card = document.createElement('article');
        card.className = 'dashboard-item';
        card.innerHTML = `<h3>${escapeHtml(service.title)}</h3><p class="muted">${escapeHtml(service.slug)} | ${escapeHtml(service.category)} | order ${escapeHtml(service.displayOrder)} | ${service.showOnWebsite ? 'public' : 'hidden'}</p>`;

        const row = document.createElement('div');
        row.className = 'dashboard-edit-grid dashboard-edit-grid--wide';

        const title = document.createElement('input');
        title.type = 'text';
        title.placeholder = 'Service title';
        title.value = service.title || '';

        const shortDescription = document.createElement('input');
        shortDescription.type = 'text';
        shortDescription.placeholder = 'Short description';
        shortDescription.value = service.shortDescription || '';

        const order = document.createElement('input');
        order.type = 'number';
        order.value = Number.isFinite(service.displayOrder) ? service.displayOrder : 0;

        const { field: publicField, input: publicCheck } = createCheckboxField('Visibility', 'Show on website', service.showOnWebsite);

        const save = document.createElement('button');
        save.type = 'button';
        save.className = 'btn btn-gold';
        save.textContent = 'Save';
        save.addEventListener('click', async () => {
          try {
            await api(`/api/manager/services/${service.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: title.value.trim(),
                shortDescription: shortDescription.value.trim(),
                displayOrder: Number.parseInt(order.value, 10) || 0,
                showOnWebsite: publicCheck.checked
              })
            });
            await loadServices();
            setStatus(el.serviceCreateStatus, 'Service updated.', 'success');
          } catch (error) {
            setStatus(el.serviceCreateStatus, error.message || 'Failed to update service.', 'error');
          }
        });

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn btn-outline';
        del.textContent = 'Delete';
        del.addEventListener('click', async () => {
          if (!window.confirm(`Delete service "${service.title}"?`)) return;
          try {
            await api(`/api/manager/services/${service.id}`, { method: 'DELETE' });
            await loadServices();
          } catch (error) {
            setStatus(el.serviceCreateStatus, error.message || 'Failed to delete service.', 'error');
          }
        });

        row.appendChild(createControlField('Title', title));
        row.appendChild(createControlField('Summary', shortDescription));
        row.appendChild(createControlField('Display Order', order));
        row.appendChild(publicField);
        row.appendChild(createEditActions([save, del]));
        card.appendChild(row);
        frag.appendChild(card);
      });

      el.servicesList.appendChild(frag);
      renderPagination(el.servicesPagination, el.servicesPrev, el.servicesNext, state.servicesPagination);
      renderOperationsShell();
      requestManagerWorkflowRender();
    };

    const renderMaterials = () => {
      el.materialsList.innerHTML = '';
      if (!state.materials.length) {
        el.materialsList.appendChild(createMutedNode('No materials found for current filters.'));
        renderPagination(el.materialsPagination, el.materialsPrev, el.materialsNext, state.materialsPagination);
        renderOperationsShell();
        return;
      }

      const frag = document.createDocumentFragment();
      state.materials.forEach((material) => {
        const lowStock = Number(material.stockQty) <= Number(material.minStockQty);
        const card = document.createElement('article');
        card.className = 'dashboard-item';
        card.innerHTML = `<h3>${escapeHtml(material.name)}</h3><p class="muted">${escapeHtml(material.category)} | SKU: ${escapeHtml(material.sku || '-')} | stock ${escapeHtml(material.stockQty)}/${escapeHtml(material.minStockQty)} | ${lowStock ? 'LOW STOCK' : 'OK'}</p>`;

        const row = document.createElement('div');
        row.className = 'dashboard-edit-grid dashboard-edit-grid--wide';

        const stock = document.createElement('input');
        stock.type = 'number';
        stock.step = '0.01';
        stock.value = material.stockQty ?? 0;

        const minStock = document.createElement('input');
        minStock.type = 'number';
        minStock.step = '0.01';
        minStock.value = material.minStockQty ?? 0;

        const unitCost = document.createElement('input');
        unitCost.type = 'number';
        unitCost.step = '0.01';
        unitCost.value = material.unitCost ?? '';

        const supplier = document.createElement('input');
        supplier.type = 'text';
        supplier.value = material.supplier || '';
        supplier.placeholder = 'Supplier';

        const save = document.createElement('button');
        save.type = 'button';
        save.className = 'btn btn-gold';
        save.textContent = 'Save';
        save.addEventListener('click', async () => {
          try {
            await api(`/api/manager/materials/${material.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                stockQty: Number(stock.value || 0),
                minStockQty: Number(minStock.value || 0),
                unitCost: unitCost.value ? Number(unitCost.value) : null,
                supplier: supplier.value.trim()
              })
            });
            await loadMaterials();
            setStatus(el.materialCreateStatus, 'Material updated.', 'success');
          } catch (error) {
            setStatus(el.materialCreateStatus, error.message || 'Failed to update material.', 'error');
          }
        });

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn btn-outline';
        del.textContent = 'Delete';
        del.addEventListener('click', async () => {
          if (!window.confirm(`Delete material "${material.name}"?`)) return;
          try {
            await api(`/api/manager/materials/${material.id}`, { method: 'DELETE' });
            await loadMaterials();
            setStatus(el.materialCreateStatus, 'Material deleted.', 'success');
          } catch (error) {
            setStatus(el.materialCreateStatus, error.message || 'Failed to delete material.', 'error');
          }
        });

        row.appendChild(createControlField('Stock Qty', stock));
        row.appendChild(createControlField('Min Stock', minStock));
        row.appendChild(createControlField('Unit Cost', unitCost));
        row.appendChild(createControlField('Supplier', supplier));
        row.appendChild(createEditActions([save, del]));
        card.appendChild(row);
        frag.appendChild(card);
      });

      el.materialsList.appendChild(frag);
      renderPagination(el.materialsPagination, el.materialsPrev, el.materialsNext, state.materialsPagination);
      renderOperationsShell();
      requestManagerWorkflowRender();
    };

    const loadServices = async () => {
      const payload = await api(`/api/manager/services?${buildQuery({
        page: state.servicesQuery.page,
        pageSize: state.servicesQuery.pageSize,
        q: state.servicesQuery.q,
        category: state.servicesQuery.category,
        showOnWebsite: state.servicesQuery.showOnWebsite
      })}`);
      state.services = Array.isArray(payload.services) ? payload.services : [];
      state.servicesPagination = payload.pagination || state.servicesPagination;
      renderServices();
      syncEstimateReferenceOptions();
    };

    const loadMaterials = async () => {
      const payload = await api(`/api/manager/materials?${buildQuery({
        page: state.materialsQuery.page,
        pageSize: state.materialsQuery.pageSize,
        q: state.materialsQuery.q,
        category: state.materialsQuery.category,
        lowStock: state.materialsQuery.lowStock
      })}`);
      state.materials = Array.isArray(payload.materials) ? payload.materials : [];
      state.materialsPagination = payload.pagination || state.materialsPagination;
      renderMaterials();
      syncEstimateReferenceOptions();
    };

    const applyServicesFiltersFromUI = () => {
      state.servicesQuery.q = String(el.servicesFilterQ.value || '').trim();
      state.servicesQuery.category = String(el.servicesFilterCategory.value || '').trim();
      state.servicesQuery.showOnWebsite = String(el.servicesFilterPublic.value || '').trim();
      state.servicesQuery.pageSize = Number.parseInt(el.servicesPageSize.value, 10) || defaultPageSize;
      state.servicesQuery.page = 1;
    };

    const applyMaterialsFiltersFromUI = () => {
      state.materialsQuery.q = String(el.materialsFilterQ.value || '').trim();
      state.materialsQuery.category = String(el.materialsFilterCategory.value || '').trim();
      state.materialsQuery.lowStock = String(el.materialsFilterLowStock.value || '').trim();
      state.materialsQuery.pageSize = Number.parseInt(el.materialsPageSize.value, 10) || defaultPageSize;
      state.materialsQuery.page = 1;
    };

    const loadServicesIfNeeded = async () => {
      if (state.lazyLoaded.services) return;
      state.lazyLoaded.services = true;
      await loadServices();
    };

    const loadMaterialsIfNeeded = async () => {
      if (state.lazyLoaded.materials) return;
      state.lazyLoaded.materials = true;
      await loadMaterials();
    };

    const ensureCatalogForEstimates = async () => {
      if (!state.lazyLoaded.services) {
        state.lazyLoaded.services = true;
        await loadServices();
      }
      if (!state.lazyLoaded.materials) {
        state.lazyLoaded.materials = true;
        await loadMaterials();
      }
    };

    const refreshAfterSeed = async (stats) => {
      const refreshTasks = [];
      const servicesChanged = Number(stats?.servicesCreated || 0) > 0 || Number(stats?.servicesUpdated || 0) > 0;
      const materialsChanged = Number(stats?.materialsCreated || 0) > 0 || Number(stats?.materialsUpdated || 0) > 0;

      if (servicesChanged) {
        state.servicesQuery.page = 1;
        state.lazyLoaded.services = true;
        refreshTasks.push(loadServices());
      }

      if (materialsChanged) {
        state.materialsQuery.page = 1;
        state.lazyLoaded.materials = true;
        refreshTasks.push(loadMaterials());
      }

      if (refreshTasks.length) {
        await Promise.all(refreshTasks);
      }
    };

    const handleServiceCreateSubmit = async (event) => {
      event.preventDefault();
      setStatus(el.serviceCreateStatus, 'Adding service...');
      const f = el.serviceCreateForm.elements;
      const payload = {
        title: String(f.title.value || '').trim(),
        slug: String(f.slug.value || '').trim() || undefined,
        category: String(f.category.value || 'other'),
        basePriceFrom: f.basePriceFrom.value ? Number(f.basePriceFrom.value) : null,
        shortDescription: String(f.shortDescription.value || '').trim(),
        heroImageUrl: String(f.heroImageUrl.value || '').trim(),
        displayOrder: Number.parseInt(f.displayOrder.value, 10) || 0,
        showOnWebsite: Boolean(f.showOnWebsite.checked),
        isFeatured: Boolean(f.isFeatured.checked)
      };
      if (!payload.title) {
        setStatus(el.serviceCreateStatus, 'Service title is required.', 'error');
        return;
      }
      try {
        await api('/api/manager/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        setStatus(el.serviceCreateStatus, 'Service added.', 'success');
        el.serviceCreateForm.reset();
        f.category.value = 'bathroom';
        f.displayOrder.value = '0';
        f.showOnWebsite.checked = true;
        state.servicesQuery.page = 1;
        state.lazyLoaded.services = true;
        await loadServices();
      } catch (error) {
        setStatus(el.serviceCreateStatus, error.message || 'Failed to add service.', 'error');
      }
    };

    const handleMaterialCreateSubmit = async (event) => {
      event.preventDefault();
      setStatus(el.materialCreateStatus, 'Adding material...');
      const f = el.materialCreateForm.elements;
      const payload = {
        name: String(f.name.value || '').trim(),
        sku: String(f.sku.value || '').trim() || undefined,
        category: String(f.category.value || 'other'),
        unit: String(f.unit.value || 'pcs').trim() || 'pcs',
        stockQty: Number(f.stockQty.value || 0),
        minStockQty: Number(f.minStockQty.value || 0),
        unitCost: f.unitCost.value ? Number(f.unitCost.value) : null,
        supplier: String(f.supplier.value || '').trim(),
        notes: String(f.notes.value || '').trim()
      };
      if (!payload.name) {
        setStatus(el.materialCreateStatus, 'Material name is required.', 'error');
        return;
      }
      try {
        await api('/api/manager/materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        setStatus(el.materialCreateStatus, 'Material added.', 'success');
        el.materialCreateForm.reset();
        f.category.value = 'tiles';
        f.unit.value = 'pcs';
        f.stockQty.value = '0';
        f.minStockQty.value = '0';
        state.materialsQuery.page = 1;
        state.lazyLoaded.materials = true;
        await loadMaterials();
      } catch (error) {
        setStatus(el.materialCreateStatus, error.message || 'Failed to add material.', 'error');
      }
    };

    const bindEvents = () => {
      el.serviceCreateForm.addEventListener('submit', handleServiceCreateSubmit);
      el.materialCreateForm.addEventListener('submit', handleMaterialCreateSubmit);

      el.servicesRefresh.addEventListener('click', () => {
        applyServicesFiltersFromUI();
        loadServices().catch((error) => window.alert(error.message || 'Could not load services'));
      });
      el.servicesPrev.addEventListener('click', () => {
        if (state.servicesQuery.page <= 1) return;
        state.servicesQuery.page -= 1;
        loadServices().catch((error) => window.alert(error.message || 'Could not load services'));
      });
      el.servicesNext.addEventListener('click', () => {
        if (state.servicesQuery.page >= Number(state.servicesPagination.totalPages || 1)) return;
        state.servicesQuery.page += 1;
        loadServices().catch((error) => window.alert(error.message || 'Could not load services'));
      });

      el.materialsRefresh.addEventListener('click', () => {
        applyMaterialsFiltersFromUI();
        loadMaterials().catch((error) => window.alert(error.message || 'Could not load materials'));
      });
      el.materialsPrev.addEventListener('click', () => {
        if (state.materialsQuery.page <= 1) return;
        state.materialsQuery.page -= 1;
        loadMaterials().catch((error) => window.alert(error.message || 'Could not load materials'));
      });
      el.materialsNext.addEventListener('click', () => {
        if (state.materialsQuery.page >= Number(state.materialsPagination.totalPages || 1)) return;
        state.materialsQuery.page += 1;
        loadMaterials().catch((error) => window.alert(error.message || 'Could not load materials'));
      });
    };

    return {
      loadServices,
      loadMaterials,
      loadServicesIfNeeded,
      loadMaterialsIfNeeded,
      ensureCatalogForEstimates,
      refreshAfterSeed,
      bindEvents
    };
  };

  window.LevelLinesManagerCatalog = {
    createManagerCatalogController
  };
})();
