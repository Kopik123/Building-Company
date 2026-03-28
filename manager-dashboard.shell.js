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

    const brand = globalThis.LEVEL_LINES_BRAND || null;
    const buildPreviewText = (senderName, preview, fallback) => {
      if (!preview) return fallback;
      return senderName ? `${senderName}: ${preview}` : preview;
    };

    const USER_SEARCH_CACHE_TTL_MS = 30 * 1000;
    const userSearchCache = new Map();
    const getRoleProfile = (roleRaw) => {
      const role = String(roleRaw || '').toLowerCase();
      return brand?.roleProfiles?.[role] || null;
    };
    const getManagerQuickAccessOptions = () => Array.isArray(brand?.managerQuickAccess) ? brand.managerQuickAccess : [];
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

    const CARD_CONFIG = {
      overview: {
        label: 'Overview',
        description: 'Active projects, alerts, inbox and current workload in one shell.'
      },
      projects: {
        label: 'Projects',
        description: 'Create briefs, assign owners, tune stage and delivery timing.'
      },
      quotes: {
        label: 'Quotes',
        description: 'Review enquiries, workflow status, priorities and conversion readiness.'
      },
      estimates: {
        label: 'Estimates',
        description: 'Draft, revise and approve pricing with quote and project context.'
      },
      inbox: {
        label: 'Inbox',
        description: 'Switch between private inbox and project chat without losing context.'
      },
      website: {
        label: 'Website',
        description: 'Control brochure copy, metadata, CTAs and public SEO structure.'
      },
      services: {
        label: 'Services',
        description: 'Manage brochure-facing service rows, ordering and visibility.'
      },
      stock: {
        label: 'Stock',
        description: 'Track materials, supplier details and low-stock routes.'
      },
      crm: {
        label: 'Clients / CRM',
        description: 'See lifecycle, contact context and linked work for active clients.'
      },
      staff: {
        label: 'Staff',
        description: 'Control roles, access, availability and team visibility.'
      }
    };

    const LEGACY_SECTION_TO_CARD = {
      'manager-project-create': 'projects',
      'manager-projects-section': 'projects',
      'project-editor-card': 'projects',
      'manager-quotes-section': 'quotes',
      'manager-estimates-section': 'estimates',
      'estimate-editor-card': 'estimates',
      'manager-private-inbox': 'inbox',
      'manager-project-chat': 'inbox',
      'manager-services-section': 'services',
      'manager-materials-section': 'stock',
      'manager-clients-section': 'crm',
      'manager-staff-section': 'staff'
    };

    const LEGACY_SECTION_TO_SUBCARD = {
      'manager-private-inbox': 'private',
      'manager-project-chat': 'project'
    };

    const normalizeCardId = (value) => {
      const normalized = String(value || '').trim().toLowerCase();
      return CARD_CONFIG[normalized] ? normalized : 'overview';
    };

    const normalizeSubcardId = (value) => {
      const normalized = String(value || '').trim().toLowerCase();
      return normalized === 'project' ? 'project' : 'private';
    };

    const buildCardHash = (cardId, subcardId = state.activeManagerSubcard) => {
      const card = normalizeCardId(cardId);
      if (card !== 'inbox') return `#${card}`;
      return `#inbox:${normalizeSubcardId(subcardId)}`;
    };

    const parseManagerHash = () => {
      const raw = String(globalThis.location.hash || '').replace(/^#/, '').trim();
      if (!raw) {
        return { cardId: 'overview', subcardId: 'private', focusId: '' };
      }

      if (LEGACY_SECTION_TO_CARD[raw]) {
        return {
          cardId: LEGACY_SECTION_TO_CARD[raw],
          subcardId: normalizeSubcardId(LEGACY_SECTION_TO_SUBCARD[raw]),
          focusId: raw
        };
      }

      const [cardRaw, subcardRaw] = raw.split(':');
      return {
        cardId: normalizeCardId(cardRaw),
        subcardId: normalizeSubcardId(subcardRaw),
        focusId: ''
      };
    };

    const scrollToSection = (sectionId, focusNode) => {
      const mappedCardId = LEGACY_SECTION_TO_CARD[sectionId];
      if (mappedCardId) {
        activateManagerCard(mappedCardId, {
          subcardId: LEGACY_SECTION_TO_SUBCARD[sectionId],
          updateHash: true
        });
      }
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

    const activateInboxSubcard = (subcardId, { updateHash = false } = {}) => {
      const nextSubcardId = normalizeSubcardId(subcardId);
      state.activeManagerSubcard = nextSubcardId;
      (el.managerInboxPanels || []).forEach((panel) => {
        const isActive = panel.dataset.managerInboxPanel === nextSubcardId;
        panel.hidden = !isActive;
        panel.classList.toggle('is-active', isActive);
      });
      (el.managerSubcardLinks || []).forEach((button) => {
        const isActive = button.dataset.managerSubcardLink === nextSubcardId;
        button.classList.toggle('btn-gold', isActive);
        button.classList.toggle('btn-outline', !isActive);
        button.classList.toggle('is-active', isActive);
      });
      if (updateHash && state.activeManagerCard === 'inbox') {
        globalThis.history.replaceState(null, '', buildCardHash('inbox', nextSubcardId));
      }
    };

    const loadManagerCardData = async (cardId, subcardId = state.activeManagerSubcard) => {
      const normalizedCardId = normalizeCardId(cardId);
      switch (normalizedCardId) {
        case 'projects':
          await dependencies.loadProjects?.();
          break;
        case 'quotes':
          await dependencies.quotesController?.loadQuotesForRole?.(getManagerRole());
          break;
        case 'estimates':
          await dependencies.estimatesController?.loadEstimatesIfNeeded?.();
          break;
        case 'inbox':
          if (normalizeSubcardId(subcardId) === 'project') {
            await dependencies.messagesController?.loadGroupThreadsIfNeeded?.();
          } else {
            await dependencies.messagesController?.loadDirectThreadsIfNeeded?.();
          }
          break;
        case 'services':
          await dependencies.catalogController?.loadServicesIfNeeded?.();
          break;
        case 'stock':
          await dependencies.catalogController?.loadMaterialsIfNeeded?.();
          break;
        case 'crm':
          await dependencies.peopleController?.loadClientsIfNeeded?.();
          break;
        case 'staff':
          await dependencies.peopleController?.loadStaffIfNeeded?.();
          break;
        default:
          break;
      }
    };

    const activateManagerCard = (cardId, { subcardId, updateHash = false, focusNode = null, focusId = '' } = {}) => {
      const nextCardId = normalizeCardId(cardId);
      state.activeManagerCard = nextCardId;
      (el.managerCardPanels || []).forEach((panel) => {
        const isActive = panel.dataset.managerCardPanel === nextCardId;
        panel.hidden = !isActive;
        panel.classList.toggle('is-active', isActive);
      });
      (el.managerCardLinks || []).forEach((link) => {
        const isActive = normalizeCardId(link.dataset.managerCardLink) === nextCardId;
        link.classList.toggle('is-active', isActive);
      });

      if (nextCardId === 'inbox') {
        activateInboxSubcard(subcardId, { updateHash: false });
      }

      if (updateHash) {
        globalThis.history.replaceState(null, '', buildCardHash(nextCardId, subcardId));
      }

      const targetFocus = focusNode || (focusId ? document.getElementById(focusId) : null);
      if (targetFocus && typeof targetFocus.focus === 'function') {
        globalThis.setTimeout(() => targetFocus.focus({ preventScroll: true }), 140);
      }

      loadManagerCardData(nextCardId, subcardId).catch(() => {});
    };

    const getOverviewMetrics = () => state.overviewSummary?.metrics || {};

    const getCardBadge = (cardId) => {
      const metrics = getOverviewMetrics();
      switch (normalizeCardId(cardId)) {
        case 'overview':
          return 'Home';
        case 'projects':
          return `${state.projectsPagination.total || metrics.projectCount || state.projects.length || 0} live`;
        case 'quotes':
          return `${state.quotesPagination.total || metrics.quoteCount || state.quotes.length || 0} in queue`;
        case 'estimates':
          return `${state.estimates.length || 0} loaded`;
        case 'inbox':
          return `${(state.directThreads.length || 0) + (state.groupThreads.length || 0)} threads`;
        case 'website':
          return 'SEO / content';
        case 'services':
          return `${state.servicesPagination.total || state.services.length || metrics.publicServiceCount || 0} live`;
        case 'stock':
          return `${state.materialsPagination.total || state.materials.length || metrics.lowStockMaterialCount || 0} lines`;
        case 'crm':
          return `${metrics.clientCount || state.clients.length || 0} clients`;
        case 'staff':
          return `${metrics.staffCount || state.staff.length || 0} staff`;
        default:
          return '';
      }
    };

    const renderOverviewList = (container, items, emptyText) => {
      if (!container) return;
      container.innerHTML = '';
      if (!items.length) {
        const text = document.createElement('p');
        text.className = 'muted';
        text.textContent = emptyText;
        container.appendChild(text);
        return;
      }

      const fragment = document.createDocumentFragment();
      items.forEach((item) => fragment.appendChild(createOverviewEntry(item)));
      container.appendChild(fragment);
    };

    const renderOverviewMetrics = () => {
      const summary = state.overviewSummary || null;
      const metrics = summary?.metrics || {};
      const unreadInboxCount = Number(metrics.projectThreadCount || 0) + Number(metrics.directThreadCount || 0);
      const draftOrSentEstimates = state.estimates.filter((estimate) => {
        const status = String(estimate.status || '').toLowerCase();
        return status === 'draft' || status === 'sent';
      }).length;
      const crmOpenCount = Number(metrics.clientCount || 0) + Number(metrics.staffCount || 0);

      if (el.managerOverviewActiveProjects) el.managerOverviewActiveProjects.textContent = String(metrics.activeProjectCount || state.projects.length || 0);
      if (el.managerOverviewOpenQuotes) el.managerOverviewOpenQuotes.textContent = String(metrics.openQuoteCount || state.quotes.length || 0);
      if (el.managerOverviewEstimates) el.managerOverviewEstimates.textContent = String(draftOrSentEstimates || state.estimates.length || 0);
      if (el.managerOverviewUnreadInbox) el.managerOverviewUnreadInbox.textContent = String(unreadInboxCount);
      if (el.managerOverviewLowStock) el.managerOverviewLowStock.textContent = String(metrics.lowStockMaterialCount || 0);
      if (el.managerOverviewCrmOpen) el.managerOverviewCrmOpen.textContent = String(crmOpenCount);

      const dueProjects = [...(summary?.projects || state.projects || [])]
        .filter((project) => project?.dueDate || project?.endDate)
        .sort((left, right) => {
          const leftDate = Date.parse(left.dueDate || left.endDate || 0) || Number.MAX_SAFE_INTEGER;
          const rightDate = Date.parse(right.dueDate || right.endDate || 0) || Number.MAX_SAFE_INTEGER;
          return leftDate - rightDate;
        })
        .slice(0, 4)
        .map((project) => ({
          title: project.title || 'Project',
          detail: `${titleCase(project.status || 'planning')} | ${titleCase(project.projectStage || 'briefing')}`,
          meta: [
            project.location || '',
            project.dueDate ? `Due ${formatDateTime(project.dueDate)}` : '',
            project.assignedManager?.email ? `Owner ${project.assignedManager.email}` : ''
          ].filter(Boolean).join(' | ')
        }));

      const priorityQuotes = [...(summary?.quotes || state.quotes || [])]
        .sort((left, right) => {
          const priorityScore = { high: 0, medium: 1, low: 2 };
          return (priorityScore[String(left.priority || '').toLowerCase()] ?? 3) - (priorityScore[String(right.priority || '').toLowerCase()] ?? 3);
        })
        .slice(0, 2)
        .map((quote) => ({
          title: `${titleCase(quote.projectType || 'quote')} quote`,
          detail: `${titleCase(quote.workflowStatus || quote.status || 'submitted')} | ${titleCase(quote.priority || 'medium')} priority`,
          meta: [
            quote.location || '',
            quote.budgetRange ? `Budget ${quote.budgetRange}` : '',
            quote.assignedManager?.email ? `Owner ${quote.assignedManager.email}` : 'Unassigned'
          ].filter(Boolean).join(' | ')
        }));

      const lowStockItems = [...(summary?.lowStockMaterials || [])]
        .slice(0, 2)
        .map((material) => ({
          title: material.name || 'Material',
          detail: `Low stock | ${material.category || 'Uncategorised'}`,
          meta: [
            material.supplier || '',
            `${material.stockQty || 0}/${material.minStockQty || 0}`
          ].filter(Boolean).join(' | ')
        }));

      const notificationItems = [...(summary?.notifications || [])]
        .slice(0, 2)
        .map((notification) => ({
          title: notification.title || 'Notification',
          detail: notification.body || notification.type || 'Unread update',
          meta: formatDateTime(notification.createdAt) || ''
        }));

      renderOverviewList(
        el.managerOverviewDueList,
        dueProjects,
        'Project deadlines and estimate response dates will appear here.'
      );
      renderOverviewList(
        el.managerOverviewPriorityList,
        [...priorityQuotes, ...lowStockItems, ...notificationItems].slice(0, 4),
        'Projects, estimates and CRM routes needing action will appear here.'
      );
    };

    const loadOverviewSummary = async () => {
      try {
        const payload = await api('/api/v2/overview');
        state.overviewSummary = payload?.overview || null;
      } catch (error) {
        state.overviewSummary = null;
      }
    };

    const renderManagerWorkflow = () => {
      const cardEntries = Object.entries(CARD_CONFIG);
      el.managerQuickAccessNav.replaceChildren();
      const fragment = document.createDocumentFragment();
      cardEntries.forEach(([cardId, config]) => {
        const link = document.createElement('a');
        link.href = buildCardHash(cardId);
        link.className = `manager-quick-access-link ${state.activeManagerCard === cardId ? 'is-active' : ''}`.trim();
        link.dataset.managerCardLink = cardId;
        const heading = document.createElement('strong');
        heading.textContent = config.label;
        const detail = document.createElement('span');
        detail.textContent = config.description;
        const meta = document.createElement('small');
        meta.textContent = getCardBadge(cardId);
        link.appendChild(heading);
        link.appendChild(detail);
        link.appendChild(meta);
        fragment.appendChild(link);
      });
      el.managerQuickAccessNav.appendChild(fragment);
      el.managerCardLinks = Array.from(document.querySelectorAll('[data-manager-card-link]'));
      activateManagerCard(state.activeManagerCard, { subcardId: state.activeManagerSubcard, updateHash: false });
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

    const focusManagerTarget = (targetId) => {
      const target = document.getElementById(String(targetId || '').trim());
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (typeof target.focus === 'function') {
        globalThis.setTimeout(() => target.focus({ preventScroll: true }), 120);
      }
    };

    const applyManagerSearchRoute = async (rawQuery) => {
      const query = String(rawQuery || '').trim();
      if (!query) {
        setSmallStatus(el.managerGlobalSearchStatus, 'Type a project, quote, client or stock query.', '');
        return;
      }

      const [prefixRaw, ...rest] = query.split(':');
      const normalizedPrefix = String(prefixRaw || '').trim().toLowerCase();
      const hasPrefix = rest.length > 0;
      const value = (hasPrefix ? rest.join(':') : query).trim();

      if (!value) {
        setSmallStatus(el.managerGlobalSearchStatus, 'Search text cannot be empty.', 'error');
        return;
      }

      const routeMap = {
        quote: async () => {
          state.quotesQuery.q = value;
          if (el.quotesFilterQ) el.quotesFilterQ.value = value;
          await dependencies.quotesController?.loadQuotes?.();
          activateManagerCard('quotes', { updateHash: true, focusId: 'manager-quotes-section' });
        },
        service: async () => {
          state.servicesQuery.q = value;
          if (el.servicesFilterQ) el.servicesFilterQ.value = value;
          if (dependencies.catalogController?.loadServices) {
            await dependencies.catalogController.loadServices();
          } else {
            await dependencies.catalogController?.loadServicesIfNeeded?.();
          }
          activateManagerCard('services', { updateHash: true, focusId: 'manager-services-section' });
        },
        stock: async () => {
          state.materialsQuery.q = value;
          if (el.materialsFilterQ) el.materialsFilterQ.value = value;
          if (dependencies.catalogController?.loadMaterials) {
            await dependencies.catalogController.loadMaterials();
          } else {
            await dependencies.catalogController?.loadMaterialsIfNeeded?.();
          }
          activateManagerCard('stock', { updateHash: true, focusId: 'manager-materials-section' });
        },
        client: async () => {
          state.clientsQuery.q = value;
          if (el.clientsFilterQ) el.clientsFilterQ.value = value;
          if (dependencies.peopleController?.loadClients) {
            await dependencies.peopleController.loadClients();
          } else {
            await dependencies.peopleController?.loadClientsIfNeeded?.();
          }
          activateManagerCard('crm', { updateHash: true, focusId: 'manager-clients-section' });
        },
        staff: async () => {
          state.staffQuery.q = value;
          if (el.staffFilterQ) el.staffFilterQ.value = value;
          if (dependencies.peopleController?.loadStaff) {
            await dependencies.peopleController.loadStaff();
          } else {
            await dependencies.peopleController?.loadStaffIfNeeded?.();
          }
          activateManagerCard('staff', { updateHash: true, focusId: 'manager-staff-section' });
        },
        default: async () => {
          state.projectsQuery.q = value;
          if (el.projectsFilterQ) el.projectsFilterQ.value = value;
          await dependencies.loadProjects?.();
          activateManagerCard('projects', { updateHash: true, focusId: 'manager-projects-section' });
        }
      };

      const handler = hasPrefix && routeMap[normalizedPrefix]
        ? routeMap[normalizedPrefix]
        : routeMap.default;

      await handler();
      setSmallStatus(el.managerGlobalSearchStatus, `Showing results for "${value}".`, 'success');
    };

    const getAvailableOptionDetail = (key) => {
      switch (key) {
        case 'createProject':
          return 'Start a new project brief with client and staff assignment.';
        case 'projectManager':
          return 'Manage status, media, gallery visibility and project documents.';
        case 'quotesReview':
          return 'Review new enquiries, priorities and acceptance routes.';
        case 'servicesManage':
          return 'Manage the website offer, ordering and visibility.';
        case 'materialsTrack':
          return 'Track storage, supplier notes and low-storage lines.';
        case 'clients':
          return 'Search client records and contact context for active jobs.';
        case 'staff':
          return 'Review staff access and create new operational users.';
        case 'estimate':
          return 'Build project pricing from service and material lines.';
        case 'privateChat':
          return 'Keep one-to-one client conversation separate from project chat.';
        case 'projectChat':
          return 'Open project-specific thread history and team conversation.';
        default:
          return 'Open this management route.';
      }
    };

    const getAvailableOptionMeta = (key) => {
      switch (key) {
        case 'createProject':
          return 'Create';
        case 'projectManager':
          return `${state.projectsPagination.total || state.projects.length || 0} loaded`;
        case 'quotesReview':
          return state.lazyLoaded.quotes || state.quotes.length
            ? `${state.quotesPagination.total || state.quotes.length || 0} loaded`
            : 'Open section';
        case 'servicesManage':
          return state.lazyLoaded.services || state.services.length
            ? `${state.servicesPagination.total || state.services.length || 0} loaded`
            : 'Open section';
        case 'materialsTrack':
          return state.lazyLoaded.materials || state.materials.length
            ? `${state.materialsPagination.total || state.materials.length || 0} loaded`
            : 'Open section';
        case 'clients':
          return state.lazyLoaded.clients || state.clients.length
            ? `${state.clients.length} loaded`
            : 'Open section';
        case 'staff':
          return state.lazyLoaded.staff || state.staff.length
            ? `${state.staff.length} loaded`
            : 'Open section';
        case 'estimate':
          return state.lazyLoaded.estimates || state.estimates.length
            ? `${state.estimates.length} loaded`
            : 'Open section';
        case 'privateChat':
          return state.overviewLoaded.directThreads
            ? `${state.directThreads.length} threads`
            : 'Loading summary';
        case 'projectChat':
          return state.overviewLoaded.groupThreads
            ? `${state.groupThreads.length} threads`
            : 'Loading summary';
        default:
          return '';
      }
    };

    const toWorkspaceQuickAccessHref = (href) => {
      const value = String(href || '').trim();
      if (value.startsWith('/manager-dashboard.html#')) {
        return value.replace('/manager-dashboard.html', '');
      }
      return value;
    };

    const buildBaseAvailableOptions = () => (
      getManagerQuickAccessOptions().map((option) => ({
        ...option,
        href: toWorkspaceQuickAccessHref(option.href),
        detail: getAvailableOptionDetail(option.key),
        meta: getAvailableOptionMeta(option.key)
      }))
    );

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
      renderOverviewMetrics();
      renderAvailableOptions();
      renderManagerWorkflow();
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

    const getManagerLoginUrl = () => {
      const managerPath = getRoleProfile('manager')?.accountPath || '/manager-dashboard.html';
      return `/auth.html?next=${encodeURIComponent(managerPath)}`;
    };

    const redirectToManagerLogin = (message, loginUrl) => {
      el.session.textContent = message;
      globalThis.setTimeout(() => {
        globalThis.location.assign(loginUrl);
      }, 700);
    };

    const isManagerDashboardRole = (role) => Boolean(getRoleProfile(role)?.managerWorkspace);

    const getManagerRole = () => String(state.user?.role || '').toLowerCase();

    const applyManagerSeedPermissions = (role) => {
      if (getRoleProfile(role)?.canRunSeed) return;
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
        applyManagerSeedPermissions(role);
        await dependencies.loadProjects?.();
        await loadOverviewSummary();
        await warmMailboxOverview();
        renderOperationsShell();
        setupLazySections(role);
        const { cardId, subcardId, focusId } = parseManagerHash();
        activateManagerCard(cardId, { subcardId, focusId, updateHash: false });
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
        button.disabled = true;
        button.hidden = true;
      });
    };

    const refreshManagerSeedData = async (stats) => {
      const refreshTasks = [];
      const projectsChanged = Number(stats.projectsCreated || 0) > 0 || Number(stats.mediaCreated || 0) > 0;

      if (projectsChanged) {
        state.projectsQuery.page = 1;
        refreshTasks.push(dependencies.loadProjects?.());
      }

      refreshTasks.push(loadOverviewSummary());
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
      el.managerGlobalSearchForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        applyManagerSearchRoute(el.managerGlobalSearch?.value || '').catch((error) => {
          setSmallStatus(el.managerGlobalSearchStatus, error.message || 'Search failed.', 'error');
        });
      });
      (el.managerCardLinks || []).forEach((link) => {
        link.addEventListener('click', (event) => {
          event.preventDefault();
          activateManagerCard(link.dataset.managerCardLink, { updateHash: true });
        });
      });
      (el.managerCardJumpButtons || []).forEach((button) => {
        button.addEventListener('click', () => {
          activateManagerCard(button.dataset.managerCardJump, {
            updateHash: true,
            focusId: button.dataset.managerCardFocus || ''
          });
        });
      });
      (el.managerCardFocusButtons || []).forEach((button) => {
        button.addEventListener('click', () => {
          const focusId = button.dataset.managerCardFocus || '';
          if (focusId) {
            focusManagerTarget(focusId);
          }
        });
      });
      (el.managerSubcardLinks || []).forEach((button) => {
        button.addEventListener('click', () => {
          activateManagerCard('inbox', {
            subcardId: button.dataset.managerSubcardLink,
            updateHash: true
          });
        });
      });
      globalThis.addEventListener('hashchange', () => {
        const { cardId, subcardId, focusId } = parseManagerHash();
        activateManagerCard(cardId, { subcardId, focusId, updateHash: false });
      });
      el.managerRailToggle?.addEventListener('click', () => {
        const isCollapsed = el.managerQuickAccessNav.classList.toggle('is-collapsed');
        el.managerAvailableOptions.classList.toggle('is-collapsed', isCollapsed);
        el.managerRailToggle.setAttribute('aria-expanded', String(!isCollapsed));
      });
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
