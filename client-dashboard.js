(() => {
  const runtime = window.LevelLinesRuntime || {};
  const dashboardShared = window.LevelLinesDashboardShared || {};
  const clientProjects = window.LevelLinesClientProjects || {};
  const clientOverview = window.LevelLinesClientOverview || {};
  const clientMessages = window.LevelLinesClientMessages || {};
  const clientDashboardShell = window.LevelLinesClientDashboardShell || {};
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
  const renderMailboxPreviewList = dashboardShared.renderMailboxPreviewList || runtime.renderMailboxPreviewList || ((node, items, { loaded, loadingText, emptyText, mapItem }) => {
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


  const getThreadCounterparty = (thread) => {
    if (!thread) return null;
    const participantA = thread.participantA || null;
    const participantB = thread.participantB || null;
    if (participantA?.id === state.user?.id) return participantB;
    if (participantB?.id === state.user?.id) return participantA;
    return participantB || participantA;
  };

  const projectsController = (clientProjects.createClientProjectsController || (() => null))({
    state,
    el,
    api,
    setStatus,
    createMutedNode,
    syncKeyedList,
    onRefreshOverview: async () => {
      await overviewController?.loadOverview?.();
    }
  });

  const overviewController = (clientOverview.createClientOverviewController || (() => null))({
    state,
    el,
    api,
    escapeHtml,
    titleCase,
    formatDateTime,
    createOverviewEntry,
    renderMailboxPreviewList,
    requestAccordionRefresh,
    renderProjects: () => projectsController?.renderProjects?.(),
    getThreadCounterparty
  });

  const messagesController = (clientMessages.createClientMessagesController || (() => null))({
    state,
    el,
    api,
    setStatus,
    createMutedNode,
    syncKeyedList,
    createThreadCard,
    createMessageCard,
    formatDateTime,
    requestAccordionRefresh,
    getThreadCounterparty,
    onRenderOperationsShell: () => overviewController?.renderOperationsShell?.(),
    onceVisible: runtime.onceVisible
  });

  const shellController = (clientDashboardShell.createClientDashboardShellController || (() => null))({
    runtime,
    state,
    el,
    tokenKey: TOKEN_KEY,
    userKey: USER_KEY,
    overviewController,
    messagesController,
    requestAccordionRefresh
  });

  projectsController?.bindEvents?.();
  messagesController?.bindEvents?.();
  shellController?.bindEvents?.();
  shellController?.bootstrap?.();
})();
