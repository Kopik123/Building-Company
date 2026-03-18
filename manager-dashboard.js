(() => {
  const runtime = window.LevelLinesRuntime || {};
  const dashboardShared = window.LevelLinesDashboardShared || {};
  const managerProjects = window.LevelLinesManagerProjects || {};
  const managerQuotes = window.LevelLinesManagerQuotes || {};
  const managerCatalog = window.LevelLinesManagerCatalog || {};
  const managerPeople = window.LevelLinesManagerPeople || {};
  const managerEstimates = window.LevelLinesManagerEstimates || {};
  const managerMessages = window.LevelLinesManagerMessages || {};
  const TOKEN_KEY = runtime.TOKEN_KEY || 'll_auth_token';
  const USER_KEY = runtime.USER_KEY || 'll_auth_user';
  const DEFAULT_PAGE_SIZE = 25;

  const el = {
    session: document.getElementById('dashboard-session'),
    logout: document.getElementById('dashboard-logout'),
    seedBtn: document.getElementById('dashboard-seed-btn'),
    seedStatus: document.getElementById('dashboard-seed-status'),
    managerWorkflowDescription: document.getElementById('manager-workflow-description'),
    managerWorkflowActions: document.getElementById('manager-workflow-actions'),
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
    estimateDelete: document.getElementById('estimate-delete-btn'),
    estimateLineForm: document.getElementById('estimate-line-form'),
    estimateLineStatus: document.getElementById('estimate-line-status'),
    estimateLinesList: document.getElementById('estimate-lines-list'),
    managerDirectThreadsList: document.getElementById('manager-direct-threads-list'),
    managerDirectMessagesList: document.getElementById('manager-direct-messages-list'),
    managerDirectThreadForm: document.getElementById('manager-direct-thread-form'),
    managerDirectThreadStatus: document.getElementById('manager-direct-thread-status'),
    managerDirectRecipientSuggestions: document.getElementById('manager-direct-recipient-suggestions'),
    managerDirectRecipientLookupStatus: document.getElementById('manager-direct-recipient-lookup-status'),
    managerDirectMessageForm: document.getElementById('manager-direct-message-form'),
    managerDirectMessageStatus: document.getElementById('manager-direct-message-status'),
    managerGroupThreadsList: document.getElementById('manager-group-threads-list'),
    managerGroupThreadForm: document.getElementById('manager-group-thread-form'),
    managerGroupThreadStatus: document.getElementById('manager-group-thread-status'),
    managerGroupMembersList: document.getElementById('manager-group-members-list'),
    managerGroupMemberForm: document.getElementById('manager-group-member-form'),
    managerGroupMemberStatus: document.getElementById('manager-group-member-status'),
    managerGroupMemberSuggestions: document.getElementById('manager-group-member-suggestions'),
    managerGroupMemberLookupStatus: document.getElementById('manager-group-member-lookup-status'),
    managerGroupCreateParticipantSuggestions: document.getElementById('manager-group-create-participant-suggestions'),
    managerGroupCreateParticipantLookupStatus: document.getElementById('manager-group-create-participant-lookup-status'),
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
    selectedManagerDomain: 'projects',
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
  const managerDomainSections = Array.from(document.querySelectorAll('[data-manager-domain-section]'));
  const managerDomainButtons = Array.from(document.querySelectorAll('[data-manager-domain-choice]'));
  let renderManagerWorkflow = () => {};
  let projectsController = null;
  let quotesController = null;
  let catalogController = null;
  let peopleController = null;
  let estimatesController = null;
  let messagesController = null;

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
  const createOverviewEntry = dashboardShared.createOverviewEntry || runtime.createOverviewEntry || (({ title, detail, meta }) => {
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
  const syncKeyedList = dashboardShared.syncKeyedList || runtime.syncKeyedList || ((container, items, { getKey, createNode, updateNode, createEmptyNode } = {}) => {
    if (!container) return;
    const existingByKey = new Map();
    let emptyNode = null;
    Array.from(container.children).forEach((child) => {
      if (child.dataset.emptyState === 'true') {
        emptyNode = child;
        return;
      }
      if (child.dataset.renderKey) existingByKey.set(child.dataset.renderKey, child);
    });
    if (!Array.isArray(items) || !items.length) {
      existingByKey.forEach((node) => node.remove());
      if (!createEmptyNode) {
        if (emptyNode) emptyNode.remove();
        return;
      }
      const nextEmptyNode = createEmptyNode();
      nextEmptyNode.dataset.emptyState = 'true';
      if (emptyNode) {
        if (emptyNode !== nextEmptyNode) emptyNode.replaceWith(nextEmptyNode);
      } else {
        container.appendChild(nextEmptyNode);
      }
      return;
    }
    if (emptyNode) emptyNode.remove();
    const orderedNodes = items.map((item, index) => {
      const key = String(getKey(item, index));
      let node = existingByKey.get(key);
      if (!node) {
        node = createNode(item, index);
        node.dataset.renderKey = key;
      }
      updateNode(node, item, index);
      existingByKey.delete(key);
      return node;
    });
    orderedNodes.forEach((node, index) => {
      const currentNode = container.children[index];
      if (currentNode !== node) {
        container.insertBefore(node, currentNode || null);
      }
    });
    existingByKey.forEach((node) => node.remove());
  });

  const createMutedNode = dashboardShared.createMutedNode || ((message) => {
    const node = document.createElement('p');
    node.className = 'muted';
    node.textContent = message;
    return node;
  });

  const createThreadCard = dashboardShared.createThreadCard || (({ onOpen }) => {
    const card = document.createElement('article');
    card.className = 'dashboard-item';
    const heading = document.createElement('h3');
    heading.className = 'dashboard-item-title';
    const meta = document.createElement('p');
    meta.className = 'muted';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline';
    btn.textContent = 'Open';
    btn.addEventListener('click', async () => {
      const threadId = card.dataset.threadId || '';
      if (!threadId) return;
      await onOpen(threadId);
    });
    card.appendChild(heading);
    card.appendChild(meta);
    card.appendChild(btn);
    return card;
  });

  const createMessageCard = dashboardShared.createMessageCard || (() => {
    const card = document.createElement('article');
    card.className = 'dashboard-item';
    const meta = document.createElement('p');
    meta.className = 'muted';
    const body = document.createElement('p');
    card.appendChild(meta);
    card.appendChild(body);
    return card;
  });
  const renderMailboxPreviewList = dashboardShared.renderMailboxPreviewList || runtime.renderMailboxPreviewList || ((node, items, { loaded, loadingText, emptyText, mapItem }) => {
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

  const scrollToSection = (sectionId, focusNode) => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (focusNode && typeof focusNode.focus === 'function') {
      window.setTimeout(() => focusNode.focus({ preventScroll: true }), 180);
    }
  };

  const MANAGER_DOMAIN_CONFIG = {
    projects: {
      description: 'Choose the project route first, then create a new project or edit the selected one.',
      actions: [
        {
          label: 'Create project',
          variant: 'gold',
          run: () => scrollToSection('manager-project-create', el.projectCreateForm?.elements?.title)
        },
        {
          label: 'Browse projects',
          variant: 'outline',
          run: () => scrollToSection('manager-projects-section', el.projectsFilterQ)
        },
        {
          label: 'Edit selected',
          variant: 'outline',
          disabled: () => !state.selectedProjectId,
          run: () => openProjectEditor()
        }
      ]
    },
    materials: {
      description: 'Choose stock first, then add new materials or edit the current inventory list.',
      actions: [
        {
          label: 'Add material',
          variant: 'gold',
          run: () => scrollToSection('manager-materials-section', el.materialCreateForm?.elements?.name)
        },
        {
          label: 'Edit stock',
          variant: 'outline',
          run: () => scrollToSection('manager-materials-section', el.materialsFilterQ)
        }
      ]
    },
    services: {
      description: 'Choose services first, then add a new website offer or edit the current service catalogue.',
      actions: [
        {
          label: 'Add service',
          variant: 'gold',
          run: () => scrollToSection('manager-services-section', el.serviceCreateForm?.elements?.title)
        },
        {
          label: 'Edit services',
          variant: 'outline',
          run: () => scrollToSection('manager-services-section', el.servicesFilterQ)
        }
      ]
    }
  };

  renderManagerWorkflow = () => {
    const selectedDomain = MANAGER_DOMAIN_CONFIG[state.selectedManagerDomain] ? state.selectedManagerDomain : 'projects';
    state.selectedManagerDomain = selectedDomain;

    managerDomainButtons.forEach((button) => {
      const isActive = button.dataset.managerDomainChoice === selectedDomain;
      button.classList.toggle('btn-gold', isActive);
      button.classList.toggle('btn-outline', !isActive);
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    managerDomainSections.forEach((section) => {
      section.classList.toggle('manager-domain-hidden', section.dataset.managerDomainSection !== selectedDomain);
    });

    const config = MANAGER_DOMAIN_CONFIG[selectedDomain];
    if (el.managerWorkflowDescription) {
      el.managerWorkflowDescription.textContent = config.description;
    }
    if (!el.managerWorkflowActions) return;

    el.managerWorkflowActions.replaceChildren();
    config.actions.forEach((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = action.variant === 'gold' ? 'btn btn-gold manager-workflow-action' : 'btn btn-outline manager-workflow-action';
      button.textContent = action.label;
      button.disabled = typeof action.disabled === 'function' ? action.disabled() : false;
      button.addEventListener('click', () => {
        action.run();
        renderManagerWorkflow();
      });
      el.managerWorkflowActions.appendChild(button);
    });
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

  const loadProjects = async (...args) => {
    const result = await projectsController?.loadProjects(...args);
    messagesController?.syncProjectChatProjectOptions?.();
    return result;
  };
  const openProjectEditor = (...args) => projectsController?.openProjectEditor(...args);

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

  projectsController = (managerProjects.createManagerProjectsController || (() => null))({
    state,
    el,
    api,
    buildQuery,
    syncKeyedList,
    createMutedNode,
    renderPagination,
    setStatus,
    setSmallStatus,
    requestAccordionRefresh,
    escapeHtml,
    normUuid,
    normEmail,
    toDateInputValue,
    renderOperationsShell,
    requestManagerWorkflowRender: () => renderManagerWorkflow(),
    syncEstimateReferenceOptions,
    scrollToSection,
    onProjectsChanged: () => messagesController?.syncProjectChatProjectOptions?.()
  });

  quotesController = (managerQuotes.createManagerQuotesController || (() => null))({
    state,
    el,
    api,
    buildQuery,
    syncKeyedList,
    createMutedNode,
    renderPagination,
    createControlField,
    createEditActions,
    escapeHtml,
    renderOperationsShell
  });

  catalogController = (managerCatalog.createManagerCatalogController || (() => null))({
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
    defaultPageSize: DEFAULT_PAGE_SIZE,
    renderOperationsShell,
    requestManagerWorkflowRender: () => renderManagerWorkflow(),
    syncEstimateReferenceOptions
  });

  peopleController = (managerPeople.createManagerPeopleController || (() => null))({
    state,
    el,
    api,
    buildQuery,
    createMutedNode,
    setStatus,
    escapeHtml,
    renderOperationsShell
  });

  estimatesController = (managerEstimates.createManagerEstimatesController || (() => null))({
    state,
    el,
    api,
    setStatus,
    escapeHtml,
    normUuid,
    renderOperationsShell,
    requestAccordionRefresh,
    syncEstimateReferenceOptions,
    ensureCatalogForEstimates: () => catalogController?.ensureCatalogForEstimates?.()
  });

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

  const resolveUserByEmail = async (type, queryText) => {
    const normalized = normEmail(queryText);
    if (!normalized) return null;
    const users = await searchUsersByEmail(type, normalized);
    return users.find((user) => normEmail(user.email) === normalized) || null;
  };

  messagesController = (managerMessages.createManagerMessagesController || (() => null))({
    state,
    el,
    api,
    buildQuery,
    syncKeyedList,
    createMutedNode,
    createThreadCard,
    createMessageCard,
    formatDateTime,
    setStatus,
    normUuid,
    normEmail,
    renderOperationsShell,
    resolveUserByEmail,
    getInboxCounterparty,
    setSelectOptions
  });

  const setupLiveEmailAutocomplete = ({ input, datalist, type, getType, statusNode, onResolved }) => {
    let debounceTimer = null;
    let requestCounter = 0;

    const runSearch = () => {
      const value = normEmail(input.value);
      clearTimeout(debounceTimer);
      if (value.length < 2) {
        fillDatalist(datalist, []);
        if (!value) setSmallStatus(statusNode, '', '');
        if (typeof onResolved === 'function') onResolved(null);
        return;
      }

      debounceTimer = setTimeout(async () => {
        const requestId = ++requestCounter;
        try {
          const resolvedType = typeof getType === 'function' ? getType() : type;
          const users = await searchUsersByEmail(resolvedType, value);
          if (requestId !== requestCounter) return;
          fillDatalist(datalist, users);
          if (!users.length) {
            setSmallStatus(statusNode, 'No matches.', 'error');
            if (typeof onResolved === 'function') onResolved(null);
            return;
          }
          const exact = users.find((user) => normEmail(user.email) === value);
          if (exact) {
            setSmallStatus(statusNode, `Matched: ${exact.name || exact.email} (${exact.email})`, '');
            if (typeof onResolved === 'function') onResolved(exact);
          } else {
            setSmallStatus(statusNode, `${users.length} suggestion(s). Keep typing or pick from list.`, '');
            if (typeof onResolved === 'function') onResolved(null);
          }
        } catch (error) {
          if (requestId !== requestCounter) return;
          fillDatalist(datalist, []);
          setSmallStatus(statusNode, error.message || 'Lookup failed.', 'error');
          if (typeof onResolved === 'function') onResolved(null);
        }
      }, 260);
    };

    input.addEventListener('input', runSearch);
    if (typeof getType === 'function') {
      const updateForTypeChange = () => {
        fillDatalist(datalist, []);
        runSearch();
      };
      input.form?.addEventListener('change', (event) => {
        if (event.target === input.form?.elements?.recipientType || event.target === input.form?.elements?.participantType) {
          updateForTypeChange();
        }
      });
    }
    input.addEventListener('blur', () => {
      const value = normEmail(input.value);
      if (!value) {
        setSmallStatus(statusNode, '', '');
        if (typeof onResolved === 'function') onResolved(null);
      }
    });
  };

  const setupLazySections = (role) => {
    const tasks = [
      {
        key: 'quotes',
        target: el.quotesList.closest('section'),
        load: async () => {
          await quotesController?.loadQuotesForRole(role);
        }
      },
      {
        key: 'services',
        target: el.servicesList.closest('section'),
        load: async () => {
          await catalogController?.loadServicesIfNeeded();
        }
      },
      {
        key: 'materials',
        target: el.materialsList.closest('section'),
        load: async () => {
          await catalogController?.loadMaterialsIfNeeded();
        }
      },
      {
        key: 'clients',
        target: el.clientsList.closest('section'),
        load: async () => {
          await peopleController?.loadClientsIfNeeded();
        }
      },
      {
        key: 'staff',
        target: el.staffList.closest('section'),
        load: async () => {
          await peopleController?.loadStaffIfNeeded();
        }
      },
      {
        key: 'estimates',
        target: el.estimatesList.closest('section'),
        load: async () => {
          await estimatesController?.loadEstimatesIfNeeded();
        }
      },
      {
        key: 'directThreads',
        target: el.managerDirectThreadsList.closest('section'),
        load: async () => messagesController?.loadDirectThreadsIfNeeded?.()
      },
      {
        key: 'groupThreads',
        target: el.managerGroupThreadsList.closest('section'),
        load: async () => messagesController?.loadGroupThreadsIfNeeded?.()
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
      renderManagerWorkflow();
      if (!['manager', 'admin'].includes(role)) {
        el.seedBtn.disabled = true;
        el.seedBtn.title = 'Only manager/admin can run seed';
      }
      await loadProjects();
      const mailboxResults = await Promise.allSettled([
        messagesController?.loadDirectThreads('', { loadMessages: false, pageSize: 4 }),
        messagesController?.loadGroupThreads('', { loadMessages: false, pageSize: 4 })
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
  setupLiveEmailAutocomplete({
    input: el.managerDirectThreadForm.elements.recipientEmail,
    datalist: el.managerDirectRecipientSuggestions,
    getType: () => String(el.managerDirectThreadForm.elements.recipientType.value || 'client'),
    statusNode: el.managerDirectRecipientLookupStatus
  });
  setupLiveEmailAutocomplete({
    input: el.managerGroupThreadForm.elements.participantEmail,
    datalist: el.managerGroupCreateParticipantSuggestions,
    getType: () => String(el.managerGroupThreadForm.elements.participantType.value || 'client'),
    statusNode: el.managerGroupCreateParticipantLookupStatus
  });
  setupLiveEmailAutocomplete({
    input: el.managerGroupMemberForm.elements.participantEmail,
    datalist: el.managerGroupMemberSuggestions,
    getType: () => String(el.managerGroupMemberForm.elements.participantType.value || 'client'),
    statusNode: el.managerGroupMemberLookupStatus
  });

  projectsController?.bindEvents();
  quotesController?.bindEvents();
  catalogController?.bindEvents();
  peopleController?.bindEvents();
  estimatesController?.bindEvents();
  messagesController?.bindEvents();

  managerDomainButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedManagerDomain = button.dataset.managerDomainChoice || 'projects';
      renderManagerWorkflow();
    });
  });

  el.seedBtn.addEventListener('click', async () => {
    if (!window.confirm('Run starter seed now?')) return;
    const force = window.confirm('Force-update existing seed records? Click Cancel for safe mode.');
    setStatus(el.seedStatus, 'Running seed...');
    try {
      const payload = await api('/api/manager/seed/starter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force }) });
      const stats = payload?.stats || {};
      setStatus(el.seedStatus, `Seed done. Services +${stats.servicesCreated || 0}, materials +${stats.materialsCreated || 0}, projects +${stats.projectsCreated || 0}, media +${stats.mediaCreated || 0}.`, 'success');
      const refreshTasks = [];
      const projectsChanged = Number(stats.projectsCreated || 0) > 0 || Number(stats.mediaCreated || 0) > 0;

      if (projectsChanged) {
        state.projectsQuery.page = 1;
        refreshTasks.push(loadProjects());
      }

      refreshTasks.push(catalogController?.refreshAfterSeed(stats));

      if (refreshTasks.length) {
        await Promise.all(refreshTasks);
      }
    } catch (error) {
      setStatus(el.seedStatus, error.message || 'Seed failed.', 'error');
    }
  });

  el.logout.addEventListener('click', () => { clearSession(); window.location.href = '/auth.html'; });

  bootstrap();
})();
