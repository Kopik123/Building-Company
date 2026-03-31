(() => {
  const runtime = window.LevelLinesRuntime || {};
  const TOKEN_KEY = runtime.TOKEN_KEY || 'll_auth_token';
  const USER_KEY = runtime.USER_KEY || 'll_auth_user';
  const DEFAULT_PAGE_SIZE = 25;

  const el = {
    session: document.getElementById('dashboard-session'),
    logout: document.getElementById('dashboard-logout'),
    seedBtn: document.getElementById('dashboard-seed-btn'),
    seedStatus: document.getElementById('dashboard-seed-status'),
    managerCompanyEventsList: document.getElementById('manager-company-events-list'),
    managerMailboxPrivateCount: document.getElementById('manager-mailbox-private-count'),
    managerMailboxProjectCount: document.getElementById('manager-mailbox-project-count'),
    managerMailboxPrivatePreview: document.getElementById('manager-mailbox-private-preview'),
    managerMailboxProjectPreview: document.getElementById('manager-mailbox-project-preview'),
    managerAvailableOptions: document.getElementById('manager-available-options'),
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
    materialsList: document.getElementById('materials-list'),
    clientsFilterQ: document.getElementById('clients-filter-q'),
    clientsRefresh: document.getElementById('clients-refresh-btn'),
    clientsList: document.getElementById('clients-list'),
    staffFilterQ: document.getElementById('staff-filter-q'),
    staffRefresh: document.getElementById('staff-refresh-btn'),
    staffCreateForm: document.getElementById('staff-create-form'),
    staffCreateStatus: document.getElementById('staff-create-status'),
    staffList: document.getElementById('staff-list'),
    estimateCreateForm: document.getElementById('estimate-create-form'),
    estimateCreateStatus: document.getElementById('estimate-create-status'),
    estimatesList: document.getElementById('estimates-list'),
    estimateEditorCard: document.getElementById('estimate-editor-card'),
    estimateEditorTitle: document.getElementById('estimate-editor-title'),
    estimateEditorTotal: document.getElementById('estimate-editor-total'),
    estimateUpdateForm: document.getElementById('estimate-update-form'),
    estimateUpdateStatus: document.getElementById('estimate-update-status'),
    estimateSendReview: document.getElementById('estimate-send-review-btn'),
    estimateDelete: document.getElementById('estimate-delete-btn'),
    estimateDocumentForm: document.getElementById('estimate-document-form'),
    estimateDocumentStatus: document.getElementById('estimate-document-status'),
    estimateDocumentSummary: document.getElementById('estimate-document-summary'),
    estimateRevisionsList: document.getElementById('estimate-revisions-list'),
    estimateLineForm: document.getElementById('estimate-line-form'),
    estimateLineStatus: document.getElementById('estimate-line-status'),
    estimateLinesList: document.getElementById('estimate-lines-list'),
    managerDirectThreadsList: document.getElementById('manager-direct-threads-list'),
    managerDirectMessagesList: document.getElementById('manager-direct-messages-list'),
    managerDirectMessageForm: document.getElementById('manager-direct-message-form'),
    managerDirectMessageStatus: document.getElementById('manager-direct-message-status'),
    managerGroupThreadsList: document.getElementById('manager-group-threads-list'),
    managerGroupMessagesList: document.getElementById('manager-group-messages-list'),
    managerGroupMessageForm: document.getElementById('manager-group-message-form'),
    managerGroupMessageStatus: document.getElementById('manager-group-message-status')
  };

  if (Object.values(el).some((v) => !v)) return;

  const state = {
    token: '',
    user: null,
    selectedProjectId: '',
    projects: [],
    projectDetailsById: new Map(),
    quotes: [],
    services: [],
    materials: [],
    clients: [],
    staff: [],
    estimates: [],
    selectedEstimateId: '',
    directThreads: [],
    selectedDirectThreadId: '',
    directMessages: [],
    groupThreads: [],
    selectedGroupThreadId: '',
    groupMessages: [],
    projectsQuery: { page: 1, pageSize: DEFAULT_PAGE_SIZE, q: '', status: '', showInGallery: '' },
    projectsPagination: { page: 1, totalPages: 1, total: 0, pageSize: DEFAULT_PAGE_SIZE },
    quotesQuery: { page: 1, pageSize: DEFAULT_PAGE_SIZE, q: '', status: '' },
    quotesPagination: { page: 1, totalPages: 1, total: 0, pageSize: DEFAULT_PAGE_SIZE },
    servicesQuery: { page: 1, pageSize: DEFAULT_PAGE_SIZE, q: '', category: '', showOnWebsite: '' },
    servicesPagination: { page: 1, totalPages: 1, total: 0, pageSize: DEFAULT_PAGE_SIZE },
    materialsQuery: { page: 1, pageSize: DEFAULT_PAGE_SIZE, q: '', category: '', lowStock: '' },
    materialsPagination: { page: 1, totalPages: 1, total: 0, pageSize: DEFAULT_PAGE_SIZE },
    clientsQuery: { q: '' },
    staffQuery: { q: '' },
    lazyLoaded: {
      quotes: false,
      services: false,
      materials: false,
      clients: false,
      staff: false,
      estimates: false,
      directThreads: false,
      groupThreads: false
    },
    overviewLoaded: {
      directThreads: false,
      groupThreads: false
    }
  };
  const USER_SEARCH_CACHE_TTL_MS = 30 * 1000;
  const userSearchCache = new Map();

  const parseError = runtime.parseError || ((payload) => payload?.error || 'Request failed.');
  const escapeHtml = runtime.escapeHtml || ((value) => String(value ?? ''));

  const setStatus = runtime.setStatus || ((node, msg, type) => {
    node.className = 'form-status';
    if (type === 'success') node.classList.add('is-success');
    if (type === 'error') node.classList.add('is-error');
    node.textContent = msg || '';
  });

  const setSmallStatus = runtime.setSmallStatus || ((node, msg, type) => {
    node.textContent = msg || '';
    node.className = type === 'error' ? 'muted form-status is-error' : 'muted';
  });
  const requestAccordionRefresh = runtime.requestAccordionRefresh || (() => {
    window.dispatchEvent(new CustomEvent('ll:dashboard-accordions-refresh'));
  });
  const titleCase = runtime.titleCase || ((value) => String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()));
  const formatDateTime = runtime.formatDateTime || ((value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleString('en-GB');
  });
  const formatCurrency = runtime.formatCurrency || ((value) => `GBP ${Number(value || 0).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`);
  const createOverviewEntry = runtime.createOverviewEntry || (({ title, detail, meta }) => {
    const item = document.createElement('article');
    item.className = 'workspace-overview-entry';

    const heading = document.createElement('h3');
    heading.textContent = title;
    item.appendChild(heading);

    if (detail) {
      const text = document.createElement('p');
      text.textContent = detail;
      item.appendChild(text);
    }

    if (meta) {
      const metaLine = document.createElement('p');
      metaLine.className = 'muted';
      metaLine.textContent = meta;
      item.appendChild(metaLine);
    }

    return item;
  });
  const renderMailboxPreviewList = runtime.renderMailboxPreviewList || ((node, items, { loaded, loadingText, emptyText, mapItem }) => {
    node.innerHTML = '';

    if (!loaded) {
      const text = document.createElement('p');
      text.className = 'muted';
      text.textContent = loadingText;
      node.appendChild(text);
      return;
    }

    if (!items.length) {
      const text = document.createElement('p');
      text.className = 'muted';
      text.textContent = emptyText;
      node.appendChild(text);
      return;
    }

    const frag = document.createDocumentFragment();
    items.slice(0, 2).forEach((item) => frag.appendChild(createOverviewEntry(mapItem(item))));
    node.appendChild(frag);
  });
  const createControlField = (labelText, control) => {
    const field = document.createElement('label');
    field.className = 'dashboard-control-field';
    const label = document.createElement('span');
    label.className = 'dashboard-control-label';
    label.textContent = labelText;
    field.appendChild(label);
    field.appendChild(control);
    return field;
  };
  const createCheckboxField = (labelText, checkboxText, checked) => {
    const field = document.createElement('div');
    field.className = 'dashboard-control-field dashboard-control-field--checkbox';
    const label = document.createElement('span');
    label.className = 'dashboard-control-label';
    label.textContent = labelText;
    const wrap = document.createElement('label');
    wrap.className = 'dashboard-inline-check dashboard-inline-check--field';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(checked);
    const text = document.createElement('span');
    text.textContent = checkboxText;
    wrap.appendChild(input);
    wrap.appendChild(text);
    field.appendChild(label);
    field.appendChild(wrap);
    return { field, input };
  };
  const createEditActions = (buttons) => {
    const row = document.createElement('div');
    row.className = 'dashboard-edit-actions';
    buttons.filter(Boolean).forEach((button) => row.appendChild(button));
    return row;
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
  const getStoredUser = runtime.getStoredUser || (() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const waitForStoredUser = runtime.waitForStoredUser || ((timeoutMs = 900) =>
    new Promise((resolve) => {
      const startedAt = Date.now();
      const tick = () => {
        const user = getStoredUser();
        if (user && user.role) {
          resolve(user);
          return;
        }

        if (Date.now() - startedAt >= timeoutMs || !localStorage.getItem(TOKEN_KEY)) {
          resolve(null);
          return;
        }

        window.setTimeout(tick, 60);
      };
      tick();
    }));

  const clearSession = () => {
    (runtime.clearSession || (() => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }))();
    state.token = '';
    state.user = null;
    state.projectDetailsById.clear();
  };

  const api = (runtime.createApiClient ? runtime.createApiClient(() => state.token) : async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Authorization') && state.token) headers.set('Authorization', `Bearer ${state.token}`);
    const res = await fetch(url, { ...options, headers });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(parseError(payload));
    return payload;
  });

  const selectedProject = () =>
    state.projectDetailsById.get(state.selectedProjectId)
    || state.projects.find((p) => p.id === state.selectedProjectId)
    || null;

  const selectedEstimate = () =>
    state.estimates.find((estimate) => estimate.id === state.selectedEstimateId)
    || null;

  const getInboxCounterparty = (thread) => {
    if (!thread) return null;
    const participantA = thread.participantA || null;
    const participantB = thread.participantB || null;
    if (participantA?.id === state.user?.id) return participantB;
    if (participantB?.id === state.user?.id) return participantA;
    return participantB || participantA;
  };

  const setSelectOptions = (select, options, placeholder) => {
    if (!select) return;
    const currentValue = String(select.value || '');
    select.innerHTML = '';
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = placeholder;
    select.appendChild(emptyOption);

    (options || []).forEach((optionData) => {
      const option = document.createElement('option');
      option.value = optionData.value;
      option.textContent = optionData.label;
      select.appendChild(option);
    });

    if (currentValue && options.some((optionData) => optionData.value === currentValue)) {
      select.value = currentValue;
    }
  };

  const syncEstimateReferenceOptions = () => {
    const projectOptions = state.projects.map((project) => ({
      value: project.id,
      label: `${project.title}${project.location ? ` | ${project.location}` : ''}`
    }));
    const serviceOptions = state.services.map((service) => ({
      value: service.id,
      label: service.title
    }));
    const materialOptions = state.materials.map((material) => ({
      value: material.id,
      label: `${material.name}${material.sku ? ` | ${material.sku}` : ''}`
    }));

    [el.estimateCreateForm?.elements.projectId, el.estimateUpdateForm?.elements.projectId].forEach((select) => {
      setSelectOptions(select, projectOptions, 'Select project');
    });
    setSelectOptions(el.estimateLineForm?.elements.serviceId, serviceOptions, 'Select service');
    setSelectOptions(el.estimateLineForm?.elements.materialId, materialOptions, 'Select material');
  };

  const renderSession = () => {
    if (!state.user) {
      el.session.textContent = 'No active session. Log in as employee/manager/admin.';
      renderAvailableOptions();
      return;
    }
    el.session.textContent = `Logged as ${state.user.name || state.user.email} (${state.user.role})`;
    renderAvailableOptions();
  };

  const renderCompanyEvents = () => {
    el.managerCompanyEventsList.innerHTML = '';

    const items = [];
    const recentProjects = [...state.projects]
      .sort((left, right) => {
        const leftDate = Date.parse(left.updatedAt || left.endDate || left.startDate || 0) || 0;
        const rightDate = Date.parse(right.updatedAt || right.endDate || right.startDate || 0) || 0;
        return rightDate - leftDate;
      })
      .slice(0, 3);

    recentProjects.forEach((project) => {
      const metaParts = [];
      if (project.location) metaParts.push(project.location);
      if (project.client?.email) metaParts.push(`Client ${project.client.email}`);
      if (project.assignedManager?.email) metaParts.push(`Staff ${project.assignedManager.email}`);
      const mediaSummary = [];
      if (Number.isFinite(Number(project.imageCount))) mediaSummary.push(`${project.imageCount} images`);
      if (Number.isFinite(Number(project.documentCount))) mediaSummary.push(`${project.documentCount} docs`);
      if (mediaSummary.length) metaParts.push(mediaSummary.join(' / '));

      items.push({
        title: project.title || 'Project',
        detail: `${titleCase(project.status || 'planning')} project${project.showInGallery ? ' | visible in gallery' : ''}`,
        meta: metaParts.join(' | ')
      });
    });

    if (state.lazyLoaded.quotes || state.quotes.length) {
      const pendingQuotes = state.quotes.filter((quote) => String(quote.status || '').toLowerCase() === 'pending').length;
      if (pendingQuotes) {
        items.push({
          title: `${pendingQuotes} quote${pendingQuotes === 1 ? '' : 's'} waiting`,
          detail: 'Pending response and priority review.',
          meta: 'Quotes become visible here once the quote section has been loaded.'
        });
      }
    }

    if (state.lazyLoaded.estimates || state.estimates.length) {
      const draftEstimates = state.estimates.filter((estimate) => String(estimate.status || '').toLowerCase() === 'draft').length;
      if (draftEstimates) {
        items.push({
          title: `${draftEstimates} estimate draft${draftEstimates === 1 ? '' : 's'} open`,
          detail: 'Pricing is still being shaped before client issue.',
          meta: 'Estimate Builder'
        });
      }
    }

    if (state.lazyLoaded.materials || state.materials.length) {
      const lowStock = state.materials.filter((material) => Number(material.stockQty || 0) <= Number(material.minStockQty || 0)).length;
      if (lowStock) {
        items.push({
          title: `${lowStock} material line${lowStock === 1 ? '' : 's'} flagged`,
          detail: 'Low-stock inventory needs review before the next ordering pass.',
          meta: 'Materials Inventory'
        });
      }
    }

    if (!items.length) {
      const text = document.createElement('p');
      text.className = 'muted';
      text.textContent = 'Projects, quotes and estimate movement will appear here as the dashboard loads.';
      el.managerCompanyEventsList.appendChild(text);
      return;
    }

    const frag = document.createDocumentFragment();
    items.slice(0, 4).forEach((item) => frag.appendChild(createOverviewEntry(item)));
    el.managerCompanyEventsList.appendChild(frag);
  };

  const renderMailboxOverview = () => {
    el.managerMailboxPrivateCount.textContent = String(state.directThreads.length);
    el.managerMailboxProjectCount.textContent = String(state.groupThreads.length);

    renderMailboxPreviewList(el.managerMailboxPrivatePreview, state.directThreads, {
      loaded: state.overviewLoaded.directThreads,
      loadingText: 'Loading private threads...',
      emptyText: 'No private client threads yet.',
      mapItem: (thread) => {
        const counterparty = getInboxCounterparty(thread);
        return {
          title: counterparty?.name || counterparty?.email || 'Direct thread',
          detail: thread.subject || 'Private inbox route',
          meta: formatDateTime(thread.updatedAt) ? `Updated ${formatDateTime(thread.updatedAt)}` : ''
        };
      }
    });

    renderMailboxPreviewList(el.managerMailboxProjectPreview, state.groupThreads, {
      loaded: state.overviewLoaded.groupThreads,
      loadingText: 'Loading project threads...',
      emptyText: 'No project threads yet.',
      mapItem: (thread) => ({
        title: thread.name || thread.subject || 'Project thread',
        detail: 'Project communication route',
        meta: formatDateTime(thread.updatedAt) ? `Updated ${formatDateTime(thread.updatedAt)}` : ''
      })
    });
  };

  const renderAvailableOptions = () => {
    el.managerAvailableOptions.innerHTML = '';

    if (!state.user) {
      const text = document.createElement('p');
      text.className = 'muted';
      text.textContent = 'Management routes will appear after the session is confirmed.';
      el.managerAvailableOptions.appendChild(text);
      return;
    }

    const role = String(state.user.role || '').toLowerCase();
    const isManagerLevel = ['manager', 'admin'].includes(role);

    const options = [
      {
        label: 'Create Project',
        detail: 'Start a new project brief with client and staff assignment.',
        href: '#manager-project-create',
        roles: ['employee', 'manager', 'admin'],
        meta: 'Create'
      },
      {
        label: 'Projects',
        detail: 'Control status, media, gallery visibility and project documents.',
        href: '#manager-projects-section',
        roles: ['employee', 'manager', 'admin'],
        meta: `${state.projectsPagination.total || state.projects.length || 0} loaded`
      },
      {
        label: 'Quotes',
        detail: 'Review new enquiries, priorities and acceptance routes.',
        href: '#manager-quotes-section',
        roles: ['manager', 'admin'],
        meta: state.lazyLoaded.quotes || state.quotes.length ? `${state.quotesPagination.total || state.quotes.length || 0} loaded` : 'Open section'
      },
      {
        label: 'Services',
        detail: 'Manage the website offer, ordering and visibility.',
        href: '#manager-services-section',
        roles: ['manager', 'admin'],
        meta: state.lazyLoaded.services || state.services.length ? `${state.servicesPagination.total || state.services.length || 0} loaded` : 'Open section'
      },
      {
        label: 'Materials',
        detail: 'Track stock, supplier notes and low-stock lines.',
        href: '#manager-materials-section',
        roles: ['manager', 'admin'],
        meta: state.lazyLoaded.materials || state.materials.length ? `${state.materialsPagination.total || state.materials.length || 0} loaded` : 'Open section'
      },
      {
        label: 'Clients',
        detail: 'Search client records and contact context for active jobs.',
        href: '#manager-clients-section',
        roles: ['manager', 'admin'],
        meta: state.lazyLoaded.clients || state.clients.length ? `${state.clients.length} loaded` : 'Open section'
      },
      {
        label: 'Staff',
        detail: 'Review staff access and create new operational users.',
        href: '#manager-staff-section',
        roles: ['manager', 'admin'],
        meta: state.lazyLoaded.staff || state.staff.length ? `${state.staff.length} loaded` : 'Open section'
      },
      {
        label: 'Estimate Builder',
        detail: 'Build project pricing from service and material lines.',
        href: '#manager-estimates-section',
        roles: ['manager', 'admin'],
        meta: state.lazyLoaded.estimates || state.estimates.length ? `${state.estimates.length} loaded` : 'Open section'
      },
      {
        label: 'Private Inbox',
        detail: 'Keep one-to-one client conversation separate from project chat.',
        href: '#manager-private-inbox',
        roles: ['employee', 'manager', 'admin'],
        meta: state.overviewLoaded.directThreads ? `${state.directThreads.length} threads` : 'Loading summary'
      },
      {
        label: 'Project Chat',
        detail: 'Open project-specific thread history and team conversation.',
        href: '#manager-project-chat',
        roles: ['employee', 'manager', 'admin'],
        meta: state.overviewLoaded.groupThreads ? `${state.groupThreads.length} threads` : 'Loading summary'
      }
    ].filter((option) => option.roles.includes(role));

    if (!isManagerLevel) {
      options.unshift({
        label: 'Role',
        detail: 'Employee access keeps the operational shell visible while manager-only actions stay limited.',
        href: '#manager-projects-section',
        meta: titleCase(role)
      });
    }

    const frag = document.createDocumentFragment();
    options.forEach((option) => {
      const link = document.createElement('a');
      link.className = 'workspace-option-link';
      link.href = option.href;

      const heading = document.createElement('strong');
      heading.textContent = option.label;
      link.appendChild(heading);

      const detail = document.createElement('span');
      detail.textContent = option.detail;
      link.appendChild(detail);

      const meta = document.createElement('small');
      meta.className = 'workspace-option-meta';
      meta.textContent = option.meta;
      link.appendChild(meta);

      frag.appendChild(link);
    });

    el.managerAvailableOptions.appendChild(frag);
  };

  const renderOperationsShell = () => {
    renderCompanyEvents();
    renderMailboxOverview();
    renderAvailableOptions();
  };

  const renderProjects = () => {
    el.projectsList.innerHTML = '';
    if (!state.projects.length) {
      el.projectsList.innerHTML = '<p class=\"muted\">No projects found for current filters.</p>';
      el.projectEditorCard.hidden = true;
      renderOperationsShell();
      return;
    }
    const frag = document.createDocumentFragment();
    state.projects.forEach((project) => {
      const card = document.createElement('article');
      card.className = `dashboard-item ${project.id === state.selectedProjectId ? 'is-active' : ''}`;
      card.innerHTML = `<h3>${escapeHtml(project.title)}</h3><p class=\"muted\">${escapeHtml(project.status)} | ${escapeHtml(project.location || 'No location')} | ${escapeHtml(project.imageCount || 0)} images/${escapeHtml(project.documentCount || 0)} docs | Client: ${escapeHtml(project.client?.email || 'No client')} | Staff: ${escapeHtml(project.assignedManager?.email || 'No staff')}</p>`;
      const row = document.createElement('div');
      row.className = 'dashboard-actions-row';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline';
      btn.textContent = 'Select';
      btn.addEventListener('click', async () => {
        state.selectedProjectId = project.id;
        if (!state.projectDetailsById.has(project.id)) {
          try {
            await loadProjectDetail(project.id, true);
          } catch (error) {
            window.alert(error.message || 'Could not load project details');
          }
        }
        fillProjectEditor();
        renderProjects();
      });
      row.appendChild(btn);
      card.appendChild(row);
      frag.appendChild(card);
    });
    el.projectsList.appendChild(frag);
    renderPagination(el.projectsPagination, el.projectsPrev, el.projectsNext, state.projectsPagination);
    renderOperationsShell();
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
      card.innerHTML = `<div class=\"dashboard-media-top\"><strong>${escapeHtml(item.filename)}</strong><span class=\"muted\">${escapeHtml(item.mediaType)}</span></div>`;
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
      requestAccordionRefresh();
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
    requestAccordionRefresh();
  };

  const renderQuotes = () => {
    el.quotesList.innerHTML = '';
    if (!state.quotes.length) {
      el.quotesList.innerHTML = '<p class=\"muted\">No quotes found for current filters.</p>';
      renderPagination(el.quotesPagination, el.quotesPrev, el.quotesNext, state.quotesPagination);
      renderOperationsShell();
      return;
    }

    const canManage = ['manager', 'admin'].includes(String(state.user?.role || '').toLowerCase());
    const frag = document.createDocumentFragment();
    state.quotes.forEach((quote) => {
      const owner = quote.guestName || quote.client?.name || quote.client?.email || 'Unknown client';
      const workflowStatus = quote.workflowStatus || 'new';
      const latestEstimate = Array.isArray(quote.estimates) && quote.estimates.length ? quote.estimates[0] : null;
      const latestEstimateLabel = latestEstimate
        ? `${latestEstimate.title || 'Estimate'} | ${latestEstimate.status || 'draft'} | GBP ${Number(latestEstimate.total || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : 'No linked estimate yet';
      const visitDetail = quote.siteVisitDate
        ? `${quote.siteVisitDate}${quote.siteVisitTimeWindow ? ` (${quote.siteVisitTimeWindow})` : ''}`
        : 'Not planned';
      const proposedStart = quote.proposedStartDate || 'Not proposed';
      const clientDecision = quote.clientDecisionStatus || 'pending';
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      card.innerHTML = `<h3>${escapeHtml(quote.projectType)} | ${escapeHtml(owner)}</h3><p class=\"muted\">${escapeHtml(quote.status)} | priority ${escapeHtml(quote.priority)} | ${escapeHtml(quote.location || '-')} ${escapeHtml(quote.postcode || '')}</p><p class=\"muted\">Workflow: ${escapeHtml(workflowStatus)} | Visit: ${escapeHtml(visitDetail)} | Client decision: ${escapeHtml(clientDecision)} | Proposed start: ${escapeHtml(proposedStart)}</p><p class=\"muted\">Estimate pack: ${escapeHtml(latestEstimateLabel)}</p><p>${escapeHtml(quote.description || '')}</p>`;
      const row = document.createElement('div');
      row.className = 'dashboard-edit-grid dashboard-edit-grid--wide';
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
      const workflowSelect = document.createElement('select');
      [
        'new',
        'manager_review',
        'visit_proposed',
        'visit_reschedule_requested',
        'visit_confirmed',
        'first_view',
        'quote_requested',
        'client_review',
        'changes_requested',
        'accepted',
        'rejected',
        'archived'
      ].forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        option.selected = workflowStatus === value;
        workflowSelect.appendChild(option);
      });
      const visitDateInput = document.createElement('input');
      visitDateInput.type = 'date';
      visitDateInput.value = toDateInputValue(quote.siteVisitDate);
      const visitWindowInput = document.createElement('input');
      visitWindowInput.type = 'text';
      visitWindowInput.placeholder = 'AM / PM / 10:00-12:00';
      visitWindowInput.value = quote.siteVisitTimeWindow || '';
      const startDateInput = document.createElement('input');
      startDateInput.type = 'date';
      startDateInput.value = toDateInputValue(quote.proposedStartDate);
      const scopeInput = document.createElement('textarea');
      scopeInput.rows = 3;
      scopeInput.value = quote.scopeOfWork || '';
      const materialsInput = document.createElement('textarea');
      materialsInput.rows = 3;
      materialsInput.value = quote.materialsPlan || '';
      const labourInput = document.createElement('textarea');
      labourInput.rows = 3;
      labourInput.value = quote.labourEstimate || '';
      const estimateLinkInput = document.createElement('input');
      estimateLinkInput.type = 'url';
      estimateLinkInput.placeholder = 'https://...';
      estimateLinkInput.value = quote.estimateDocumentUrl || '';
      const decisionSelect = document.createElement('select');
      ['pending', 'accepted', 'rejected', 'request_edit'].forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        option.selected = clientDecision === value;
        decisionSelect.appendChild(option);
      });
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn btn-gold';
      saveBtn.textContent = 'Save status and priority';
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
      const workflowSaveBtn = document.createElement('button');
      workflowSaveBtn.type = 'button';
      workflowSaveBtn.className = 'btn btn-outline';
      workflowSaveBtn.textContent = 'Save workflow';
      workflowSaveBtn.disabled = !canManage;
      workflowSaveBtn.addEventListener('click', async () => {
        try {
          await api(`/api/manager/quotes/${quote.id}/workflow`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workflowStatus: workflowSelect.value,
              siteVisitDate: visitDateInput.value || null,
              siteVisitTimeWindow: visitWindowInput.value.trim() || null,
              proposedStartDate: startDateInput.value || null,
              scopeOfWork: scopeInput.value.trim() || null,
              materialsPlan: materialsInput.value.trim() || null,
              labourEstimate: labourInput.value.trim() || null,
              estimateDocumentUrl: estimateLinkInput.value.trim() || null,
              clientDecisionStatus: decisionSelect.value
            })
          });
          await loadQuotes();
        } catch (error) {
          window.alert(error.message || 'Failed to update quote workflow');
        }
      });
      row.appendChild(createControlField('Status', statusSelect));
      row.appendChild(createControlField('Priority', prioritySelect));
      row.appendChild(createControlField('Workflow', workflowSelect));
      row.appendChild(createControlField('Visit date', visitDateInput));
      row.appendChild(createControlField('Visit window', visitWindowInput));
      row.appendChild(createControlField('Proposed start', startDateInput));
      row.appendChild(createControlField('Scope of work', scopeInput));
      row.appendChild(createControlField('Materials plan', materialsInput));
      row.appendChild(createControlField('Labour estimate', labourInput));
      row.appendChild(createControlField('Estimate link', estimateLinkInput));
      row.appendChild(createControlField('Client decision', decisionSelect));
      let acceptBtn = null;
      if (!quote.assignedManagerId && quote.status === 'pending' && canManage) {
        acceptBtn = document.createElement('button');
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
      }
      let convertBtn = null;
      if (canManage && (workflowStatus === 'accepted' || clientDecision === 'accepted')) {
        convertBtn = document.createElement('button');
        convertBtn.type = 'button';
        convertBtn.className = 'btn btn-outline';
        convertBtn.textContent = 'Create project';
        convertBtn.addEventListener('click', async () => {
          if (!window.confirm('Create a project from this accepted quote?')) return;
          try {
            await api(`/api/manager/quotes/${quote.id}/convert-to-project`, { method: 'POST' });
            await Promise.all([loadQuotes(), loadProjects()]);
          } catch (error) {
            window.alert(error.message || 'Failed to create project from quote');
          }
        });
      }
      let draftEstimateBtn = null;
      if (canManage && quote.assignedManagerId) {
        draftEstimateBtn = document.createElement('button');
        draftEstimateBtn.type = 'button';
        draftEstimateBtn.className = 'btn btn-outline';
        draftEstimateBtn.textContent = latestEstimate?.status === 'draft' ? 'Open draft estimate' : 'Create draft estimate';
        draftEstimateBtn.addEventListener('click', async () => {
          try {
            const result = await api(`/api/manager/quotes/${quote.id}/create-estimate-draft`, { method: 'POST' });
            const estimateId = result?.estimate?.id || latestEstimate?.id || '';
            await Promise.all([loadQuotes(), loadEstimates(estimateId)]);
            if (estimateId) {
              state.selectedEstimateId = estimateId;
              fillEstimateEditor();
            }
          } catch (error) {
            window.alert(error.message || 'Failed to open draft estimate');
          }
        });
      }
      row.appendChild(createEditActions([acceptBtn, draftEstimateBtn, workflowSaveBtn, convertBtn, saveBtn]));
      card.appendChild(row);
      frag.appendChild(card);
    });
    el.quotesList.appendChild(frag);
    renderPagination(el.quotesPagination, el.quotesPrev, el.quotesNext, state.quotesPagination);
    renderOperationsShell();
  };

  const renderServices = () => {
    el.servicesList.innerHTML = '';
    if (!state.services.length) {
      el.servicesList.innerHTML = '<p class=\"muted\">No services found for current filters.</p>';
      renderPagination(el.servicesPagination, el.servicesPrev, el.servicesNext, state.servicesPagination);
      renderOperationsShell();
      return;
    }
    const frag = document.createDocumentFragment();
    state.services.forEach((service) => {
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      card.innerHTML = `<h3>${escapeHtml(service.title)}</h3><p class=\"muted\">${escapeHtml(service.slug)} | ${escapeHtml(service.category)} | order ${escapeHtml(service.displayOrder)} | ${service.showOnWebsite ? 'public' : 'hidden'}</p>`;
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
        if (!window.confirm(`Delete service \"${service.title}\"?`)) return;
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
  };

  const renderMaterials = () => {
    el.materialsList.innerHTML = '';
    if (!state.materials.length) {
      el.materialsList.innerHTML = '<p class=\"muted\">No materials found for current filters.</p>';
      renderPagination(el.materialsPagination, el.materialsPrev, el.materialsNext, state.materialsPagination);
      renderOperationsShell();
      return;
    }
    const frag = document.createDocumentFragment();
    state.materials.forEach((material) => {
      const lowStock = Number(material.stockQty) <= Number(material.minStockQty);
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      card.innerHTML = `<h3>${escapeHtml(material.name)}</h3><p class=\"muted\">${escapeHtml(material.category)} | SKU: ${escapeHtml(material.sku || '-')} | stock ${escapeHtml(material.stockQty)}/${escapeHtml(material.minStockQty)} | ${lowStock ? 'LOW STOCK' : 'OK'}</p>`;
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
        if (!window.confirm(`Delete material \"${material.name}\"?`)) return;
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
  };

  const renderClients = () => {
    el.clientsList.innerHTML = '';
    if (!state.clients.length) {
      el.clientsList.innerHTML = '<p class="muted">No clients found for the current search.</p>';
      renderOperationsShell();
      return;
    }

    const frag = document.createDocumentFragment();
    state.clients.forEach((client) => {
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      card.innerHTML = `<h3>${escapeHtml(client.name || client.email || 'Client')}</h3><p class="muted">${escapeHtml(client.email || '-')} ${client.phone ? `| ${escapeHtml(client.phone)}` : ''}</p>`;
      frag.appendChild(card);
    });
    el.clientsList.appendChild(frag);
    renderOperationsShell();
  };

  const renderStaff = () => {
    el.staffList.innerHTML = '';
    if (!state.staff.length) {
      el.staffList.innerHTML = '<p class="muted">No staff found for the current search.</p>';
      renderOperationsShell();
      return;
    }

    const frag = document.createDocumentFragment();
    state.staff.forEach((member) => {
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      card.innerHTML = `<h3>${escapeHtml(member.name || member.email || 'Staff member')}</h3><p class="muted">${escapeHtml(member.email || '-')} | ${escapeHtml(member.role || 'employee')}</p>`;
      frag.appendChild(card);
    });
    el.staffList.appendChild(frag);
    renderOperationsShell();
  };

  const renderEstimates = () => {
    el.estimatesList.innerHTML = '';
    if (!state.estimates.length) {
      el.estimatesList.innerHTML = '<p class="muted">No estimates created yet.</p>';
      el.estimateEditorCard.hidden = true;
      requestAccordionRefresh();
      renderOperationsShell();
      return;
    }

    const frag = document.createDocumentFragment();
    state.estimates.forEach((estimate) => {
      const card = document.createElement('article');
      card.className = `dashboard-item ${estimate.id === state.selectedEstimateId ? 'is-active' : ''}`;
      const projectTitle = estimate.project?.title || 'No project';
      const revisionMeta = estimate.revisionNumber ? ` | revision ${estimate.revisionNumber}` : '';
      const clientMeta = estimate.sentToClientAt ? ` | sent ${escapeHtml(formatDateTime(estimate.sentToClientAt))}` : '';
      card.innerHTML = `<h3>${escapeHtml(estimate.title)}</h3><p class="muted">${escapeHtml(estimate.status)}${revisionMeta}${clientMeta} | ${escapeHtml(projectTitle)} | total ${escapeHtml(formatCurrency(estimate.total || 0))}</p>`;
      const row = document.createElement('div');
      row.className = 'dashboard-actions-row';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline';
      btn.textContent = 'Select';
      btn.addEventListener('click', async () => {
        state.selectedEstimateId = estimate.id;
        await loadEstimateDetail(estimate.id, true);
        fillEstimateEditor();
        renderEstimates();
      });
      row.appendChild(btn);
      card.appendChild(row);
      frag.appendChild(card);
    });
    el.estimatesList.appendChild(frag);
    renderOperationsShell();
  };

  const renderEstimateLines = () => {
    el.estimateLinesList.innerHTML = '';
    const estimate = selectedEstimate();
    if (!estimate || !Array.isArray(estimate.lines) || !estimate.lines.length) {
      el.estimateLinesList.innerHTML = '<p class="muted">No line items yet.</p>';
      return;
    }

    const frag = document.createDocumentFragment();
    estimate.lines.forEach((line) => {
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      card.innerHTML = `<h3>${escapeHtml(line.description)}</h3><p class="muted">${escapeHtml(line.lineType)} | qty ${escapeHtml(line.quantity)} ${escapeHtml(line.unit || '')} | ${escapeHtml(formatCurrency(line.lineTotal || 0))}</p>${line.notes ? `<p>${escapeHtml(line.notes)}</p>` : ''}`;
      const row = document.createElement('div');
      row.className = 'dashboard-actions-row';
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn btn-outline';
      del.textContent = 'Delete line';
      del.addEventListener('click', async () => {
        if (!window.confirm(`Delete estimate line "${line.description}"?`)) return;
        try {
          await api(`/api/manager/estimates/${estimate.id}/lines/${line.id}`, { method: 'DELETE' });
          await loadEstimateDetail(estimate.id, true);
          fillEstimateEditor();
          renderEstimates();
          setStatus(el.estimateLineStatus, 'Estimate line deleted.', 'success');
        } catch (error) {
          setStatus(el.estimateLineStatus, error.message || 'Failed to delete estimate line.', 'error');
        }
      });
      row.appendChild(del);
      card.appendChild(row);
      frag.appendChild(card);
    });
    el.estimateLinesList.appendChild(frag);
  };

  const fillEstimateEditor = () => {
    const estimate = selectedEstimate();
    if (!estimate) {
      el.estimateEditorCard.hidden = true;
      requestAccordionRefresh();
      return;
    }

    syncEstimateReferenceOptions();
    el.estimateEditorCard.hidden = false;
    el.estimateEditorTitle.textContent = estimate.title || 'Estimate';
    el.estimateEditorTotal.textContent = `Total ${formatCurrency(estimate.total || 0)}`;
    const form = el.estimateUpdateForm.elements;
    form.id.value = estimate.id;
    form.title.value = estimate.title || '';
    form.status.value = estimate.status || 'draft';
    form.projectId.value = estimate.projectId || '';
    form.quoteId.value = estimate.quoteId || '';
    form.notes.value = estimate.notes || '';
    renderEstimateDocumentSummary();
    renderEstimateRevisions();
    renderEstimateLines();
    requestAccordionRefresh();
  };

  const renderEstimateDocumentSummary = () => {
    el.estimateDocumentSummary.innerHTML = '';
    const estimate = selectedEstimate();
    if (!estimate) {
      el.estimateDocumentSummary.innerHTML = '<p class="muted">Select an estimate to manage its document pack.</p>';
      return;
    }

    const card = document.createElement('article');
    card.className = 'dashboard-item';
    if (estimate.documentUrl) {
      card.innerHTML = `<h3>${escapeHtml(estimate.documentFilename || 'Estimate file')}</h3><p class="muted">${escapeHtml(estimate.documentMimeType || 'file')} | ${escapeHtml(estimate.documentSizeBytes || '-')} bytes</p><p class="muted">Client visible: ${escapeHtml(estimate.clientVisible ? 'yes' : 'no')} | Sent: ${escapeHtml(formatDateTime(estimate.sentToClientAt) || 'not yet')}</p>`;
      const link = document.createElement('a');
      link.className = 'btn btn-outline';
      link.href = estimate.documentUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Open uploaded file';
      card.appendChild(link);
    } else {
      card.innerHTML = '<h3>No file uploaded yet</h3><p class="muted">Upload a PDF or supporting file to include it in the client-visible estimate pack.</p>';
    }
    el.estimateDocumentSummary.appendChild(card);
  };

  const renderEstimateRevisions = () => {
    el.estimateRevisionsList.innerHTML = '';
    const estimate = selectedEstimate();
    const revisions = Array.isArray(estimate?.revisionHistory) ? estimate.revisionHistory : [];
    if (!estimate) {
      el.estimateRevisionsList.innerHTML = '<p class="muted">Select an estimate to see its revision history.</p>';
      return;
    }
    if (!revisions.length) {
      el.estimateRevisionsList.innerHTML = '<p class="muted">No revisions recorded yet.</p>';
      return;
    }

    const frag = document.createDocumentFragment();
    [...revisions].reverse().forEach((revision) => {
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      const changedFields = Array.isArray(revision.changedFields) && revision.changedFields.length
        ? revision.changedFields.join(', ')
        : 'snapshot';
      card.innerHTML = `<h3>${escapeHtml(titleCase(revision.changeType || 'revision'))}</h3><p class="muted">${escapeHtml(formatDateTime(revision.createdAt) || '')} | ${escapeHtml(changedFields)}</p>${revision.note ? `<p>${escapeHtml(revision.note)}</p>` : ''}`;
      frag.appendChild(card);
    });
    el.estimateRevisionsList.appendChild(frag);
  };

  const renderDirectThreads = () => {
    el.managerDirectThreadsList.innerHTML = '';
    if (!state.directThreads.length) {
      el.managerDirectThreadsList.innerHTML = '<p class="muted">No private threads yet.</p>';
      renderOperationsShell();
      return;
    }

    const frag = document.createDocumentFragment();
    state.directThreads.forEach((thread) => {
      const counterparty = getInboxCounterparty(thread);
      const card = document.createElement('article');
      card.className = `dashboard-item ${thread.id === state.selectedDirectThreadId ? 'is-active' : ''}`;
      card.innerHTML = `<h3>${escapeHtml(counterparty?.name || counterparty?.email || 'Direct thread')}</h3><p class="muted">${escapeHtml(thread.subject || 'Private inbox')} | Updated: ${escapeHtml(new Date(thread.updatedAt).toLocaleString('en-GB'))}</p>`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline';
      btn.textContent = 'Open';
      btn.addEventListener('click', async () => {
        state.selectedDirectThreadId = thread.id;
        renderDirectThreads();
        await loadDirectMessages();
      });
      card.appendChild(btn);
      frag.appendChild(card);
    });
    el.managerDirectThreadsList.appendChild(frag);
    renderOperationsShell();
  };

  const renderDirectMessages = () => {
    el.managerDirectMessagesList.innerHTML = '';
    if (!state.selectedDirectThreadId) {
      el.managerDirectMessagesList.innerHTML = '<p class="muted">Select a private thread to view messages.</p>';
      return;
    }
    if (!state.directMessages.length) {
      el.managerDirectMessagesList.innerHTML = '<p class="muted">No private messages in this thread.</p>';
      return;
    }

    const frag = document.createDocumentFragment();
    state.directMessages.forEach((message) => {
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      const sender = message.sender?.name || message.sender?.email || 'Unknown';
      card.innerHTML = `<p class="muted">${escapeHtml(sender)} | ${escapeHtml(new Date(message.createdAt).toLocaleString('en-GB'))}</p><p>${escapeHtml(message.body || '')}</p>`;
      frag.appendChild(card);
    });
    el.managerDirectMessagesList.appendChild(frag);
  };

  const renderGroupThreads = () => {
    el.managerGroupThreadsList.innerHTML = '';
    if (!state.groupThreads.length) {
      el.managerGroupThreadsList.innerHTML = '<p class="muted">No project chat threads available.</p>';
      renderOperationsShell();
      return;
    }

    const frag = document.createDocumentFragment();
    state.groupThreads.forEach((thread) => {
      const card = document.createElement('article');
      card.className = `dashboard-item ${thread.id === state.selectedGroupThreadId ? 'is-active' : ''}`;
      card.innerHTML = `<h3>${escapeHtml(thread.name || thread.subject || 'Project thread')}</h3><p class="muted">Updated: ${escapeHtml(new Date(thread.updatedAt).toLocaleString('en-GB'))}</p>`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline';
      btn.textContent = 'Open';
      btn.addEventListener('click', async () => {
        state.selectedGroupThreadId = thread.id;
        renderGroupThreads();
        await loadGroupMessages();
      });
      card.appendChild(btn);
      frag.appendChild(card);
    });
    el.managerGroupThreadsList.appendChild(frag);
    renderOperationsShell();
  };

  const renderGroupMessages = () => {
    el.managerGroupMessagesList.innerHTML = '';
    if (!state.selectedGroupThreadId) {
      el.managerGroupMessagesList.innerHTML = '<p class="muted">Select a project chat thread to view messages.</p>';
      return;
    }
    if (!state.groupMessages.length) {
      el.managerGroupMessagesList.innerHTML = '<p class="muted">No project messages in this thread.</p>';
      return;
    }

    const frag = document.createDocumentFragment();
    state.groupMessages.forEach((message) => {
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      const sender = message.sender?.name || message.sender?.email || 'Unknown';
      card.innerHTML = `<p class="muted">${escapeHtml(sender)} | ${escapeHtml(new Date(message.createdAt).toLocaleString('en-GB'))}</p><p>${escapeHtml(message.body || '')}</p>`;
      frag.appendChild(card);
    });
    el.managerGroupMessagesList.appendChild(frag);
  };

  const loadProjectDetail = async (projectId, force = false) => {
    const id = String(projectId || '').trim();
    if (!id) return null;
    if (!force && state.projectDetailsById.has(id)) {
      return state.projectDetailsById.get(id);
    }

    const payload = await api(`/api/manager/projects/${id}`);
    const project = payload?.project || null;
    if (project && project.id) {
      state.projectDetailsById.set(project.id, project);
      return project;
    }

    state.projectDetailsById.delete(id);
    return null;
  };

  const loadProjects = async (selectedId) => {
    const payload = await api(`/api/manager/projects?${buildQuery({
      includeMedia: false,
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

    const visibleProjectIds = new Set(state.projects.map((item) => item.id));
    Array.from(state.projectDetailsById.keys()).forEach((projectId) => {
      if (!visibleProjectIds.has(projectId)) {
        state.projectDetailsById.delete(projectId);
      }
    });

    if (state.selectedProjectId) {
      await loadProjectDetail(state.selectedProjectId, Boolean(selectedId));
    }

    renderProjects();
    fillProjectEditor();
    syncEstimateReferenceOptions();
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

  const loadClients = async () => {
    const payload = await api(`/api/manager/clients/search?${buildQuery({
      q: state.clientsQuery.q,
      pageSize: 25
    })}`);
    state.clients = Array.isArray(payload.clients) ? payload.clients : [];
    renderClients();
  };

  const loadStaff = async () => {
    const payload = await api(`/api/manager/staff/search?${buildQuery({
      q: state.staffQuery.q,
      pageSize: 25
    })}`);
    state.staff = Array.isArray(payload.staff) ? payload.staff : [];
    renderStaff();
  };

  const loadEstimates = async (selectedId) => {
    const payload = await api('/api/manager/estimates?pageSize=100');
    state.estimates = Array.isArray(payload.estimates) ? payload.estimates : [];
    if (selectedId) state.selectedEstimateId = selectedId;
    if (!state.estimates.some((estimate) => estimate.id === state.selectedEstimateId)) {
      state.selectedEstimateId = state.estimates[0]?.id || '';
    }
    if (state.selectedEstimateId) {
      await loadEstimateDetail(state.selectedEstimateId, true);
    }
    fillEstimateEditor();
    renderEstimates();
  };

  const loadEstimateDetail = async (estimateId, force = false) => {
    const id = String(estimateId || '').trim();
    if (!id) return null;
    const existing = state.estimates.find((estimate) => estimate.id === id);
    if (existing && Array.isArray(existing.lines) && !force) {
      return existing;
    }

    const payload = await api(`/api/manager/estimates/${id}`);
    const estimate = payload?.estimate || null;
    if (!estimate?.id) return null;
    const index = state.estimates.findIndex((item) => item.id === estimate.id);
    if (index >= 0) {
      state.estimates.splice(index, 1, estimate);
    } else {
      state.estimates.unshift(estimate);
    }
    return estimate;
  };

  const loadDirectMessages = async () => {
    if (!state.selectedDirectThreadId) {
      state.directMessages = [];
      renderDirectMessages();
      return;
    }
    const payload = await api(`/api/inbox/threads/${state.selectedDirectThreadId}/messages?pageSize=100`);
    state.directMessages = Array.isArray(payload.messages) ? payload.messages : [];
    renderDirectMessages();
  };

  const loadDirectThreads = async (preferredThreadId = '', options = {}) => {
    const { loadMessages = true, pageSize = 100 } = options;
    const payload = await api(`/api/inbox/threads?${buildQuery({ pageSize })}`);
    state.directThreads = Array.isArray(payload.threads) ? payload.threads : [];
    state.overviewLoaded.directThreads = true;
    const nextSelectedId = preferredThreadId || state.selectedDirectThreadId;
    if (!state.directThreads.some((thread) => thread.id === nextSelectedId)) {
      state.selectedDirectThreadId = state.directThreads[0]?.id || '';
    } else {
      state.selectedDirectThreadId = nextSelectedId;
    }
    renderDirectThreads();
    if (loadMessages) {
      await loadDirectMessages();
    }
  };

  const loadGroupMessages = async () => {
    if (!state.selectedGroupThreadId) {
      state.groupMessages = [];
      renderGroupMessages();
      return;
    }
    const payload = await api(`/api/group/threads/${state.selectedGroupThreadId}/messages?pageSize=100`);
    state.groupMessages = Array.isArray(payload.messages) ? payload.messages : [];
    renderGroupMessages();
  };

  const loadGroupThreads = async (preferredThreadId = '', options = {}) => {
    const { loadMessages = true, pageSize = 100 } = options;
    const payload = await api(`/api/group/threads?${buildQuery({ pageSize })}`);
    state.groupThreads = Array.isArray(payload.threads) ? payload.threads : [];
    state.overviewLoaded.groupThreads = true;
    const nextSelectedId = preferredThreadId || state.selectedGroupThreadId;
    if (!state.groupThreads.some((thread) => thread.id === nextSelectedId)) {
      state.selectedGroupThreadId = state.groupThreads[0]?.id || '';
    } else {
      state.selectedGroupThreadId = nextSelectedId;
    }
    renderGroupThreads();
    if (loadMessages) {
      await loadGroupMessages();
    }
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

  const applyClientsFiltersFromUI = () => {
    state.clientsQuery.q = String(el.clientsFilterQ.value || '').trim();
  };

  const applyStaffFiltersFromUI = () => {
    state.staffQuery.q = String(el.staffFilterQ.value || '').trim();
  };

  const setupLazySections = (role) => {
    const tasks = [
      {
        key: 'quotes',
        target: el.quotesList.closest('section'),
        load: async () => {
          if (state.lazyLoaded.quotes) return;
          state.lazyLoaded.quotes = true;
          if (['manager', 'admin'].includes(role)) {
            await loadQuotes();
            return;
          }
          el.quotesFilterQ.disabled = true;
          el.quotesFilterStatus.disabled = true;
          el.quotesRefresh.disabled = true;
          el.quotesPageSize.disabled = true;
          el.quotesPrev.disabled = true;
          el.quotesNext.disabled = true;
          el.quotesList.innerHTML = '<p class="muted">Quote management is available for manager/admin roles.</p>';
        }
      },
      {
        key: 'services',
        target: el.servicesList.closest('section'),
        load: async () => {
          if (state.lazyLoaded.services) return;
          state.lazyLoaded.services = true;
          await loadServices();
        }
      },
      {
        key: 'materials',
        target: el.materialsList.closest('section'),
        load: async () => {
          if (state.lazyLoaded.materials) return;
          state.lazyLoaded.materials = true;
          await loadMaterials();
        }
      },
      {
        key: 'clients',
        target: el.clientsList.closest('section'),
        load: async () => {
          if (state.lazyLoaded.clients) return;
          state.lazyLoaded.clients = true;
          await loadClients();
        }
      },
      {
        key: 'staff',
        target: el.staffList.closest('section'),
        load: async () => {
          if (state.lazyLoaded.staff) return;
          state.lazyLoaded.staff = true;
          await loadStaff();
        }
      },
      {
        key: 'estimates',
        target: el.estimatesList.closest('section'),
        load: async () => {
          if (state.lazyLoaded.estimates) return;
          state.lazyLoaded.estimates = true;
          if (!state.lazyLoaded.services) {
            state.lazyLoaded.services = true;
            await loadServices();
          }
          if (!state.lazyLoaded.materials) {
            state.lazyLoaded.materials = true;
            await loadMaterials();
          }
          await loadEstimates();
        }
      },
      {
        key: 'directThreads',
        target: el.managerDirectThreadsList.closest('section'),
        load: async () => {
          if (state.lazyLoaded.directThreads) return;
          state.lazyLoaded.directThreads = true;
          await loadDirectThreads();
        }
      },
      {
        key: 'groupThreads',
        target: el.managerGroupThreadsList.closest('section'),
        load: async () => {
          if (state.lazyLoaded.groupThreads) return;
          state.lazyLoaded.groupThreads = true;
          await loadGroupThreads();
        }
      }
    ].filter((task) => task.target);

    (runtime.onceVisible || ((items) => {
      items.forEach((item) => item.load());
      return () => {};
    }))(tasks);
  };

  const bootstrap = async () => {
    const loginUrl = `/auth.html?next=${encodeURIComponent('/manager-dashboard.html')}`;
    state.token = getToken();
    if (!state.token) {
      el.session.textContent = 'No active session. Redirecting to login...';
      window.setTimeout(() => {
        window.location.assign(loginUrl);
      }, 700);
      return;
    }
    try {
      state.user = getStoredUser() || await waitForStoredUser();
      const role = String(state.user?.role || '').toLowerCase();
      if (!state.user || !['employee', 'manager', 'admin'].includes(role)) {
        clearSession();
        el.session.textContent = 'Session expired. Redirecting to login...';
        window.setTimeout(() => {
          window.location.assign(loginUrl);
        }, 700);
        return;
      }
      renderSession();
      if (!['manager', 'admin'].includes(role)) {
        el.seedBtn.disabled = true;
        el.seedBtn.title = 'Only manager/admin can run seed';
      }
      await loadProjects();
      const mailboxResults = await Promise.allSettled([
        loadDirectThreads('', { loadMessages: false, pageSize: 4 }),
        loadGroupThreads('', { loadMessages: false, pageSize: 4 })
      ]);
      if (mailboxResults[0]?.status === 'rejected') {
        state.overviewLoaded.directThreads = true;
        state.directThreads = [];
      }
      if (mailboxResults[1]?.status === 'rejected') {
        state.overviewLoaded.groupThreads = true;
        state.groupThreads = [];
      }
      renderOperationsShell();
      setupLazySections(role);
    } catch (error) {
      clearSession();
      el.session.textContent = error.message || 'Session expired. Redirecting to login...';
      window.setTimeout(() => {
        window.location.assign(loginUrl);
      }, 700);
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

  const syncEstimateLineMode = () => {
    const form = el.estimateLineForm?.elements;
    if (!form) return;
    const lineType = String(form.lineType.value || 'service');
    form.serviceId.disabled = lineType !== 'service';
    form.materialId.disabled = lineType !== 'material';
  };
  el.estimateLineForm.elements.lineType.addEventListener('change', syncEstimateLineMode);
  syncEstimateLineMode();

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

  el.staffCreateForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus(el.staffCreateStatus, 'Creating staff member...');
    const f = el.staffCreateForm.elements;
    const payload = {
      name: String(f.name.value || '').trim(),
      email: normEmail(f.email.value),
      password: String(f.password.value || ''),
      role: String(f.role.value || 'employee'),
      phone: String(f.phone.value || '').trim()
    };
    if (!payload.name || !payload.email || !payload.password) {
      return setStatus(el.staffCreateStatus, 'Name, email and password are required.', 'error');
    }
    try {
      await api('/api/manager/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setStatus(el.staffCreateStatus, 'Staff member created.', 'success');
      el.staffCreateForm.reset();
      f.role.value = 'employee';
      await loadStaff();
    } catch (error) {
      setStatus(el.staffCreateStatus, error.message || 'Failed to create staff member.', 'error');
    }
  });

  el.estimateCreateForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus(el.estimateCreateStatus, 'Creating estimate...');
    const f = el.estimateCreateForm.elements;
    const payload = {
      title: String(f.title.value || '').trim(),
      projectId: normUuid(f.projectId.value),
      quoteId: normUuid(f.quoteId.value),
      status: String(f.status.value || 'draft'),
      notes: String(f.notes.value || '').trim()
    };
    if (!payload.title) return setStatus(el.estimateCreateStatus, 'Estimate title is required.', 'error');
    try {
      const result = await api('/api/manager/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setStatus(el.estimateCreateStatus, 'Estimate created.', 'success');
      el.estimateCreateForm.reset();
      f.status.value = 'draft';
      await loadEstimates(result.estimate?.id);
    } catch (error) {
      setStatus(el.estimateCreateStatus, error.message || 'Failed to create estimate.', 'error');
    }
  });

  el.estimateUpdateForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const estimateId = String(el.estimateUpdateForm.elements.id.value || '').trim();
    if (!estimateId) return;
    setStatus(el.estimateUpdateStatus, 'Saving estimate...');
    const f = el.estimateUpdateForm.elements;
    const payload = {
      title: String(f.title.value || '').trim(),
      projectId: normUuid(f.projectId.value),
      quoteId: normUuid(f.quoteId.value),
      status: String(f.status.value || 'draft'),
      notes: String(f.notes.value || '').trim()
    };
    if (!payload.title) return setStatus(el.estimateUpdateStatus, 'Estimate title is required.', 'error');
    try {
      await api(`/api/manager/estimates/${estimateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setStatus(el.estimateUpdateStatus, 'Estimate saved.', 'success');
      await loadEstimates(estimateId);
    } catch (error) {
      setStatus(el.estimateUpdateStatus, error.message || 'Failed to save estimate.', 'error');
    }
  });

  el.estimateDelete.addEventListener('click', async () => {
    const estimate = selectedEstimate();
    if (!estimate) return;
    if (!window.confirm(`Delete estimate "${estimate.title}"?`)) return;
    setStatus(el.estimateUpdateStatus, 'Deleting estimate...');
    try {
      await api(`/api/manager/estimates/${estimate.id}`, { method: 'DELETE' });
      setStatus(el.estimateUpdateStatus, 'Estimate deleted.', 'success');
      await loadEstimates();
    } catch (error) {
      setStatus(el.estimateUpdateStatus, error.message || 'Failed to delete estimate.', 'error');
    }
  });

  el.estimateSendReview.addEventListener('click', async () => {
    const estimate = selectedEstimate();
    if (!estimate) return setStatus(el.estimateUpdateStatus, 'Select an estimate first.', 'error');
    setStatus(el.estimateUpdateStatus, 'Sending estimate to client review...');
    try {
      await api(`/api/manager/estimates/${estimate.id}/send-to-client-review`, { method: 'POST' });
      setStatus(el.estimateUpdateStatus, 'Estimate sent to client review.', 'success');
      await Promise.all([loadEstimates(estimate.id), loadQuotes()]);
    } catch (error) {
      setStatus(el.estimateUpdateStatus, error.message || 'Failed to send estimate to client review.', 'error');
    }
  });

  el.estimateDocumentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const estimate = selectedEstimate();
    if (!estimate) return setStatus(el.estimateDocumentStatus, 'Select an estimate first.', 'error');
    const file = el.estimateDocumentForm.elements.file.files?.[0];
    if (!file) return setStatus(el.estimateDocumentStatus, 'Choose a file first.', 'error');
    setStatus(el.estimateDocumentStatus, 'Uploading estimate file...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api(`/api/manager/estimates/${estimate.id}/document`, {
        method: 'POST',
        body: formData
      });
      setStatus(el.estimateDocumentStatus, 'Estimate file uploaded.', 'success');
      el.estimateDocumentForm.reset();
      await Promise.all([loadEstimates(estimate.id), loadQuotes()]);
    } catch (error) {
      setStatus(el.estimateDocumentStatus, error.message || 'Failed to upload estimate file.', 'error');
    }
  });

  el.estimateLineForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const estimate = selectedEstimate();
    if (!estimate) return setStatus(el.estimateLineStatus, 'Select an estimate first.', 'error');
    setStatus(el.estimateLineStatus, 'Adding estimate line...');
    const f = el.estimateLineForm.elements;
    const lineType = String(f.lineType.value || 'service');
    const payload = {
      lineType,
      serviceId: lineType === 'service' ? normUuid(f.serviceId.value) : null,
      materialId: lineType === 'material' ? normUuid(f.materialId.value) : null,
      description: String(f.description.value || '').trim(),
      unit: String(f.unit.value || '').trim(),
      quantity: Number(f.quantity.value || 1),
      unitCost: f.unitCost.value ? Number(f.unitCost.value) : null,
      lineTotalOverride: f.lineTotalOverride.value ? Number(f.lineTotalOverride.value) : null,
      notes: String(f.notes.value || '').trim()
    };
    if (lineType === 'service' && !payload.serviceId) return setStatus(el.estimateLineStatus, 'Select a service.', 'error');
    if (lineType === 'material' && !payload.materialId) return setStatus(el.estimateLineStatus, 'Select a material.', 'error');
    if (lineType === 'custom' && !payload.description) return setStatus(el.estimateLineStatus, 'Description is required for custom lines.', 'error');
    try {
      await api(`/api/manager/estimates/${estimate.id}/lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setStatus(el.estimateLineStatus, 'Estimate line added.', 'success');
      el.estimateLineForm.reset();
      f.lineType.value = 'service';
      f.unit.value = 'pcs';
      f.quantity.value = '1';
      syncEstimateLineMode();
      await loadEstimates(estimate.id);
    } catch (error) {
      setStatus(el.estimateLineStatus, error.message || 'Failed to add estimate line.', 'error');
    }
  });

  el.managerDirectMessageForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.selectedDirectThreadId) return setStatus(el.managerDirectMessageStatus, 'Select a private thread first.', 'error');
    const body = String(el.managerDirectMessageForm.elements.body.value || '').trim();
    if (!body) return setStatus(el.managerDirectMessageStatus, 'Message is required.', 'error');
    setStatus(el.managerDirectMessageStatus, 'Sending...');
    try {
      await api(`/api/inbox/threads/${state.selectedDirectThreadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body })
      });
      setStatus(el.managerDirectMessageStatus, 'Private message sent.', 'success');
      el.managerDirectMessageForm.reset();
      await loadDirectThreads(state.selectedDirectThreadId);
    } catch (error) {
      setStatus(el.managerDirectMessageStatus, error.message || 'Failed to send private message.', 'error');
    }
  });

  el.managerGroupMessageForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.selectedGroupThreadId) return setStatus(el.managerGroupMessageStatus, 'Select a project thread first.', 'error');
    const body = String(el.managerGroupMessageForm.elements.body.value || '').trim();
    if (!body) return setStatus(el.managerGroupMessageStatus, 'Message is required.', 'error');
    setStatus(el.managerGroupMessageStatus, 'Sending...');
    try {
      await api(`/api/group/threads/${state.selectedGroupThreadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body })
      });
      setStatus(el.managerGroupMessageStatus, 'Project message sent.', 'success');
      el.managerGroupMessageForm.reset();
      await loadGroupThreads(state.selectedGroupThreadId);
    } catch (error) {
      setStatus(el.managerGroupMessageStatus, error.message || 'Failed to send project message.', 'error');
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
  el.clientsRefresh.addEventListener('click', () => { applyClientsFiltersFromUI(); loadClients().catch((e) => window.alert(e.message || 'Could not load clients')); });
  el.staffRefresh.addEventListener('click', () => { applyStaffFiltersFromUI(); loadStaff().catch((e) => window.alert(e.message || 'Could not load staff')); });
  el.logout.addEventListener('click', () => { clearSession(); window.location.href = '/auth.html'; });

  bootstrap();
})();
