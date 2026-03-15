(() => {
  const runtime = window.LevelLinesRuntime || {};
  const TOKEN_KEY = runtime.TOKEN_KEY || 'll_auth_token';
  const USER_KEY = runtime.USER_KEY || 'll_auth_user';

  const el = {
    session: document.getElementById('client-session'),
    logout: document.getElementById('client-logout'),
    projectStatusList: document.getElementById('client-project-status-list'),
    mailboxDirectCount: document.getElementById('client-mailbox-direct-count'),
    mailboxProjectCount: document.getElementById('client-mailbox-project-count'),
    mailboxDirectPreview: document.getElementById('client-mailbox-direct-preview'),
    mailboxProjectPreview: document.getElementById('client-mailbox-project-preview'),
    availableOptions: document.getElementById('client-available-options'),
    metrics: document.getElementById('client-metrics'),
    projectsList: document.getElementById('client-projects-list'),
    uploadForm: document.getElementById('client-upload-form'),
    uploadStatus: document.getElementById('client-upload-status'),
    directThreadsList: document.getElementById('client-direct-threads-list'),
    directMessagesList: document.getElementById('client-direct-messages-list'),
    directMessageForm: document.getElementById('client-direct-message-form'),
    directMessageStatus: document.getElementById('client-direct-message-status'),
    threadsList: document.getElementById('client-threads-list'),
    messagesList: document.getElementById('client-messages-list'),
    messageForm: document.getElementById('client-message-form'),
    messageStatus: document.getElementById('client-message-status'),
    quotesList: document.getElementById('client-quotes-list'),
    servicesList: document.getElementById('client-services-list')
  };

  if (Object.values(el).some((node) => !node)) return;

  const state = {
    token: '',
    user: null,
    projects: [],
    quotes: [],
    services: [],
    directThreads: [],
    selectedDirectThreadId: '',
    directMessages: [],
    threads: [],
    selectedThreadId: '',
    messages: [],
    overviewLoaded: {
      directThreads: false,
      groupThreads: false
    },
    lazyLoaded: {
      directThreads: false,
      groupThreads: false
    }
  };

  const escapeHtml = runtime.escapeHtml || ((value) => String(value ?? ''));
  const setStatus = runtime.setStatus || ((node, message, type) => {
    node.className = 'form-status';
    if (type === 'success') node.classList.add('is-success');
    if (type === 'error') node.classList.add('is-error');
    node.textContent = message || '';
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
      node.innerHTML = `<p class="muted">${escapeHtml(loadingText)}</p>`;
      return;
    }

    if (!items.length) {
      node.innerHTML = `<p class="muted">${escapeHtml(emptyText)}</p>`;
      return;
    }

    const frag = document.createDocumentFragment();
    items.slice(0, 2).forEach((item) => frag.appendChild(createOverviewEntry(mapItem(item))));
    node.appendChild(frag);
  });
  const syncKeyedList = runtime.syncKeyedList || ((container, items, { getKey, createNode, updateNode, createEmptyNode } = {}) => {
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

  const createMutedNode = (message) => {
    const node = document.createElement('p');
    node.className = 'muted';
    node.textContent = message;
    return node;
  };

  const syncProjectSelectOptions = () => {
    const select = el.uploadForm.elements.projectId;
    const existingByValue = new Map(Array.from(select.options).map((option) => [String(option.value || ''), option]));
    const entries = state.projects.length
      ? state.projects.map((project) => ({ value: project.id, label: project.title }))
      : [{ value: '', label: 'No projects' }];

    entries.forEach((entry, index) => {
      const key = String(entry.value || '');
      let option = existingByValue.get(key);
      if (!option) {
        option = document.createElement('option');
        option.value = entry.value;
      }
      option.textContent = entry.label;
      if (select.options[index] !== option) {
        select.insertBefore(option, select.options[index] || null);
      }
      existingByValue.delete(key);
    });

    existingByValue.forEach((option) => option.remove());
  };

  const createProjectCard = () => {
    const card = document.createElement('article');
    card.className = 'dashboard-item';
    const heading = document.createElement('h3');
    heading.className = 'dashboard-item-title';
    const meta = document.createElement('p');
    meta.className = 'muted';
    const description = document.createElement('p');
    const docsWrap = document.createElement('div');
    docsWrap.className = 'dashboard-pill-list';
    card.appendChild(heading);
    card.appendChild(meta);
    card.appendChild(description);
    card.appendChild(docsWrap);
    return card;
  };

  const updateProjectCard = (card, project) => {
    const manager = project.assignedManager?.name || project.assignedManager?.email || 'Not assigned';
    const docsCount = Array.isArray(project.documents) ? project.documents.length : 0;
    const [heading, meta, description, docsWrap] = card.children;
    heading.textContent = project.title || 'Project';
    meta.textContent = `${project.status || '-'} | ${project.location || '-'} | Manager: ${manager} | Docs: ${docsCount}`;
    description.textContent = project.description || '';
    docsWrap.replaceChildren();
    (project.documents || []).slice(0, 5).forEach((doc) => {
      const link = document.createElement('a');
      link.className = 'btn btn-outline';
      link.href = doc.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = doc.filename;
      docsWrap.appendChild(link);
    });
  };

  const createThreadCard = ({ onOpen }) => {
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
  };

  const createMessageCard = () => {
    const card = document.createElement('article');
    card.className = 'dashboard-item';
    const meta = document.createElement('p');
    meta.className = 'muted';
    const body = document.createElement('p');
    card.appendChild(meta);
    card.appendChild(body);
    return card;
  };

  const clearSession = () => {
    (runtime.clearSession || (() => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }))();
    state.token = '';
    state.user = null;
  };
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

  const api = (runtime.createApiClient ? runtime.createApiClient(() => state.token) : async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Authorization') && state.token) {
      headers.set('Authorization', `Bearer ${state.token}`);
    }
    const response = await fetch(url, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((runtime.parseError || ((data) => data?.error || 'Request failed.'))(payload));
    return payload;
  });

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

  const renderProjects = () => {
    syncProjectSelectOptions();

    if (!state.projects.length) {
      syncKeyedList(el.projectsList, [], {
        getKey: () => '',
        createNode: createProjectCard,
        updateNode: updateProjectCard,
        createEmptyNode: () => createMutedNode('No projects linked yet. Contact your manager.')
      });
      return;
    }

    syncKeyedList(el.projectsList, state.projects, {
      getKey: (project) => project.id,
      createNode: createProjectCard,
      updateNode: updateProjectCard,
      createEmptyNode: () => createMutedNode('No projects linked yet. Contact your manager.')
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

  const getThreadCounterparty = (thread) => {
    if (!thread) return null;
    const participantA = thread.participantA || null;
    const participantB = thread.participantB || null;
    if (participantA?.id === state.user?.id) return participantB;
    if (participantB?.id === state.user?.id) return participantA;
    return participantB || participantA;
  };

  const getPreferredManager = () => {
    const projectManager = state.projects.find((project) => project.assignedManager?.id)?.assignedManager;
    if (projectManager?.id) return projectManager;
    const quoteManager = state.quotes.find((quote) => quote.assignedManager?.id)?.assignedManager;
    if (quoteManager?.id) return quoteManager;
    const threadManager = state.directThreads.map(getThreadCounterparty).find((user) => user?.id);
    return threadManager || null;
  };

  const renderThreads = () => {
    syncKeyedList(el.threadsList, state.threads, {
      getKey: (thread) => thread.id,
      createNode: () => createThreadCard({
        onOpen: async (threadId) => {
          state.selectedThreadId = threadId;
          renderThreads();
          await loadMessages();
        }
      }),
      updateNode: (card, thread) => {
        card.dataset.threadId = thread.id;
        card.className = `dashboard-item ${thread.id === state.selectedThreadId ? 'is-active' : ''}`;
        card.children[0].textContent = thread.name || thread.subject || 'Thread';
        card.children[1].textContent = `Updated: ${formatDateTime(thread.updatedAt) || '-'}`;
      },
      createEmptyNode: () => createMutedNode('No communication threads yet.')
    });
  };

  const renderDirectThreads = () => {
    const fallbackManager = getPreferredManager();
    syncKeyedList(el.directThreadsList, state.directThreads, {
      getKey: (thread) => thread.id,
      createNode: () => createThreadCard({
        onOpen: async (threadId) => {
          state.selectedDirectThreadId = threadId;
          renderDirectThreads();
          await loadDirectMessages();
        }
      }),
      updateNode: (card, thread) => {
        const counterparty = getThreadCounterparty(thread);
        card.dataset.threadId = thread.id;
        card.className = `dashboard-item ${thread.id === state.selectedDirectThreadId ? 'is-active' : ''}`;
        card.children[0].textContent = counterparty?.name || counterparty?.email || thread.subject || 'Direct thread';
        card.children[1].textContent = `${thread.subject || 'Direct manager conversation'} | Updated: ${formatDateTime(thread.updatedAt) || '-'}`;
      },
      createEmptyNode: () => createMutedNode(
        fallbackManager
          ? `No private thread yet. Use the message box to start a direct conversation with ${fallbackManager.name || fallbackManager.email}.`
          : 'No manager thread yet. A direct conversation becomes available once a manager is assigned.'
      )
    });
  };

  const renderMessages = () => {
    syncKeyedList(el.messagesList, state.selectedThreadId ? state.messages : [], {
      getKey: (message, index) => message.id || `${message.createdAt || 'message'}-${index}`,
      createNode: createMessageCard,
      updateNode: (card, message) => {
        const sender = message.sender?.name || message.sender?.email || 'Unknown';
        card.children[0].textContent = `${sender} | ${formatDateTime(message.createdAt) || '-'}`;
        card.children[1].textContent = message.body || '';
      },
      createEmptyNode: () => createMutedNode(state.selectedThreadId ? 'No messages in this thread.' : 'Select a thread to view messages.')
    });
  };

  const renderDirectMessages = () => {
    const fallbackManager = getPreferredManager();
    syncKeyedList(el.directMessagesList, state.selectedDirectThreadId ? state.directMessages : [], {
      getKey: (message, index) => message.id || `${message.createdAt || 'direct-message'}-${index}`,
      createNode: createMessageCard,
      updateNode: (card, message) => {
        const sender = message.sender?.name || message.sender?.email || 'Unknown';
        card.children[0].textContent = `${sender} | ${formatDateTime(message.createdAt) || '-'}`;
        card.children[1].textContent = message.body || '';
      },
      createEmptyNode: () => createMutedNode(
        state.selectedDirectThreadId
          ? 'No private messages in this thread.'
          : (fallbackManager
            ? `Start a direct thread with ${fallbackManager.name || fallbackManager.email}.`
            : 'A direct manager conversation will appear here once a manager is assigned.')
      )
    });
  };

  const loadMessages = async () => {
    if (!state.selectedThreadId) {
      state.messages = [];
      renderMessages();
      return;
    }

    const payload = await api(`/api/group/threads/${state.selectedThreadId}/messages?pageSize=100`);
    state.messages = Array.isArray(payload.messages) ? payload.messages : [];
    renderMessages();
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

  const ensureThreadSummaries = async () => {
    if (state.overviewLoaded.groupThreads) return;
    const payload = await api('/api/group/threads?pageSize=100');
    state.threads = Array.isArray(payload.threads) ? payload.threads : [];
    if (!state.threads.some((thread) => thread.id === state.selectedThreadId)) {
      state.selectedThreadId = state.threads[0]?.id || '';
    }
    state.overviewLoaded.groupThreads = true;
    renderOperationsShell();
  };

  const ensureDirectThreadSummaries = async (preferredThreadId = '') => {
    const shouldKeepSelection = preferredThreadId || state.selectedDirectThreadId;
    if (!state.overviewLoaded.directThreads) {
      const payload = await api('/api/inbox/threads?pageSize=100');
      state.directThreads = Array.isArray(payload.threads) ? payload.threads : [];
      state.overviewLoaded.directThreads = true;
    }

    if (!state.directThreads.some((thread) => thread.id === shouldKeepSelection)) {
      state.selectedDirectThreadId = state.directThreads[0]?.id || '';
    } else {
      state.selectedDirectThreadId = shouldKeepSelection;
    }

    renderOperationsShell();
  };

  const loadOverview = async () => {
    const payload = await api('/api/client/overview?includeThreads=false');
    state.user = payload.user || null;
    state.projects = Array.isArray(payload.projects) ? payload.projects : [];
    state.quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
    state.services = Array.isArray(payload.services) ? payload.services : [];
    renderMetrics(payload.metrics || {});
    renderProjects();
    renderQuotes();
    renderServices();
    renderOperationsShell();
    requestAccordionRefresh();
  };

  const loadThreads = async () => {
    await ensureThreadSummaries();
    state.lazyLoaded.groupThreads = true;
    renderThreads();
    await loadMessages();
    requestAccordionRefresh();
  };

  const loadDirectThreads = async (preferredThreadId = '') => {
    await ensureDirectThreadSummaries(preferredThreadId);
    state.lazyLoaded.directThreads = true;
    renderDirectThreads();
    await loadDirectMessages();
    requestAccordionRefresh();
  };

  const setupLazySections = () => {
    const directSection = el.directThreadsList.closest('section');
    const groupSection = el.threadsList.closest('section');
    const tasks = [];

    if (directSection) {
      tasks.push({
        target: directSection,
        loaded: false,
        load: async () => {
          if (state.lazyLoaded.directThreads) return;
          state.lazyLoaded.directThreads = true;
          await loadDirectThreads();
        }
      });
    }

    if (groupSection) {
      tasks.push({
        target: groupSection,
        loaded: false,
        load: async () => {
          if (state.lazyLoaded.groupThreads) return;
          state.lazyLoaded.groupThreads = true;
          await loadThreads();
        }
      });
    }

    (runtime.onceVisible || ((items) => {
      items.forEach((item) => item.load());
      return () => {};
    }))(tasks);
  };

  const bootstrap = async () => {
    const loginUrl = `/auth.html?next=${encodeURIComponent('/client-dashboard.html')}`;
    renderOperationsShell();
    state.token = localStorage.getItem(TOKEN_KEY) || '';
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
      if (role !== 'client') {
        clearSession();
        el.session.textContent = 'Session expired. Redirecting to login...';
        window.setTimeout(() => {
          window.location.assign(loginUrl);
        }, 700);
        return;
      }

      el.session.textContent = `Logged as ${state.user.name || state.user.email} (${state.user.role})`;
      await loadOverview();
      setupLazySections();
      requestAccordionRefresh();
    } catch (error) {
      clearSession();
      el.session.textContent = error.message || 'Session expired. Redirecting to login...';
      window.setTimeout(() => {
        window.location.assign(loginUrl);
      }, 700);
    }
  };

  el.uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const projectId = String(el.uploadForm.elements.projectId.value || '').trim();
    const files = el.uploadForm.elements.files.files;
    if (!projectId) return setStatus(el.uploadStatus, 'Select project.', 'error');
    if (!files || !files.length) return setStatus(el.uploadStatus, 'Select files.', 'error');

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('files', file));
    formData.append('caption', String(el.uploadForm.elements.caption.value || '').trim());

    setStatus(el.uploadStatus, 'Uploading...');
    try {
      await api(`/api/client/projects/${projectId}/documents/upload`, { method: 'POST', body: formData });
      setStatus(el.uploadStatus, 'Documents uploaded.', 'success');
      el.uploadForm.reset();
      await loadOverview();
    } catch (error) {
      setStatus(el.uploadStatus, error.message || 'Upload failed.', 'error');
    }
  });

  el.messageForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.selectedThreadId) return setStatus(el.messageStatus, 'Select a thread first.', 'error');
    const body = String(el.messageForm.elements.body.value || '').trim();
    if (!body) return setStatus(el.messageStatus, 'Message is required.', 'error');

    setStatus(el.messageStatus, 'Sending...');
    try {
      await api(`/api/group/threads/${state.selectedThreadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body })
      });
      setStatus(el.messageStatus, 'Message sent.', 'success');
      el.messageForm.reset();
      await loadMessages();
    } catch (error) {
      setStatus(el.messageStatus, error.message || 'Send failed.', 'error');
    }
  });

  el.directMessageForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = String(el.directMessageForm.elements.body.value || '').trim();
    if (!body) return setStatus(el.directMessageStatus, 'Message is required.', 'error');

    setStatus(el.directMessageStatus, state.selectedDirectThreadId ? 'Sending...' : 'Opening thread...');
    try {
      let threadId = state.selectedDirectThreadId;
      if (!threadId) {
        const manager = getPreferredManager();
        if (!manager?.id) {
          return setStatus(el.directMessageStatus, 'No assigned manager is available for a private thread yet.', 'error');
        }

        const payload = await api('/api/inbox/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientUserId: manager.id,
            subject: `Direct manager conversation - ${state.user?.name || state.user?.email || 'Client'}`,
            body
          })
        });
        threadId = payload.thread?.id || '';
      } else {
        await api(`/api/inbox/threads/${threadId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body })
        });
      }

      setStatus(el.directMessageStatus, 'Private message sent.', 'success');
      el.directMessageForm.reset();
      await loadDirectThreads(threadId);
    } catch (error) {
      setStatus(el.directMessageStatus, error.message || 'Private message failed.', 'error');
    }
  });

  el.logout.addEventListener('click', () => {
    clearSession();
    window.location.href = '/auth.html';
  });

  bootstrap();
})();
