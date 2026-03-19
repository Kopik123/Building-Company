(() => {
  const createManagerShellController = ({
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
  } = {}) => {
    if (!state || !el) return null;

    const buildPreviewText = (senderName, preview, fallback) => {
      if (!preview) return fallback;
      return senderName ? `${senderName}: ${preview}` : preview;
    };

    const USER_SEARCH_CACHE_TTL_MS = 30 * 1000;
    const userSearchCache = new Map();
    const dependencies = {
      loadProjects: async () => {},
      openProjectEditor: async () => {},
      projectsController: null,
      quotesController: null,
      catalogController: null,
      peopleController: null,
      estimatesController: null,
      messagesController: null
    };

    const scrollToSection = (sectionId, focusNode) => {
      const section = document.getElementById(sectionId);
      if (!section) return;
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (focusNode && typeof focusNode.focus === 'function') {
        globalThis.setTimeout(() => focusNode.focus({ preventScroll: true }), 180);
      }
    };

    const getInboxCounterparty = (thread) => {
      if (!thread) return null;
      const participantA = thread.participantA || null;
      const participantB = thread.participantB || null;
      if (participantA?.id === state.user?.id) return participantB;
      if (participantB?.id === state.user?.id) return participantA;
      return participantB || participantA;
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
            run: () => dependencies.openProjectEditor?.()
          }
        ]
      },
      materials: {
        description: 'Choose storage first, then add new materials or edit the current inventory list.',
        actions: [
          {
            label: 'Add material',
            variant: 'gold',
            run: () => scrollToSection('manager-materials-section', el.materialCreateForm?.elements?.name)
          },
          {
            label: 'Edit storage',
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

    const getSelectedManagerDomain = () => (
      MANAGER_DOMAIN_CONFIG[state.selectedManagerDomain] ? state.selectedManagerDomain : 'projects'
    );

    const updateManagerDomainButtonStates = (selectedDomain) => {
      (managerDomainButtons || []).forEach((button) => {
        const isActive = button.dataset.managerDomainChoice === selectedDomain;
        button.classList.toggle('btn-gold', isActive);
        button.classList.toggle('btn-outline', !isActive);
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    };

    const updateManagerDomainSectionVisibility = (selectedDomain) => {
      (managerDomainSections || []).forEach((section) => {
        section.classList.toggle('manager-domain-hidden', section.dataset.managerDomainSection !== selectedDomain);
      });
    };

    const createManagerWorkflowActionButton = (action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = action.variant === 'gold'
        ? 'btn btn-gold manager-workflow-action'
        : 'btn btn-outline manager-workflow-action';
      button.textContent = action.label;
      button.disabled = typeof action.disabled === 'function' ? action.disabled() : false;
      button.addEventListener('click', () => {
        action.run();
        renderManagerWorkflow();
      });
      return button;
    };

    const renderManagerWorkflow = () => {
      const selectedDomain = getSelectedManagerDomain();
      state.selectedManagerDomain = selectedDomain;
      updateManagerDomainButtonStates(selectedDomain);
      updateManagerDomainSectionVisibility(selectedDomain);

      const config = MANAGER_DOMAIN_CONFIG[selectedDomain];
      if (el.managerWorkflowDescription) {
        el.managerWorkflowDescription.textContent = config.description;
      }
      if (!el.managerWorkflowActions) return;

      el.managerWorkflowActions.replaceChildren();
      const actionsFragment = document.createDocumentFragment();
      config.actions.forEach((action) => actionsFragment.appendChild(createManagerWorkflowActionButton(action)));
      el.managerWorkflowActions.appendChild(actionsFragment);
    };

    const getRecentProjects = () => (
      [...state.projects]
        .sort((left, right) => {
          const leftDate = Date.parse(left.updatedAt || left.endDate || left.startDate || 0) || 0;
          const rightDate = Date.parse(right.updatedAt || right.endDate || right.startDate || 0) || 0;
          return rightDate - leftDate;
        })
        .slice(0, 3)
    );

    const buildProjectMetaParts = (project) => {
      const metaParts = [];
      if (project.location) metaParts.push(project.location);
      if (project.client?.email) metaParts.push(`Client ${project.client.email}`);
      if (project.assignedManager?.email) metaParts.push(`Staff ${project.assignedManager.email}`);
      const mediaSummary = [];
      if (Number.isFinite(Number(project.imageCount))) mediaSummary.push(`${project.imageCount} images`);
      if (Number.isFinite(Number(project.documentCount))) mediaSummary.push(`${project.documentCount} docs`);
      if (mediaSummary.length) metaParts.push(mediaSummary.join(' / '));
      return metaParts.join(' | ');
    };

    const buildProjectCompanyEvent = (project) => ({
      title: project.title || 'Project',
      detail: `${titleCase(project.status || 'planning')} project${project.showInGallery ? ' | visible in gallery' : ''}`,
      meta: buildProjectMetaParts(project)
    });

    const buildPendingQuotesEvent = () => {
      if (state.lazyLoaded.quotes || state.quotes.length) {
        const pendingQuotes = state.quotes.filter((quote) => String(quote.status || '').toLowerCase() === 'pending').length;
        if (pendingQuotes) {
          return {
            title: `${pendingQuotes} quote${pendingQuotes === 1 ? '' : 's'} waiting`,
            detail: 'Pending response and priority review.',
            meta: 'Quotes become visible here once the quote section has been loaded.'
          };
        }
      }
      return null;
    };

    const buildDraftEstimatesEvent = () => {
      if (state.lazyLoaded.estimates || state.estimates.length) {
        const draftEstimates = state.estimates.filter((estimate) => String(estimate.status || '').toLowerCase() === 'draft').length;
        if (draftEstimates) {
          return {
            title: `${draftEstimates} estimate draft${draftEstimates === 1 ? '' : 's'} open`,
            detail: 'Pricing is still being shaped before client issue.',
            meta: 'Estimate Builder'
          };
        }
      }
      return null;
    };

    const buildLowStockEvent = () => {
      if (state.lazyLoaded.materials || state.materials.length) {
        const lowStock = state.materials.filter((material) => Number(material.stockQty || 0) <= Number(material.minStockQty || 0)).length;
        if (lowStock) {
          return {
            title: `${lowStock} material line${lowStock === 1 ? '' : 's'} flagged`,
            detail: 'Low-stock inventory needs review before the next ordering pass.',
            meta: 'Materials Inventory'
          };
        }
      }
      return null;
    };

    const buildCompanyEvents = () => {
      const items = getRecentProjects().map(buildProjectCompanyEvent);
      [
        buildPendingQuotesEvent(),
        buildDraftEstimatesEvent(),
        buildLowStockEvent()
      ].forEach((item) => {
        if (item) items.push(item);
      });
      return items.slice(0, 4);
    };

    const renderCompanyEvents = () => {
      el.managerCompanyEventsList.innerHTML = '';
      const items = buildCompanyEvents();

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
          const metaParts = [];
          if (Number(thread.unreadCount || 0) > 0) metaParts.push(`${thread.unreadCount} unread`);
          const updatedAt = formatDateTime(thread.latestMessageAt || thread.updatedAt);
          if (updatedAt) metaParts.push(`Updated ${updatedAt}`);
          return {
            title: counterparty?.name || counterparty?.email || 'Direct thread',
            detail: thread.latestMessagePreview || thread.subject || 'Private inbox route',
            meta: metaParts.join(' | ')
          };
        }
      });

      renderMailboxPreviewList(el.managerMailboxProjectPreview, state.groupThreads, {
        loaded: state.overviewLoaded.groupThreads,
        loadingText: 'Loading project threads...',
        emptyText: 'No project threads yet.',
        mapItem: (thread) => {
          const senderName = thread.latestMessageSender?.name || thread.latestMessageSender?.email || '';
          const metaParts = [];
          if (thread.memberCount) metaParts.push(`${thread.memberCount} members`);
          if (thread.messageCount) metaParts.push(`${thread.messageCount} messages`);
          const updatedAt = formatDateTime(thread.latestMessageAt || thread.updatedAt);
          if (updatedAt) metaParts.push(`Updated ${updatedAt}`);
          return {
            title: thread.name || thread.subject || 'Project thread',
            detail: buildPreviewText(senderName, thread.latestMessagePreview, 'Project communication route'),
            meta: metaParts.join(' | ')
          };
        }
      });
    };

    const buildBaseAvailableOptions = () => [
      {
        label: 'Create Project',
        detail: 'Start a new project brief with client and staff assignment.',
        href: '#manager-project-create',
        roles: ['employee', 'manager', 'admin'],
        meta: 'Create'
      },
      {
        label: 'ProjectManager',
        detail: 'Manage status, media, gallery visibility and project documents.',
        href: '#manager-projects-section',
        roles: ['employee', 'manager', 'admin'],
        meta: `${state.projectsPagination.total || state.projects.length || 0} loaded`
      },
      {
        label: 'QuotesReview',
        detail: 'Review new enquiries, priorities and acceptance routes.',
        href: '#manager-quotes-section',
        roles: ['manager', 'admin'],
        meta: state.lazyLoaded.quotes || state.quotes.length ? `${state.quotesPagination.total || state.quotes.length || 0} loaded` : 'Open section'
      },
      {
        label: 'ServicesManage',
        detail: 'Manage the website offer, ordering and visibility.',
        href: '#manager-services-section',
        roles: ['manager', 'admin'],
        meta: state.lazyLoaded.services || state.services.length ? `${state.servicesPagination.total || state.services.length || 0} loaded` : 'Open section'
      },
      {
        label: 'MaterialsTrack',
        detail: 'Track storage, supplier notes and low-storage lines.',
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
        label: 'Estimate',
        detail: 'Build project pricing from service and material lines.',
        href: '#manager-estimates-section',
        roles: ['manager', 'admin'],
        meta: state.lazyLoaded.estimates || state.estimates.length ? `${state.estimates.length} loaded` : 'Open section'
      },
      {
        label: 'PrivateChat',
        detail: 'Keep one-to-one client conversation separate from project chat.',
        href: '#manager-private-inbox',
        roles: ['employee', 'manager', 'admin'],
        meta: state.overviewLoaded.directThreads ? `${state.directThreads.length} threads` : 'Loading summary'
      },
      {
        label: 'ProjectChat',
        detail: 'Open project-specific thread history and team conversation.',
        href: '#manager-project-chat',
        roles: ['employee', 'manager', 'admin'],
        meta: state.overviewLoaded.groupThreads ? `${state.groupThreads.length} threads` : 'Loading summary'
      }
    ];

    const getAvailableOptions = (role) => {
      return buildBaseAvailableOptions().filter((option) => option.roles.includes(role));
    };

    const createWorkspaceOptionLink = (option) => {
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

      return link;
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
      const options = getAvailableOptions(role);
      const frag = document.createDocumentFragment();
      options.forEach((option) => frag.appendChild(createWorkspaceOptionLink(option)));
      el.managerAvailableOptions.appendChild(frag);
    };

    const renderOperationsShell = () => {
      renderCompanyEvents();
      renderMailboxOverview();
      renderAvailableOptions();
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

    const clearAutocompleteState = ({ datalist, statusNode, onResolved, clearStatus = false }) => {
      fillDatalist(datalist, []);
      if (clearStatus) setSmallStatus(statusNode, '', '');
      if (typeof onResolved === 'function') onResolved(null);
    };

    const resolveAutocompleteType = (getType, type) => (
      typeof getType === 'function' ? getType() : type
    );

    const applyAutocompleteMatches = ({ users, value, datalist, statusNode, onResolved }) => {
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
        return;
      }

      setSmallStatus(statusNode, `${users.length} suggestion(s). Keep typing or pick from list.`, '');
      if (typeof onResolved === 'function') onResolved(null);
    };

    const applyAutocompleteError = ({ error, datalist, statusNode, onResolved }) => {
      fillDatalist(datalist, []);
      setSmallStatus(statusNode, error.message || 'Lookup failed.', 'error');
      if (typeof onResolved === 'function') onResolved(null);
    };

    const setupLiveEmailAutocomplete = ({ input, datalist, type, getType, statusNode, onResolved }) => {
      let debounceTimer = null;
      let requestCounter = 0;

      const runSearch = () => {
        const value = normEmail(input.value);
        clearTimeout(debounceTimer);
        if (value.length < 2) {
          clearAutocompleteState({
            datalist,
            statusNode,
            onResolved,
            clearStatus: !value
          });
          return;
        }

        debounceTimer = setTimeout(async () => {
          const requestId = ++requestCounter;
          try {
            const resolvedType = resolveAutocompleteType(getType, type);
            const users = await searchUsersByEmail(resolvedType, value);
            if (requestId !== requestCounter) return;
            applyAutocompleteMatches({ users, value, datalist, statusNode, onResolved });
          } catch (error) {
            if (requestId !== requestCounter) return;
            applyAutocompleteError({ error, datalist, statusNode, onResolved });
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
          clearAutocompleteState({ datalist, statusNode, onResolved, clearStatus: true });
        }
      });
    };

    const createLazySectionTask = (key, target, load) => (
      target ? { key, target, load } : null
    );

    const getLazySectionTasks = (role) => ([
      createLazySectionTask('quotes', el.quotesList.closest('section'), async () => {
        await dependencies.quotesController?.loadQuotesForRole(role);
      }),
      createLazySectionTask('services', el.servicesList.closest('section'), async () => {
        await dependencies.catalogController?.loadServicesIfNeeded();
      }),
      createLazySectionTask('materials', el.materialsList.closest('section'), async () => {
        await dependencies.catalogController?.loadMaterialsIfNeeded();
      }),
      createLazySectionTask('clients', el.clientsList.closest('section'), async () => {
        await dependencies.peopleController?.loadClientsIfNeeded();
      }),
      createLazySectionTask('staff', el.staffList.closest('section'), async () => {
        await dependencies.peopleController?.loadStaffIfNeeded();
      }),
      createLazySectionTask('estimates', el.estimatesList.closest('section'), async () => {
        await dependencies.estimatesController?.loadEstimatesIfNeeded();
      }),
      createLazySectionTask('directThreads', el.managerDirectThreadsList.closest('section'), async () => (
        dependencies.messagesController?.loadDirectThreadsIfNeeded?.()
      )),
      createLazySectionTask('groupThreads', el.managerGroupThreadsList.closest('section'), async () => (
        dependencies.messagesController?.loadGroupThreadsIfNeeded?.()
      ))
    ].filter(Boolean));

    const runLazySectionSetup = (tasks) => (
      globalThis.LevelLinesRuntime?.onceVisible || ((items) => {
        items.forEach((item) => item.load());
        return () => {};
      })
    )(tasks);

    const setupLazySections = (role) => {
      runLazySectionSetup(getLazySectionTasks(role));
    };

    const getManagerLoginUrl = () => `/auth.html?next=${encodeURIComponent('/manager-dashboard.html')}`;

    const redirectToManagerLogin = (message, loginUrl) => {
      el.session.textContent = message;
      globalThis.setTimeout(() => {
        globalThis.location.assign(loginUrl);
      }, 700);
    };

    const isManagerDashboardRole = (role) => ['employee', 'manager', 'admin'].includes(role);

    const getManagerRole = () => String(state.user?.role || '').toLowerCase();

    const applyManagerSeedPermissions = (role) => {
      if (['manager', 'admin'].includes(role)) return;
      el.seedBtn.disabled = true;
      el.seedBtn.title = 'Only manager/admin can run seed';
    };

    const warmMailboxOverview = async () => {
      const mailboxResults = await Promise.allSettled([
        dependencies.messagesController?.loadDirectThreads('', { loadMessages: false, pageSize: 4 }),
        dependencies.messagesController?.loadGroupThreads('', { loadMessages: false, pageSize: 4 })
      ]);
      if (mailboxResults[0]?.status === 'rejected') {
        state.overviewLoaded.directThreads = true;
        state.directThreads = [];
      }
      if (mailboxResults[1]?.status === 'rejected') {
        state.overviewLoaded.groupThreads = true;
        state.groupThreads = [];
      }
    };

    const bootstrap = async () => {
      const loginUrl = getManagerLoginUrl();
      state.token = getToken();
      if (!state.token) {
        redirectToManagerLogin('No active session. Redirecting to login...', loginUrl);
        return;
      }
      try {
        state.user = getStoredUser() || await waitForStoredUser();
        const role = getManagerRole();
        if (!state.user || !isManagerDashboardRole(role)) {
          clearSession();
          redirectToManagerLogin('Session expired. Redirecting to login...', loginUrl);
          return;
        }
        renderSession();
        renderManagerWorkflow();
        applyManagerSeedPermissions(role);
        await dependencies.loadProjects?.();
        await warmMailboxOverview();
        renderOperationsShell();
        setupLazySections(role);
      } catch (error) {
        clearSession();
        redirectToManagerLogin(error.message || 'Session expired. Redirecting to login...', loginUrl);
      }
    };

    const bindProjectAutocompleteInputs = () => {
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
    };

    const bindMessagingAutocompleteInputs = () => {
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
    };

    const bindManagerDomainButtons = () => {
      (managerDomainButtons || []).forEach((button) => {
        button.addEventListener('click', () => {
          state.selectedManagerDomain = button.dataset.managerDomainChoice || 'projects';
          renderManagerWorkflow();
        });
      });
    };

    const refreshManagerSeedData = async (stats) => {
      const refreshTasks = [];
      const projectsChanged = Number(stats.projectsCreated || 0) > 0 || Number(stats.mediaCreated || 0) > 0;

      if (projectsChanged) {
        state.projectsQuery.page = 1;
        refreshTasks.push(dependencies.loadProjects?.());
      }

      refreshTasks.push(dependencies.catalogController?.refreshAfterSeed(stats));

      if (refreshTasks.length) {
        await Promise.all(refreshTasks);
      }
    };

    const handleSeedClick = async () => {
      if (!globalThis.confirm('Run starter seed now?')) return;
      const force = globalThis.confirm('Force-update existing seed records? Click Cancel for safe mode.');
      setStatus(el.seedStatus, 'Running seed...');
      try {
        const payload = await api('/api/manager/seed/starter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force })
        });
        const stats = payload?.stats || {};
        setStatus(
          el.seedStatus,
          `Seed done. Services +${stats.servicesCreated || 0}, materials +${stats.materialsCreated || 0}, projects +${stats.projectsCreated || 0}, media +${stats.mediaCreated || 0}.`,
          'success'
        );
        await refreshManagerSeedData(stats);
      } catch (error) {
        setStatus(el.seedStatus, error.message || 'Seed failed.', 'error');
      }
    };

    const handleManagerLogout = () => {
      clearSession();
      globalThis.location.href = '/auth.html';
    };

    const bindEvents = () => {
      bindProjectAutocompleteInputs();
      bindMessagingAutocompleteInputs();
      bindManagerDomainButtons();
      el.seedBtn.addEventListener('click', handleSeedClick);
      el.logout.addEventListener('click', handleManagerLogout);
    };

    const setDependencies = (nextDependencies = {}) => {
      Object.assign(dependencies, nextDependencies);
    };

    return {
      setDependencies,
      bindEvents,
      bootstrap,
      renderManagerWorkflow,
      renderOperationsShell,
      renderSession,
      resolveUserByEmail,
      getInboxCounterparty
    };
  };

  globalThis.LevelLinesManagerShell = {
    createManagerShellController
  };
})();
