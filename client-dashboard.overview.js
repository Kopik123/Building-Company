(() => {
  const createClientOverviewController = ({
    state,
    el,
    api,
    escapeHtml,
    titleCase,
    formatDateTime,
    createOverviewEntry,
    renderMailboxPreviewList,
    requestAccordionRefresh,
    renderProjects,
    getThreadCounterparty
  } = {}) => {
    if (!state || !el) return null;

    const renderMetrics = (metrics) => {
      el.metrics.innerHTML = '';
      const cards = [
        { label: 'Projects', value: metrics.projectCount || 0 },
        { label: 'Active Projects', value: metrics.activeProjectCount || 0 },
        { label: 'Quotes', value: metrics.quoteCount || 0 },
        { label: 'Unread Alerts', value: metrics.unreadNotifications || 0 }
      ];

      cards.forEach((card) => {
        const node = document.createElement('article');
        node.className = 'card dashboard-item dashboard-metric-card';
        node.innerHTML = `<p class="muted">${escapeHtml(card.label)}</p><h2>${escapeHtml(card.value)}</h2>`;
        el.metrics.appendChild(node);
      });
    };

    const renderQuotes = () => {
      el.quotesList.innerHTML = '';
      if (!state.quotes.length) {
        el.quotesList.innerHTML = '<p class="muted">No quotes available.</p>';
        return;
      }

      const frag = document.createDocumentFragment();
      state.quotes.forEach((quote) => {
        const card = document.createElement('article');
        card.className = 'dashboard-item';
        card.innerHTML = `<h3>${escapeHtml(quote.projectType)}</h3><p class="muted">${escapeHtml(quote.status)} | Priority ${escapeHtml(quote.priority)} | ${escapeHtml(quote.location || '-')}</p><p>${escapeHtml(quote.description || '')}</p>`;
        frag.appendChild(card);
      });
      el.quotesList.appendChild(frag);
    };

    const renderServices = () => {
      el.servicesList.innerHTML = '';
      if (!state.services.length) {
        el.servicesList.innerHTML = '<p class="muted">No recommended services.</p>';
        return;
      }

      const frag = document.createDocumentFragment();
      state.services.forEach((service) => {
        const card = document.createElement('article');
        card.className = 'dashboard-item';
        const price = service.basePriceFrom ? `from GBP ${Number(service.basePriceFrom).toLocaleString('en-GB')}` : 'custom quote';
        card.innerHTML = `<h3>${escapeHtml(service.title)}</h3><p class="muted">${escapeHtml(service.category)} | ${escapeHtml(price)}</p><p>${escapeHtml(service.shortDescription || '')}</p>`;
        frag.appendChild(card);
      });
      el.servicesList.appendChild(frag);
    };

    const renderProjectStatusOverview = () => {
      el.projectStatusList.innerHTML = '';

      const items = [];
      const sortedProjects = [...state.projects].sort((left, right) => {
        const leftDate = Date.parse(left.updatedAt || left.endDate || left.startDate || 0) || 0;
        const rightDate = Date.parse(right.updatedAt || right.endDate || right.startDate || 0) || 0;
        return rightDate - leftDate;
      });

      sortedProjects.slice(0, 2).forEach((project) => {
        const docsCount = Array.isArray(project.documents) ? project.documents.length : 0;
        const manager = project.assignedManager?.name || project.assignedManager?.email || 'Manager pending';
        items.push({
          title: project.title || 'Project',
          detail: `${titleCase(project.status || 'planning')} | ${project.location || 'Location pending'}`,
          meta: `Docs ${docsCount} | ${manager}`
        });
      });

      const activeQuote = state.quotes.find((quote) => String(quote.status || '').toLowerCase() !== 'accepted') || state.quotes[0];
      if (activeQuote) {
        items.push({
          title: activeQuote.projectType || 'Quote',
          detail: `${titleCase(activeQuote.status || 'pending')} | Priority ${titleCase(activeQuote.priority || 'normal')}`,
          meta: activeQuote.location || 'Quote route'
        });
      }

      if (!items.length) {
        el.projectStatusList.innerHTML = '<p class="muted">Projects, quotes and document routes will appear here once your workspace is linked.</p>';
        return;
      }

      const frag = document.createDocumentFragment();
      items.slice(0, 3).forEach((item) => frag.appendChild(createOverviewEntry(item)));
      el.projectStatusList.appendChild(frag);
    };

    const renderMailboxOverview = () => {
      el.mailboxDirectCount.textContent = String(state.directThreads.length);
      el.mailboxProjectCount.textContent = String(state.threads.length);

      renderMailboxPreviewList(el.mailboxDirectPreview, state.directThreads, {
        loaded: state.overviewLoaded.directThreads,
        loadingText: 'Loading direct threads...',
        emptyText: 'No direct manager thread yet.',
        mapItem: (thread) => {
          const counterparty = getThreadCounterparty(thread);
          return {
            title: counterparty?.name || counterparty?.email || 'Direct manager',
            detail: thread.subject || 'Private conversation route',
            meta: formatDateTime(thread.updatedAt) ? `Updated ${formatDateTime(thread.updatedAt)}` : ''
          };
        }
      });

      renderMailboxPreviewList(el.mailboxProjectPreview, state.threads, {
        loaded: state.overviewLoaded.groupThreads,
        loadingText: 'Loading project threads...',
        emptyText: 'No project thread yet.',
        mapItem: (thread) => ({
          title: thread.name || thread.subject || 'Project chat',
          detail: 'Project communication route',
          meta: formatDateTime(thread.updatedAt) ? `Updated ${formatDateTime(thread.updatedAt)}` : ''
        })
      });
    };

    const renderAvailableOptions = () => {
      el.availableOptions.innerHTML = '';

      if (!state.user) {
        el.availableOptions.innerHTML = '<p class="muted">Workspace routes will appear after the session is confirmed.</p>';
        return;
      }

      const options = [
        {
          label: 'Projects',
          detail: 'Review active jobs, locations and assigned manager context.',
          href: '#client-projects-section',
          meta: `${state.projects.length} loaded`
        },
        {
          label: 'Documents Upload',
          detail: 'Upload room documents, notes and reference files against a project.',
          href: '#client-documents-section',
          meta: state.projects.length ? 'Upload ready' : 'Needs project'
        },
        {
          label: 'Direct Manager',
          detail: 'Use the private route for one-to-one communication with your manager.',
          href: '#client-direct-manager',
          meta: state.overviewLoaded.directThreads ? `${state.directThreads.length} threads` : 'Loading summary'
        },
        {
          label: 'Project Chat',
          detail: 'Keep project-specific messages separate from private manager contact.',
          href: '#client-project-chat',
          meta: state.overviewLoaded.groupThreads ? `${state.threads.length} threads` : 'Loading summary'
        },
        {
          label: 'Quotes',
          detail: 'Track the current quote route, status and response timing.',
          href: '#client-quotes-section',
          meta: `${state.quotes.length} loaded`
        },
        {
          label: 'Services',
          detail: 'Review recommended services and the current fit for your brief.',
          href: '#client-services-section',
          meta: `${state.services.length} loaded`
        }
      ];

      const frag = document.createDocumentFragment();
      options.forEach((option) => {
        const link = document.createElement('a');
        link.className = 'workspace-option-link';
        link.href = option.href;
        link.innerHTML = `
          <strong>${escapeHtml(option.label)}</strong>
          <span>${escapeHtml(option.detail)}</span>
          <small class="workspace-option-meta">${escapeHtml(option.meta)}</small>
        `;
        frag.appendChild(link);
      });
      el.availableOptions.appendChild(frag);
    };

    const renderOperationsShell = () => {
      renderProjectStatusOverview();
      renderMailboxOverview();
      renderAvailableOptions();
    };

    const loadOverview = async () => {
      const payload = await api('/api/client/overview?includeThreads=false');
      state.user = payload.user || null;
      state.projects = Array.isArray(payload.projects) ? payload.projects : [];
      state.quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
      state.services = Array.isArray(payload.services) ? payload.services : [];
      renderMetrics(payload.metrics || {});
      renderProjects?.();
      renderQuotes();
      renderServices();
      renderOperationsShell();
      requestAccordionRefresh?.();
    };

    return {
      renderOperationsShell,
      loadOverview
    };
  };

  window.LevelLinesClientOverview = {
    createClientOverviewController
  };
})();
