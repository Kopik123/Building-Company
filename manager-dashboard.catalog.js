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
    const parseIntegerInput = (value, fallback = 0) => Number.parseInt(value, 10) || fallback;

    const parseDecimalInput = (value, fallback = 0) => Number(value || fallback);

    const runCatalogAction = async (statusElement, workingMessage, successMessage, action, errorMessage) => {
      if (workingMessage) {
        setStatus(statusElement, workingMessage);
      }
      try {
        await action();
        if (successMessage) {
          setStatus(statusElement, successMessage, 'success');
        }
      } catch (error) {
        setStatus(statusElement, error.message || errorMessage, 'error');
        throw error;
      }
    };

    const showCatalogLoadError = (message) => {
      globalThis.alert(message);
    };

    const refreshServices = async () => {
      await loadServices();
      syncEstimateReferenceOptions();
    };

    const refreshMaterials = async () => {
      await loadMaterials();
      syncEstimateReferenceOptions();
    };

    const renderCatalogCollection = ({
      items,
      listElement,
      emptyMessage,
      paginationElement,
      prevButton,
      nextButton,
      paginationState,
      createCard
    }) => {
      listElement.innerHTML = '';
      if (!items.length) {
        listElement.appendChild(createMutedNode(emptyMessage));
        renderPagination(paginationElement, prevButton, nextButton, paginationState);
        renderOperationsShell();
        return false;
      }

      const frag = document.createDocumentFragment();
      items.forEach((item) => {
        frag.appendChild(createCard(item));
      });

      listElement.appendChild(frag);
      renderPagination(paginationElement, prevButton, nextButton, paginationState);
      renderOperationsShell();
      requestManagerWorkflowRender();
      return true;
    };

    const createButton = (label, className) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      button.textContent = label;
      return button;
    };

    const createTextInput = (placeholder, value = '') => {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = placeholder;
      input.value = value;
      return input;
    };

    const createNumberInput = (value, options = {}) => {
      const input = document.createElement('input');
      input.type = 'number';
      if (options.placeholder) {
        input.placeholder = options.placeholder;
      }
      if (options.step) {
        input.step = options.step;
      }
      input.value = value;
      return input;
    };

    const createCatalogEditRow = () => {
      const row = document.createElement('div');
      row.className = 'dashboard-edit-grid dashboard-edit-grid--wide';
      return row;
    };

    const buildServiceUpdatePayload = ({ title, shortDescription, order, publicCheck }) => ({
      title: title.value.trim(),
      shortDescription: shortDescription.value.trim(),
      displayOrder: parseIntegerInput(order.value),
      showOnWebsite: publicCheck.checked
    });

    const confirmServiceDeletion = (service) => globalThis.confirm(`Delete service "${service.title}"?`);

    const handleServiceSave = async (service, fields) => {
      await runCatalogAction(
        el.serviceCreateStatus,
        '',
        'Service updated.',
        async () => {
          await api(`/api/manager/services/${service.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildServiceUpdatePayload(fields))
          });
          await refreshServices();
        },
        'Failed to update service.'
      );
    };

    const handleServiceDelete = async (service) => {
      if (!confirmServiceDeletion(service)) {
        return;
      }
      await runCatalogAction(
        el.serviceCreateStatus,
        '',
        '',
        async () => {
          await api(`/api/manager/services/${service.id}`, { method: 'DELETE' });
          await refreshServices();
        },
        'Failed to delete service.'
      );
    };

    const createServiceCard = (service) => {
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      card.innerHTML = `<h3>${escapeHtml(service.title)}</h3><p class="muted">${escapeHtml(service.slug)} | ${escapeHtml(service.category)} | order ${escapeHtml(service.displayOrder)} | ${service.showOnWebsite ? 'public' : 'hidden'}</p>`;

      const row = createCatalogEditRow();
      const title = createTextInput('Service title', service.title || '');
      const shortDescription = createTextInput('Short description', service.shortDescription || '');
      const order = createNumberInput(Number.isFinite(service.displayOrder) ? service.displayOrder : 0);
      const { field: publicField, input: publicCheck } = createCheckboxField('Visibility', 'Show on website', service.showOnWebsite);
      const fields = { title, shortDescription, order, publicCheck };

      const save = createButton('Save', 'btn btn-gold');
      save.addEventListener('click', () => {
        handleServiceSave(service, fields).catch(() => {});
      });

      const del = createButton('Delete', 'btn btn-outline');
      del.addEventListener('click', () => {
        handleServiceDelete(service).catch(() => {});
      });

      row.appendChild(createControlField('Title', title));
      row.appendChild(createControlField('Summary', shortDescription));
      row.appendChild(createControlField('Display Order', order));
      row.appendChild(publicField);
      row.appendChild(createEditActions([save, del]));
      card.appendChild(row);
      return card;
    };

    const getMaterialStockState = (material) => Number(material.stockQty) <= Number(material.minStockQty);

    const buildMaterialUpdatePayload = ({ stock, minStock, unitCost, supplier }) => ({
      stockQty: parseDecimalInput(stock.value),
      minStockQty: parseDecimalInput(minStock.value),
      unitCost: unitCost.value ? Number(unitCost.value) : null,
      supplier: supplier.value.trim()
    });

    const confirmMaterialDeletion = (material) => globalThis.confirm(`Delete material "${material.name}"?`);

    const handleMaterialSave = async (material, fields) => {
      await runCatalogAction(
        el.materialCreateStatus,
        '',
        'Material updated.',
        async () => {
          await api(`/api/manager/materials/${material.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildMaterialUpdatePayload(fields))
          });
          await refreshMaterials();
        },
        'Failed to update material.'
      );
    };

    const handleMaterialDelete = async (material) => {
      if (!confirmMaterialDeletion(material)) {
        return;
      }
      await runCatalogAction(
        el.materialCreateStatus,
        '',
        'Material deleted.',
        async () => {
          await api(`/api/manager/materials/${material.id}`, { method: 'DELETE' });
          await refreshMaterials();
        },
        'Failed to delete material.'
      );
    };

    const createMaterialCard = (material) => {
      const lowStock = getMaterialStockState(material);
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      card.innerHTML = `<h3>${escapeHtml(material.name)}</h3><p class="muted">${escapeHtml(material.category)} | SKU: ${escapeHtml(material.sku || '-')} | stock ${escapeHtml(material.stockQty)}/${escapeHtml(material.minStockQty)} | ${lowStock ? 'LOW STOCK' : 'OK'}</p>`;

      const row = createCatalogEditRow();
      const stock = createNumberInput(material.stockQty ?? 0, { step: '0.01' });
      const minStock = createNumberInput(material.minStockQty ?? 0, { step: '0.01' });
      const unitCost = createNumberInput(material.unitCost ?? '', { step: '0.01' });
      const supplier = createTextInput('Supplier', material.supplier || '');
      const fields = { stock, minStock, unitCost, supplier };

      const save = createButton('Save', 'btn btn-gold');
      save.addEventListener('click', () => {
        handleMaterialSave(material, fields).catch(() => {});
      });

      const del = createButton('Delete', 'btn btn-outline');
      del.addEventListener('click', () => {
        handleMaterialDelete(material).catch(() => {});
      });

      row.appendChild(createControlField('Stock Qty', stock));
      row.appendChild(createControlField('Min Stock', minStock));
      row.appendChild(createControlField('Unit Cost', unitCost));
      row.appendChild(createControlField('Supplier', supplier));
      row.appendChild(createEditActions([save, del]));
      card.appendChild(row);
      return card;
    };

    const updateCatalogState = (itemsKey, paginationKey, payload, collectionKey) => {
      state[itemsKey] = Array.isArray(payload[collectionKey]) ? payload[collectionKey] : [];
      state[paginationKey] = payload.pagination || state[paginationKey];
    };

    const loadCatalogCollection = async ({ path, query, itemsKey, paginationKey, collectionKey, render }) => {
      const payload = await api(`/api/manager/${path}?${buildQuery(query)}`);
      updateCatalogState(itemsKey, paginationKey, payload, collectionKey);
      render();
    };

    const reloadServicesFromFilters = () => {
      applyServicesFiltersFromUI();
      loadServices().catch((error) => showCatalogLoadError(error.message || 'Could not load services'));
    };

    const loadPreviousServicesPage = () => {
      if (state.servicesQuery.page <= 1) {
        return;
      }
      state.servicesQuery.page -= 1;
      loadServices().catch((error) => showCatalogLoadError(error.message || 'Could not load services'));
    };

    const loadNextServicesPage = () => {
      if (state.servicesQuery.page >= Number(state.servicesPagination.totalPages || 1)) {
        return;
      }
      state.servicesQuery.page += 1;
      loadServices().catch((error) => showCatalogLoadError(error.message || 'Could not load services'));
    };

    const reloadMaterialsFromFilters = () => {
      applyMaterialsFiltersFromUI();
      loadMaterials().catch((error) => showCatalogLoadError(error.message || 'Could not load materials'));
    };

    const loadPreviousMaterialsPage = () => {
      if (state.materialsQuery.page <= 1) {
        return;
      }
      state.materialsQuery.page -= 1;
      loadMaterials().catch((error) => showCatalogLoadError(error.message || 'Could not load materials'));
    };

    const loadNextMaterialsPage = () => {
      if (state.materialsQuery.page >= Number(state.materialsPagination.totalPages || 1)) {
        return;
      }
      state.materialsQuery.page += 1;
      loadMaterials().catch((error) => showCatalogLoadError(error.message || 'Could not load materials'));
    };

    const renderServices = () => {
      renderCatalogCollection({
        items: state.services,
        listElement: el.servicesList,
        emptyMessage: 'No services found for current filters.',
        paginationElement: el.servicesPagination,
        prevButton: el.servicesPrev,
        nextButton: el.servicesNext,
        paginationState: state.servicesPagination,
        createCard: createServiceCard
      });
    };

    const renderMaterials = () => {
      renderCatalogCollection({
        items: state.materials,
        listElement: el.materialsList,
        emptyMessage: 'No materials found for current filters.',
        paginationElement: el.materialsPagination,
        prevButton: el.materialsPrev,
        nextButton: el.materialsNext,
        paginationState: state.materialsPagination,
        createCard: createMaterialCard
      });
    };

    const loadServices = async () => {
      await loadCatalogCollection({
        path: 'services',
        query: {
          page: state.servicesQuery.page,
          pageSize: state.servicesQuery.pageSize,
          q: state.servicesQuery.q,
          category: state.servicesQuery.category,
          showOnWebsite: state.servicesQuery.showOnWebsite
        },
        itemsKey: 'services',
        paginationKey: 'servicesPagination',
        collectionKey: 'services',
        render: renderServices
      });
    };

    const loadMaterials = async () => {
      await loadCatalogCollection({
        path: 'materials',
        query: {
          page: state.materialsQuery.page,
          pageSize: state.materialsQuery.pageSize,
          q: state.materialsQuery.q,
          category: state.materialsQuery.category,
          lowStock: state.materialsQuery.lowStock
        },
        itemsKey: 'materials',
        paginationKey: 'materialsPagination',
        collectionKey: 'materials',
        render: renderMaterials
      });
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
      await runCatalogAction(
        el.serviceCreateStatus,
        'Adding service...',
        'Service added.',
        async () => {
          await api('/api/manager/services', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          el.serviceCreateForm.reset();
          f.category.value = 'bathroom';
          f.displayOrder.value = '0';
          f.showOnWebsite.checked = true;
          state.servicesQuery.page = 1;
          state.lazyLoaded.services = true;
          await refreshServices();
        },
        'Failed to add service.'
      ).catch(() => {});
    };

    const handleMaterialCreateSubmit = async (event) => {
      event.preventDefault();
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
      await runCatalogAction(
        el.materialCreateStatus,
        'Adding material...',
        'Material added.',
        async () => {
          await api('/api/manager/materials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          el.materialCreateForm.reset();
          f.category.value = 'tiles';
          f.unit.value = 'pcs';
          f.stockQty.value = '0';
          f.minStockQty.value = '0';
          state.materialsQuery.page = 1;
          state.lazyLoaded.materials = true;
          await refreshMaterials();
        },
        'Failed to add material.'
      ).catch(() => {});
    };

    const bindEvents = () => {
      el.serviceCreateForm.addEventListener('submit', handleServiceCreateSubmit);
      el.materialCreateForm.addEventListener('submit', handleMaterialCreateSubmit);
      el.servicesRefresh.addEventListener('click', reloadServicesFromFilters);
      el.servicesPrev.addEventListener('click', loadPreviousServicesPage);
      el.servicesNext.addEventListener('click', loadNextServicesPage);
      el.materialsRefresh.addEventListener('click', reloadMaterialsFromFilters);
      el.materialsPrev.addEventListener('click', loadPreviousMaterialsPage);
      el.materialsNext.addEventListener('click', loadNextMaterialsPage);
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

  globalThis.LevelLinesManagerCatalog = {
    createManagerCatalogController
  };
})();
