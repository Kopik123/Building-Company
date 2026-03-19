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
        window.setTimeout(() => focusNode.focus({ preventScroll: true }), 180);
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

    const renderManagerWorkflow = () => {
      const selectedDomain = MANAGER_DOMAIN_CONFIG[state.selectedManagerDomain] ? state.selectedManagerDomain : 'projects';
      state.selectedManagerDomain = selectedDomain;

      (managerDomainButtons || []).forEach((button) => {
        const isActive = button.dataset.managerDomainChoice === selectedDomain;
        button.classList.toggle('btn-gold', isActive);
        button.classList.toggle('btn-outline', !isActive);
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      (managerDomainSections || []).forEach((section) => {
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
            await dependencies.quotesController?.loadQuotesForRole(role);
          }
        },
        {
          key: 'services',
          target: el.servicesList.closest('section'),
          load: async () => {
            await dependencies.catalogController?.loadServicesIfNeeded();
          }
        },
        {
          key: 'materials',
          target: el.materialsList.closest('section'),
          load: async () => {
            await dependencies.catalogController?.loadMaterialsIfNeeded();
          }
        },
        {
          key: 'clients',
          target: el.clientsList.closest('section'),
          load: async () => {
            await dependencies.peopleController?.loadClientsIfNeeded();
          }
        },
        {
          key: 'staff',
          target: el.staffList.closest('section'),
          load: async () => {
            await dependencies.peopleController?.loadStaffIfNeeded();
          }
        },
        {
          key: 'estimates',
          target: el.estimatesList.closest('section'),
          load: async () => {
            await dependencies.estimatesController?.loadEstimatesIfNeeded();
          }
        },
        {
          key: 'directThreads',
          target: el.managerDirectThreadsList.closest('section'),
          load: async () => dependencies.messagesController?.loadDirectThreadsIfNeeded?.()
        },
        {
          key: 'groupThreads',
          target: el.managerGroupThreadsList.closest('section'),
          load: async () => dependencies.messagesController?.loadGroupThreadsIfNeeded?.()
        }
      ].filter((task) => task.target);

      (window.LevelLinesRuntime?.onceVisible || ((items) => {
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
        await dependencies.loadProjects?.();
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

    const bindEvents = () => {
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

      (managerDomainButtons || []).forEach((button) => {
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
            refreshTasks.push(dependencies.loadProjects?.());
          }

          refreshTasks.push(dependencies.catalogController?.refreshAfterSeed(stats));

          if (refreshTasks.length) {
            await Promise.all(refreshTasks);
          }
        } catch (error) {
          setStatus(el.seedStatus, error.message || 'Seed failed.', 'error');
        }
      });

      el.logout.addEventListener('click', () => {
        clearSession();
        window.location.href = '/auth.html';
      });
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

  window.LevelLinesManagerShell = {
    createManagerShellController
  };
})();
