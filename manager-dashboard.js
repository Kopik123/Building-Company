(() => {
  const TOKEN_KEY = 'll_auth_token';
  const USER_KEY = 'll_auth_user';
  const DEFAULT_PAGE_SIZE = 25;

  const el = {
    session: document.getElementById('dashboard-session'),
    logout: document.getElementById('dashboard-logout'),
    seedBtn: document.getElementById('dashboard-seed-btn'),
    seedStatus: document.getElementById('dashboard-seed-status'),
    projectCreateForm: document.getElementById('project-create-form'),
    projectCreateStatus: document.getElementById('project-create-status'),
    projectCreateClientSuggestions: document.getElementById('project-create-client-suggestions'),
    projectCreateClientLookupStatus: document.getElementById('project-create-client-lookup-status'),
    projectCreateManagerSuggestions: document.getElementById('project-create-manager-suggestions'),
    projectCreateManagerLookupStatus: document.getElementById('project-create-manager-lookup-status'),
    projectsFilterQ: document.getElementById('projects-filter-q'),
    projectsFilterStatus: document.getElementById('projects-filter-status'),
    projectsFilterGallery: document.getElementById('projects-filter-gallery'),
    projectsFilterApply: document.getElementById('projects-filter-apply'),
    projectsPageSize: document.getElementById('projects-page-size'),
    projectsPrev: document.getElementById('projects-prev-btn'),
    projectsNext: document.getElementById('projects-next-btn'),
    projectsPagination: document.getElementById('projects-pagination'),
    projectsList: document.getElementById('projects-list'),
    projectEditorCard: document.getElementById('project-editor-card'),
    projectEditForm: document.getElementById('project-edit-form'),
    projectEditStatus: document.getElementById('project-edit-status'),
    projectDelete: document.getElementById('project-delete-btn'),
    projectEditClientSuggestions: document.getElementById('project-edit-client-suggestions'),
    projectEditClientLookupStatus: document.getElementById('project-edit-client-lookup-status'),
    projectEditManagerSuggestions: document.getElementById('project-edit-manager-suggestions'),
    projectEditManagerLookupStatus: document.getElementById('project-edit-manager-lookup-status'),
    mediaUploadForm: document.getElementById('media-upload-form'),
    mediaUploadStatus: document.getElementById('media-upload-status'),
    mediaList: document.getElementById('media-list'),
    quotesFilterQ: document.getElementById('quotes-filter-q'),
    quotesFilterStatus: document.getElementById('quotes-filter-status'),
    quotesRefresh: document.getElementById('quotes-refresh-btn'),
    quotesPageSize: document.getElementById('quotes-page-size'),
    quotesPrev: document.getElementById('quotes-prev-btn'),
    quotesNext: document.getElementById('quotes-next-btn'),
    quotesPagination: document.getElementById('quotes-pagination'),
    quotesList: document.getElementById('quotes-list'),
    serviceCreateForm: document.getElementById('service-create-form'),
    serviceCreateStatus: document.getElementById('service-create-status'),
    servicesFilterQ: document.getElementById('services-filter-q'),
    servicesFilterCategory: document.getElementById('services-filter-category'),
    servicesFilterPublic: document.getElementById('services-filter-public'),
    servicesRefresh: document.getElementById('services-refresh-btn'),
    servicesPageSize: document.getElementById('services-page-size'),
    servicesPrev: document.getElementById('services-prev-btn'),
    servicesNext: document.getElementById('services-next-btn'),
    servicesPagination: document.getElementById('services-pagination'),
    servicesList: document.getElementById('services-list'),
    materialCreateForm: document.getElementById('material-create-form'),
    materialCreateStatus: document.getElementById('material-create-status'),
    materialsFilterQ: document.getElementById('materials-filter-q'),
    materialsFilterCategory: document.getElementById('materials-filter-category'),
    materialsFilterLowStock: document.getElementById('materials-filter-low-stock'),
    materialsRefresh: document.getElementById('materials-refresh-btn'),
    materialsPageSize: document.getElementById('materials-page-size'),
    materialsPrev: document.getElementById('materials-prev-btn'),
    materialsNext: document.getElementById('materials-next-btn'),
    materialsPagination: document.getElementById('materials-pagination'),
    materialsList: document.getElementById('materials-list')
  };

  if (Object.values(el).some((v) => !v)) return;

  const state = {
    token: '',
    user: null,
    selectedProjectId: '',
    projects: [],
    quotes: [],
    services: [],
    materials: [],
    projectsQuery: { page: 1, pageSize: DEFAULT_PAGE_SIZE, q: '', status: '', showInGallery: '' },
    projectsPagination: { page: 1, totalPages: 1, total: 0, pageSize: DEFAULT_PAGE_SIZE },
    quotesQuery: { page: 1, pageSize: DEFAULT_PAGE_SIZE, q: '', status: '' },
    quotesPagination: { page: 1, totalPages: 1, total: 0, pageSize: DEFAULT_PAGE_SIZE },
    servicesQuery: { page: 1, pageSize: DEFAULT_PAGE_SIZE, q: '', category: '', showOnWebsite: '' },
    servicesPagination: { page: 1, totalPages: 1, total: 0, pageSize: DEFAULT_PAGE_SIZE },
    materialsQuery: { page: 1, pageSize: DEFAULT_PAGE_SIZE, q: '', category: '', lowStock: '' },
    materialsPagination: { page: 1, totalPages: 1, total: 0, pageSize: DEFAULT_PAGE_SIZE }
  };
  const USER_SEARCH_CACHE_TTL_MS = 30 * 1000;
  const userSearchCache = new Map();

  const parseError = (payload) => {
    if (payload?.error) return payload.error;
    if (Array.isArray(payload?.errors) && payload.errors.length) {
      return payload.errors.map((item) => item?.msg).filter(Boolean).join(', ');
    }
    return 'Request failed.';
  };

  const setStatus = (node, msg, type) => {
    node.className = 'form-status';
    if (type === 'success') node.classList.add('is-success');
    if (type === 'error') node.classList.add('is-error');
    node.textContent = msg || '';
  };

  const setSmallStatus = (node, msg, type) => {
    node.textContent = msg || '';
    node.className = type === 'error' ? 'muted form-status is-error' : 'muted';
  };

  const renderPagination = (node, prevBtn, nextBtn, pagination) => {
    const page = Number(pagination?.page || 1);
    const totalPages = Math.max(1, Number(pagination?.totalPages || 1));
    const total = Number(pagination?.total || 0);
    node.textContent = `Page ${page} / ${totalPages} (${total} items)`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= totalPages;
  };

  const normUuid = (value) => {
    const normalized = String(value || '').trim();
    return normalized || null;
  };

  const normEmail = (value) => String(value || '').trim().toLowerCase();
  const toDateInputValue = (value) => (String(value || '').trim() ? String(value).slice(0, 10) : '');

  const buildQuery = (params) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (typeof value === 'undefined' || value === null || value === '') return;
      q.set(key, String(value));
    });
    return q.toString();
  };

  const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    state.token = '';
    state.user = null;
  };

  const api = async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Authorization') && state.token) headers.set('Authorization', `Bearer ${state.token}`);
    const res = await fetch(url, { ...options, headers });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(parseError(payload));
    return payload;
  };

  const selectedProject = () => state.projects.find((p) => p.id === state.selectedProjectId) || null;

  const renderSession = () => {
    if (!state.user) {
      el.session.textContent = 'No active session. Log in as employee/manager/admin.';
      return;
    }
    el.session.textContent = `Logged as ${state.user.name || state.user.email} (${state.user.role})`;
  };

  const renderProjects = () => {
    el.projectsList.innerHTML = '';
    if (!state.projects.length) {
      el.projectsList.innerHTML = '<p class=\"muted\">No projects found for current filters.</p>';
      el.projectEditorCard.hidden = true;
      return;
    }
    const frag = document.createDocumentFragment();
    state.projects.forEach((project) => {
      const card = document.createElement('article');
      card.className = `dashboard-item ${project.id === state.selectedProjectId ? 'is-active' : ''}`;
      card.innerHTML = `<h3>${project.title}</h3><p class=\"muted\">${project.status} | ${project.location || 'No location'} | ${project.imageCount || 0} images/${project.documentCount || 0} docs | Client: ${project.client?.email || 'No client'} | Staff: ${project.assignedManager?.email || 'No staff'}</p>`;
      const row = document.createElement('div');
      row.className = 'dashboard-actions-row';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline';
      btn.textContent = 'Select';
      btn.addEventListener('click', () => {
        state.selectedProjectId = project.id;
        fillProjectEditor();
        renderProjects();
      });
      row.appendChild(btn);
      card.appendChild(row);
      frag.appendChild(card);
    });
    el.projectsList.appendChild(frag);
    renderPagination(el.projectsPagination, el.projectsPrev, el.projectsNext, state.projectsPagination);
  };

  const renderMedia = () => {
    el.mediaList.innerHTML = '';
    const project = selectedProject();
    if (!project) return;
    const media = Array.isArray(project.media) ? project.media : [];
    if (!media.length) {
      el.mediaList.innerHTML = '<p class=\"muted\">No media uploaded for this project.</p>';
      return;
    }
    const frag = document.createDocumentFragment();
    media.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'dashboard-media-item';
      card.innerHTML = `<div class=\"dashboard-media-top\"><strong>${item.filename}</strong><span class=\"muted\">${item.mediaType}</span></div>`;
      const row = document.createElement('div');
      row.className = 'dashboard-actions-row';
      const openLink = document.createElement('a');
      openLink.href = item.url;
      openLink.target = '_blank';
      openLink.rel = 'noopener noreferrer';
      openLink.className = 'btn btn-outline';
      openLink.textContent = 'Open';
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn btn-outline';
      del.textContent = 'Delete';
      del.addEventListener('click', async () => {
        if (!window.confirm(`Delete file \"${item.filename}\"?`)) return;
        try {
          await api(`/api/manager/projects/${project.id}/media/${item.id}`, { method: 'DELETE' });
          await loadProjects(project.id);
          setStatus(el.mediaUploadStatus, 'Media deleted.', 'success');
        } catch (error) {
          setStatus(el.mediaUploadStatus, error.message || 'Failed to delete media.', 'error');
        }
      });
      row.appendChild(openLink);
      row.appendChild(del);
      card.appendChild(row);
      frag.appendChild(card);
    });
    el.mediaList.appendChild(frag);
  };

  const fillProjectEditor = () => {
    const project = selectedProject();
    if (!project) {
      el.projectEditorCard.hidden = true;
      return;
    }
    const f = el.projectEditForm.elements;
    el.projectEditorCard.hidden = false;
    f.id.value = project.id;
    f.title.value = project.title || '';
    f.location.value = project.location || '';
    f.status.value = project.status || 'planning';
    f.quoteId.value = project.quoteId || '';
    f.clientEmail.value = project.client?.email || '';
    f.assignedManagerEmail.value = project.assignedManager?.email || '';
    f.galleryOrder.value = Number.isFinite(project.galleryOrder) ? project.galleryOrder : 0;
    f.budgetEstimate.value = project.budgetEstimate || '';
    f.startDate.value = toDateInputValue(project.startDate);
    f.endDate.value = toDateInputValue(project.endDate);
    f.showInGallery.checked = Boolean(project.showInGallery);
    f.isActive.checked = Boolean(project.isActive);
    f.description.value = project.description || '';
    setSmallStatus(el.projectEditClientLookupStatus, '', '');
    setSmallStatus(el.projectEditManagerLookupStatus, '', '');
    renderMedia();
  };

  const renderQuotes = () => {
    el.quotesList.innerHTML = '';
    if (!state.quotes.length) {
      el.quotesList.innerHTML = '<p class=\"muted\">No quotes found for current filters.</p>';
      renderPagination(el.quotesPagination, el.quotesPrev, el.quotesNext, state.quotesPagination);
      return;
    }

    const canManage = ['manager', 'admin'].includes(String(state.user?.role || '').toLowerCase());
    const frag = document.createDocumentFragment();
    state.quotes.forEach((quote) => {
      const owner = quote.guestName || quote.client?.name || quote.client?.email || 'Unknown client';
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      card.innerHTML = `<h3>${quote.projectType} | ${owner}</h3><p class=\"muted\">${quote.status} | priority ${quote.priority} | ${quote.location || '-'} ${quote.postcode || ''}</p><p>${quote.description || ''}</p>`;
      const row = document.createElement('div');
      row.className = 'dashboard-actions-row';
      const statusSelect = document.createElement('select');
      ['pending', 'in_progress', 'responded', 'closed'].forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        option.selected = quote.status === value;
        statusSelect.appendChild(option);
      });
      const prioritySelect = document.createElement('select');
      ['low', 'medium', 'high'].forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        option.selected = quote.priority === value;
        prioritySelect.appendChild(option);
      });
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn btn-gold';
      saveBtn.textContent = 'Save';
      saveBtn.disabled = !canManage;
      saveBtn.addEventListener('click', async () => {
        try {
          await api(`/api/manager/quotes/${quote.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: statusSelect.value, priority: prioritySelect.value })
          });
          await loadQuotes();
        } catch (error) {
          window.alert(error.message || 'Failed to update quote');
        }
      });
      row.appendChild(statusSelect);
      row.appendChild(prioritySelect);
      if (!quote.assignedManagerId && quote.status === 'pending' && canManage) {
        const acceptBtn = document.createElement('button');
        acceptBtn.type = 'button';
        acceptBtn.className = 'btn btn-outline';
        acceptBtn.textContent = 'Accept';
        acceptBtn.addEventListener('click', async () => {
          try {
            await api(`/api/manager/quotes/${quote.id}/accept`, { method: 'POST' });
            await loadQuotes();
          } catch (error) {
            window.alert(error.message || 'Failed to accept quote');
          }
        });
        row.appendChild(acceptBtn);
      }
      row.appendChild(saveBtn);
      card.appendChild(row);
      frag.appendChild(card);
    });
    el.quotesList.appendChild(frag);
    renderPagination(el.quotesPagination, el.quotesPrev, el.quotesNext, state.quotesPagination);
  };

  const renderServices = () => {
    el.servicesList.innerHTML = '';
    if (!state.services.length) {
      el.servicesList.innerHTML = '<p class=\"muted\">No services found for current filters.</p>';
      renderPagination(el.servicesPagination, el.servicesPrev, el.servicesNext, state.servicesPagination);
      return;
    }
    const frag = document.createDocumentFragment();
    state.services.forEach((service) => {
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      card.innerHTML = `<h3>${service.title}</h3><p class=\"muted\">${service.slug} | ${service.category} | order ${service.displayOrder} | ${service.showOnWebsite ? 'public' : 'hidden'}</p>`;
      const row = document.createElement('div');
      row.className = 'dashboard-actions-row';
      const title = document.createElement('input');
      title.type = 'text';
      title.value = service.title || '';
      const shortDescription = document.createElement('input');
      shortDescription.type = 'text';
      shortDescription.value = service.shortDescription || '';
      const order = document.createElement('input');
      order.type = 'number';
      order.value = Number.isFinite(service.displayOrder) ? service.displayOrder : 0;
      const publicWrap = document.createElement('label');
      publicWrap.className = 'dashboard-inline-check';
      const publicCheck = document.createElement('input');
      publicCheck.type = 'checkbox';
      publicCheck.checked = Boolean(service.showOnWebsite);
      const publicText = document.createElement('span');
      publicText.textContent = 'Public';
      publicWrap.appendChild(publicCheck);
      publicWrap.appendChild(publicText);
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
        if (!window.confirm(`Delete service \"${service.title}\"?`)) return;
        try {
          await api(`/api/manager/services/${service.id}`, { method: 'DELETE' });
          await loadServices();
        } catch (error) {
          setStatus(el.serviceCreateStatus, error.message || 'Failed to delete service.', 'error');
        }
      });
      row.appendChild(title);
      row.appendChild(shortDescription);
      row.appendChild(order);
      row.appendChild(publicWrap);
      row.appendChild(save);
      row.appendChild(del);
      card.appendChild(row);
      frag.appendChild(card);
    });
    el.servicesList.appendChild(frag);
    renderPagination(el.servicesPagination, el.servicesPrev, el.servicesNext, state.servicesPagination);
  };

  const renderMaterials = () => {
    el.materialsList.innerHTML = '';
    if (!state.materials.length) {
      el.materialsList.innerHTML = '<p class=\"muted\">No materials found for current filters.</p>';
      renderPagination(el.materialsPagination, el.materialsPrev, el.materialsNext, state.materialsPagination);
      return;
    }
    const frag = document.createDocumentFragment();
    state.materials.forEach((material) => {
      const lowStock = Number(material.stockQty) <= Number(material.minStockQty);
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      card.innerHTML = `<h3>${material.name}</h3><p class=\"muted\">${material.category} | SKU: ${material.sku || '-'} | stock ${material.stockQty}/${material.minStockQty} | ${lowStock ? 'LOW STOCK' : 'OK'}</p>`;
      const row = document.createElement('div');
      row.className = 'dashboard-actions-row';
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
        if (!window.confirm(`Delete material \"${material.name}\"?`)) return;
        try {
          await api(`/api/manager/materials/${material.id}`, { method: 'DELETE' });
          await loadMaterials();
          setStatus(el.materialCreateStatus, 'Material deleted.', 'success');
        } catch (error) {
          setStatus(el.materialCreateStatus, error.message || 'Failed to delete material.', 'error');
        }
      });
      row.appendChild(stock);
      row.appendChild(minStock);
      row.appendChild(unitCost);
      row.appendChild(supplier);
      row.appendChild(save);
      row.appendChild(del);
      card.appendChild(row);
      frag.appendChild(card);
    });
    el.materialsList.appendChild(frag);
    renderPagination(el.materialsPagination, el.materialsPrev, el.materialsNext, state.materialsPagination);
  };

  const loadProjects = async (selectedId) => {
    const payload = await api(`/api/manager/projects?${buildQuery({
      includeMedia: true,
      page: state.projectsQuery.page,
      pageSize: state.projectsQuery.pageSize,
      q: state.projectsQuery.q,
      status: state.projectsQuery.status,
      showInGallery: state.projectsQuery.showInGallery
    })}`);
    state.projects = Array.isArray(payload.projects) ? payload.projects : [];
    state.projectsPagination = payload.pagination || state.projectsPagination;
    if (selectedId) state.selectedProjectId = selectedId;
    if (!state.projects.some((item) => item.id === state.selectedProjectId)) state.selectedProjectId = state.projects[0]?.id || '';
    renderProjects();
    fillProjectEditor();
  };

  const loadQuotes = async () => {
    const payload = await api(`/api/manager/quotes?${buildQuery({
      page: state.quotesQuery.page,
      pageSize: state.quotesQuery.pageSize,
      q: state.quotesQuery.q,
      status: state.quotesQuery.status
    })}`);
    state.quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
    state.quotesPagination = payload.pagination || state.quotesPagination;
    renderQuotes();
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
  };

  const searchUsersByEmail = async (type, queryText) => {
    const normalized = normEmail(queryText);
    if (!normalized || normalized.length < 2) return [];
    const cacheKey = `${type}:${normalized}`;
    const cached = userSearchCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.users;
    }
    const path = type === 'client' ? '/api/manager/clients/search' : '/api/manager/staff/search';
    const key = type === 'client' ? 'clients' : 'staff';
    const payload = await api(`${path}?${buildQuery({ q: normalized, pageSize: 6 })}`);
    const users = Array.isArray(payload[key]) ? payload[key] : [];
    userSearchCache.set(cacheKey, {
      users,
      expiresAt: Date.now() + USER_SEARCH_CACHE_TTL_MS
    });
    return users;
  };

  const fillDatalist = (datalist, users) => {
    datalist.innerHTML = '';
    users.forEach((user) => {
      const option = document.createElement('option');
      option.value = user.email || '';
      option.label = user.name ? `${user.name}` : user.email || '';
      datalist.appendChild(option);
    });
  };

  const setupLiveEmailAutocomplete = ({ input, datalist, type, statusNode }) => {
    let debounceTimer = null;
    let requestCounter = 0;

    const runSearch = () => {
      const value = normEmail(input.value);
      clearTimeout(debounceTimer);
      if (value.length < 2) {
        fillDatalist(datalist, []);
        if (!value) setSmallStatus(statusNode, '', '');
        return;
      }

      debounceTimer = setTimeout(async () => {
        const requestId = ++requestCounter;
        try {
          const users = await searchUsersByEmail(type, value);
          if (requestId !== requestCounter) return;
          fillDatalist(datalist, users);
          if (!users.length) {
            setSmallStatus(statusNode, 'No matches.', 'error');
            return;
          }
          const exact = users.find((user) => normEmail(user.email) === value);
          if (exact) {
            setSmallStatus(statusNode, `Matched: ${exact.name || exact.email} (${exact.email})`, '');
          } else {
            setSmallStatus(statusNode, `${users.length} suggestion(s). Keep typing or pick from list.`, '');
          }
        } catch (error) {
          if (requestId !== requestCounter) return;
          fillDatalist(datalist, []);
          setSmallStatus(statusNode, error.message || 'Lookup failed.', 'error');
        }
      }, 260);
    };

    input.addEventListener('input', runSearch);
    input.addEventListener('blur', () => {
      const value = normEmail(input.value);
      if (!value) {
        setSmallStatus(statusNode, '', '');
      }
    });
  };

  const applyProjectsFiltersFromUI = () => {
    state.projectsQuery.q = String(el.projectsFilterQ.value || '').trim();
    state.projectsQuery.status = String(el.projectsFilterStatus.value || '').trim();
    state.projectsQuery.showInGallery = String(el.projectsFilterGallery.value || '').trim();
    state.projectsQuery.pageSize = Number.parseInt(el.projectsPageSize.value, 10) || DEFAULT_PAGE_SIZE;
    state.projectsQuery.page = 1;
  };

  const applyQuotesFiltersFromUI = () => {
    state.quotesQuery.q = String(el.quotesFilterQ.value || '').trim();
    state.quotesQuery.status = String(el.quotesFilterStatus.value || '').trim();
    state.quotesQuery.pageSize = Number.parseInt(el.quotesPageSize.value, 10) || DEFAULT_PAGE_SIZE;
    state.quotesQuery.page = 1;
  };

  const applyServicesFiltersFromUI = () => {
    state.servicesQuery.q = String(el.servicesFilterQ.value || '').trim();
    state.servicesQuery.category = String(el.servicesFilterCategory.value || '').trim();
    state.servicesQuery.showOnWebsite = String(el.servicesFilterPublic.value || '').trim();
    state.servicesQuery.pageSize = Number.parseInt(el.servicesPageSize.value, 10) || DEFAULT_PAGE_SIZE;
    state.servicesQuery.page = 1;
  };

  const applyMaterialsFiltersFromUI = () => {
    state.materialsQuery.q = String(el.materialsFilterQ.value || '').trim();
    state.materialsQuery.category = String(el.materialsFilterCategory.value || '').trim();
    state.materialsQuery.lowStock = String(el.materialsFilterLowStock.value || '').trim();
    state.materialsQuery.pageSize = Number.parseInt(el.materialsPageSize.value, 10) || DEFAULT_PAGE_SIZE;
    state.materialsQuery.page = 1;
  };

  const bootstrap = async () => {
    state.token = getToken();
    if (!state.token) {
      el.session.textContent = 'No token. Log in on /auth.html.';
      return;
    }
    try {
      const payload = await api('/api/auth/me');
      state.user = payload.user || null;
      const role = String(state.user?.role || '').toLowerCase();
      if (!state.user || !['employee', 'manager', 'admin'].includes(role)) {
        el.session.textContent = 'Access only for employee/manager/admin roles.';
        return;
      }
      renderSession();
      if (!['manager', 'admin'].includes(role)) {
        el.seedBtn.disabled = true;
        el.seedBtn.title = 'Only manager/admin can run seed';
      }
      await Promise.all([loadProjects(), loadServices(), loadMaterials()]);
      if (['manager', 'admin'].includes(role)) {
        await loadQuotes();
      } else {
        el.quotesFilterQ.disabled = true;
        el.quotesFilterStatus.disabled = true;
        el.quotesRefresh.disabled = true;
        el.quotesPageSize.disabled = true;
        el.quotesPrev.disabled = true;
        el.quotesNext.disabled = true;
        el.quotesList.innerHTML = '<p class=\"muted\">Quote management is available for manager/admin roles.</p>';
      }
    } catch (error) {
      clearSession();
      el.session.textContent = error.message || 'Session expired. Log in again.';
    }
  };

  setupLiveEmailAutocomplete({
    input: el.projectCreateForm.elements.clientEmail,
    datalist: el.projectCreateClientSuggestions,
    type: 'client',
    statusNode: el.projectCreateClientLookupStatus
  });
  setupLiveEmailAutocomplete({
    input: el.projectCreateForm.elements.assignedManagerEmail,
    datalist: el.projectCreateManagerSuggestions,
    type: 'staff',
    statusNode: el.projectCreateManagerLookupStatus
  });
  setupLiveEmailAutocomplete({
    input: el.projectEditForm.elements.clientEmail,
    datalist: el.projectEditClientSuggestions,
    type: 'client',
    statusNode: el.projectEditClientLookupStatus
  });
  setupLiveEmailAutocomplete({
    input: el.projectEditForm.elements.assignedManagerEmail,
    datalist: el.projectEditManagerSuggestions,
    type: 'staff',
    statusNode: el.projectEditManagerLookupStatus
  });

  el.projectCreateForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus(el.projectCreateStatus, 'Creating project...');
    const f = el.projectCreateForm.elements;
    const payload = {
      title: String(f.title.value || '').trim(),
      location: String(f.location.value || '').trim(),
      status: String(f.status.value || 'planning'),
      quoteId: normUuid(f.quoteId.value),
      clientEmail: normEmail(f.clientEmail.value),
      assignedManagerEmail: normEmail(f.assignedManagerEmail.value),
      galleryOrder: Number.parseInt(f.galleryOrder.value, 10) || 0,
      description: String(f.description.value || '').trim(),
      showInGallery: Boolean(f.showInGallery.checked)
    };
    if (!payload.title) return setStatus(el.projectCreateStatus, 'Title is required.', 'error');
    try {
      const result = await api('/api/manager/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setStatus(el.projectCreateStatus, 'Project created.', 'success');
      el.projectCreateForm.reset();
      f.status.value = 'planning';
      f.galleryOrder.value = '0';
      applyProjectsFiltersFromUI();
      await loadProjects(result.project?.id);
    } catch (error) {
      setStatus(el.projectCreateStatus, error.message || 'Failed to create project.', 'error');
    }
  });

  el.projectEditForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const projectId = String(el.projectEditForm.elements.id.value || '');
    if (!projectId) return;
    setStatus(el.projectEditStatus, 'Saving project...');
    const f = el.projectEditForm.elements;
    const payload = {
      title: String(f.title.value || '').trim(),
      location: String(f.location.value || '').trim(),
      status: String(f.status.value || 'planning'),
      quoteId: normUuid(f.quoteId.value),
      clientEmail: normEmail(f.clientEmail.value),
      assignedManagerEmail: normEmail(f.assignedManagerEmail.value),
      galleryOrder: Number.parseInt(f.galleryOrder.value, 10) || 0,
      budgetEstimate: String(f.budgetEstimate.value || '').trim(),
      startDate: f.startDate.value || null,
      endDate: f.endDate.value || null,
      showInGallery: Boolean(f.showInGallery.checked),
      isActive: Boolean(f.isActive.checked),
      description: String(f.description.value || '').trim()
    };
    if (!payload.title) return setStatus(el.projectEditStatus, 'Title is required.', 'error');
    try {
      await api(`/api/manager/projects/${projectId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setStatus(el.projectEditStatus, 'Project saved.', 'success');
      await loadProjects(projectId);
    } catch (error) {
      setStatus(el.projectEditStatus, error.message || 'Failed to save project.', 'error');
    }
  });

  el.projectDelete.addEventListener('click', async () => {
    const project = selectedProject();
    if (!project) return;
    if (!window.confirm(`Delete project \"${project.title}\" and all related media?`)) return;
    setStatus(el.projectEditStatus, 'Deleting project...');
    try {
      await api(`/api/manager/projects/${project.id}`, { method: 'DELETE' });
      setStatus(el.projectEditStatus, 'Project deleted.', 'success');
      await loadProjects();
    } catch (error) {
      setStatus(el.projectEditStatus, error.message || 'Failed to delete project.', 'error');
    }
  });

  el.mediaUploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const project = selectedProject();
    if (!project) return;
    const files = el.mediaUploadForm.elements.files.files;
    if (!files || !files.length) return setStatus(el.mediaUploadStatus, 'Select at least one file.', 'error');
    const fd = new FormData();
    Array.from(files).forEach((file) => fd.append('files', file));
    const mediaType = String(el.mediaUploadForm.elements.mediaType.value || '').trim();
    if (mediaType) fd.append('mediaType', mediaType);
    fd.append('galleryOrderStart', String(Number.parseInt(el.mediaUploadForm.elements.galleryOrderStart.value, 10) || 0));
    fd.append('caption', String(el.mediaUploadForm.elements.caption.value || '').trim());
    fd.append('showInGallery', String(Boolean(el.mediaUploadForm.elements.showInGallery.checked)));
    fd.append('isCover', String(Boolean(el.mediaUploadForm.elements.isCover.checked)));
    try {
      await api(`/api/manager/projects/${project.id}/media/upload`, { method: 'POST', body: fd });
      setStatus(el.mediaUploadStatus, 'Upload finished.', 'success');
      el.mediaUploadForm.reset();
      el.mediaUploadForm.elements.galleryOrderStart.value = '0';
      await loadProjects(project.id);
    } catch (error) {
      setStatus(el.mediaUploadStatus, error.message || 'Upload failed.', 'error');
    }
  });

  el.serviceCreateForm.addEventListener('submit', async (event) => {
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
    if (!payload.title) return setStatus(el.serviceCreateStatus, 'Service title is required.', 'error');
    try {
      await api('/api/manager/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setStatus(el.serviceCreateStatus, 'Service added.', 'success');
      el.serviceCreateForm.reset();
      f.category.value = 'bathroom';
      f.displayOrder.value = '0';
      f.showOnWebsite.checked = true;
      state.servicesQuery.page = 1;
      await loadServices();
    } catch (error) {
      setStatus(el.serviceCreateStatus, error.message || 'Failed to add service.', 'error');
    }
  });

  el.materialCreateForm.addEventListener('submit', async (event) => {
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
    if (!payload.name) return setStatus(el.materialCreateStatus, 'Material name is required.', 'error');
    try {
      await api('/api/manager/materials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setStatus(el.materialCreateStatus, 'Material added.', 'success');
      el.materialCreateForm.reset();
      f.category.value = 'tiles';
      f.unit.value = 'pcs';
      f.stockQty.value = '0';
      f.minStockQty.value = '0';
      state.materialsQuery.page = 1;
      await loadMaterials();
    } catch (error) {
      setStatus(el.materialCreateStatus, error.message || 'Failed to add material.', 'error');
    }
  });

  el.seedBtn.addEventListener('click', async () => {
    if (!window.confirm('Run starter seed now?')) return;
    const force = window.confirm('Force-update existing seed records? Click Cancel for safe mode.');
    setStatus(el.seedStatus, 'Running seed...');
    try {
      const payload = await api('/api/manager/seed/starter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force }) });
      const stats = payload?.stats || {};
      setStatus(el.seedStatus, `Seed done. Services +${stats.servicesCreated || 0}, materials +${stats.materialsCreated || 0}, projects +${stats.projectsCreated || 0}, media +${stats.mediaCreated || 0}.`, 'success');
      state.projectsQuery.page = 1;
      state.servicesQuery.page = 1;
      state.materialsQuery.page = 1;
      await Promise.all([loadProjects(), loadServices(), loadMaterials()]);
    } catch (error) {
      setStatus(el.seedStatus, error.message || 'Seed failed.', 'error');
    }
  });

  el.projectsFilterApply.addEventListener('click', () => { applyProjectsFiltersFromUI(); loadProjects().catch((e) => window.alert(e.message || 'Could not load projects')); });
  el.projectsPrev.addEventListener('click', () => { if (state.projectsQuery.page <= 1) return; state.projectsQuery.page -= 1; loadProjects().catch((e) => window.alert(e.message || 'Could not load projects')); });
  el.projectsNext.addEventListener('click', () => { if (state.projectsQuery.page >= Number(state.projectsPagination.totalPages || 1)) return; state.projectsQuery.page += 1; loadProjects().catch((e) => window.alert(e.message || 'Could not load projects')); });
  el.quotesRefresh.addEventListener('click', () => { applyQuotesFiltersFromUI(); loadQuotes().catch((e) => window.alert(e.message || 'Could not load quotes')); });
  el.quotesPrev.addEventListener('click', () => { if (state.quotesQuery.page <= 1) return; state.quotesQuery.page -= 1; loadQuotes().catch((e) => window.alert(e.message || 'Could not load quotes')); });
  el.quotesNext.addEventListener('click', () => { if (state.quotesQuery.page >= Number(state.quotesPagination.totalPages || 1)) return; state.quotesQuery.page += 1; loadQuotes().catch((e) => window.alert(e.message || 'Could not load quotes')); });
  el.servicesRefresh.addEventListener('click', () => { applyServicesFiltersFromUI(); loadServices().catch((e) => window.alert(e.message || 'Could not load services')); });
  el.servicesPrev.addEventListener('click', () => { if (state.servicesQuery.page <= 1) return; state.servicesQuery.page -= 1; loadServices().catch((e) => window.alert(e.message || 'Could not load services')); });
  el.servicesNext.addEventListener('click', () => { if (state.servicesQuery.page >= Number(state.servicesPagination.totalPages || 1)) return; state.servicesQuery.page += 1; loadServices().catch((e) => window.alert(e.message || 'Could not load services')); });
  el.materialsRefresh.addEventListener('click', () => { applyMaterialsFiltersFromUI(); loadMaterials().catch((e) => window.alert(e.message || 'Could not load materials')); });
  el.materialsPrev.addEventListener('click', () => { if (state.materialsQuery.page <= 1) return; state.materialsQuery.page -= 1; loadMaterials().catch((e) => window.alert(e.message || 'Could not load materials')); });
  el.materialsNext.addEventListener('click', () => { if (state.materialsQuery.page >= Number(state.materialsPagination.totalPages || 1)) return; state.materialsQuery.page += 1; loadMaterials().catch((e) => window.alert(e.message || 'Could not load materials')); });
  el.logout.addEventListener('click', () => { clearSession(); window.location.href = '/auth.html'; });

  bootstrap();
})();
