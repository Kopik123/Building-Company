(() => {
  const runtime = window.LevelLinesRuntime || {};
  const dashboardShared = window.LevelLinesDashboardShared || {};
  const managerProjects = window.LevelLinesManagerProjects || {};
  const managerQuotes = window.LevelLinesManagerQuotes || {};
  const managerCatalog = window.LevelLinesManagerCatalog || {};
  const managerPeople = window.LevelLinesManagerPeople || {};
  const managerEstimates = window.LevelLinesManagerEstimates || {};
  const managerMessages = window.LevelLinesManagerMessages || {};
  const managerShell = window.LevelLinesManagerShell || {};
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
  const managerDomainSections = Array.from(document.querySelectorAll('[data-manager-domain-section]'));
  const managerDomainButtons = Array.from(document.querySelectorAll('[data-manager-domain-choice]'));
  let projectsController = null;
  let quotesController = null;
  let catalogController = null;
  let peopleController = null;
  let estimatesController = null;
  let messagesController = null;
  let shellController = null;

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
    meta.className = 'muted dashboard-message-meta';
    const body = document.createElement('p');
    body.className = 'dashboard-message-body';
    const attachments = document.createElement('div');
    attachments.className = 'dashboard-message-attachments';
    attachments.hidden = true;
    card.appendChild(meta);
    card.appendChild(body);
    card.appendChild(attachments);
    return card;
  });
  const renderMessageCardContent = dashboardShared.renderMessageCardContent || ((card, { metaText, bodyText, attachments } = {}) => {
    const metaNode = card.querySelector('.dashboard-message-meta') || card.children[0];
    const bodyNode = card.querySelector('.dashboard-message-body') || card.children[1];
    const attachmentsNode = card.querySelector('.dashboard-message-attachments') || card.children[2];
    if (metaNode) metaNode.textContent = metaText || '';
    if (bodyNode) bodyNode.textContent = bodyText || '';
    if (attachmentsNode) {
      attachmentsNode.innerHTML = '';
      const items = Array.isArray(attachments) ? attachments : [];
      attachmentsNode.hidden = items.length === 0;
      items.forEach((attachment, index) => {
        const link = document.createElement('a');
        link.className = 'dashboard-attachment-link';
        link.href = attachment.url || '#';
        link.target = '_blank';
        link.rel = 'noreferrer noopener';
        link.textContent = attachment.name || `Attachment ${index + 1}`;
        attachmentsNode.appendChild(link);
      });
    }
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
  const scrollToSection = (sectionId, focusNode) => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (focusNode && typeof focusNode.focus === 'function') {
      window.setTimeout(() => focusNode.focus({ preventScroll: true }), 180);
    }
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
    renderOperationsShell: (...args) => shellController?.renderOperationsShell?.(...args),
    requestManagerWorkflowRender: () => shellController?.renderManagerWorkflow?.(),
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
    renderOperationsShell: (...args) => shellController?.renderOperationsShell?.(...args)
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
    renderOperationsShell: (...args) => shellController?.renderOperationsShell?.(...args),
    requestManagerWorkflowRender: () => shellController?.renderManagerWorkflow?.(),
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
    renderOperationsShell: (...args) => shellController?.renderOperationsShell?.(...args)
  });

  estimatesController = (managerEstimates.createManagerEstimatesController || (() => null))({
    state,
    el,
    api,
    setStatus,
    escapeHtml,
    normUuid,
    renderOperationsShell: (...args) => shellController?.renderOperationsShell?.(...args),
    requestAccordionRefresh,
    syncEstimateReferenceOptions,
    ensureCatalogForEstimates: () => catalogController?.ensureCatalogForEstimates?.()
  });

  shellController = (managerShell.createManagerShellController || (() => null))({
    state,
    el,
    api,
    buildQuery,
    setStatus,
    setSmallStatus,
    createOverviewEntry,
    renderMailboxPreviewList,
    titleCase,
    formatDateTime,
    normEmail,
    clearSession,
    getToken,
    getStoredUser,
    waitForStoredUser,
    managerDomainButtons,
    managerDomainSections
  });

  messagesController = (managerMessages.createManagerMessagesController || (() => null))({
    state,
    el,
    api,
    buildQuery,
    syncKeyedList,
    createMutedNode,
    createThreadCard,
    createMessageCard,
    renderMessageCardContent,
    formatDateTime,
    setStatus,
    normUuid,
    normEmail,
    renderOperationsShell: (...args) => shellController?.renderOperationsShell?.(...args),
    resolveUserByEmail: (...args) => shellController?.resolveUserByEmail?.(...args),
    getInboxCounterparty: (...args) => shellController?.getInboxCounterparty?.(...args),
    setSelectOptions
  });
  shellController?.setDependencies({
    loadProjects,
    openProjectEditor,
    projectsController,
    quotesController,
    catalogController,
    peopleController,
    estimatesController,
    messagesController
  });

  projectsController?.bindEvents();
  quotesController?.bindEvents();
  catalogController?.bindEvents();
  peopleController?.bindEvents();
  estimatesController?.bindEvents();
  messagesController?.bindEvents();
  shellController?.bindEvents();

  shellController?.bootstrap();
})();
