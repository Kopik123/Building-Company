(() => {
  const TOKEN_KEY = 'll_auth_token';
  const USER_KEY = 'll_auth_user';

  const el = {
    session: document.getElementById('client-session'),
    logout: document.getElementById('client-logout'),
    metrics: document.getElementById('client-metrics'),
    projectsList: document.getElementById('client-projects-list'),
    uploadForm: document.getElementById('client-upload-form'),
    uploadStatus: document.getElementById('client-upload-status'),
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
    threads: [],
    selectedThreadId: '',
    messages: []
  };

  const parseError = (payload) => {
    if (payload?.error) return payload.error;
    if (Array.isArray(payload?.errors) && payload.errors.length) {
      return payload.errors.map((item) => item?.msg).filter(Boolean).join(', ');
    }
    return 'Request failed.';
  };
  const escapeHtml = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

  const setStatus = (node, message, type) => {
    node.className = 'form-status';
    if (type === 'success') node.classList.add('is-success');
    if (type === 'error') node.classList.add('is-error');
    node.textContent = message || '';
  };
  const requestAccordionRefresh = () => {
    window.dispatchEvent(new CustomEvent('ll:dashboard-accordions-refresh'));
  };

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    state.token = '';
    state.user = null;
  };
  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  };
  const waitForStoredUser = (timeoutMs = 900) =>
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
    });

  const api = async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Authorization') && state.token) {
      headers.set('Authorization', `Bearer ${state.token}`);
    }
    const response = await fetch(url, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(parseError(payload));
    return payload;
  };

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
    el.projectsList.innerHTML = '';
    const select = el.uploadForm.elements.projectId;
    select.innerHTML = '';

    if (!state.projects.length) {
      el.projectsList.innerHTML = '<p class="muted">No projects linked yet. Contact your manager.</p>';
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No projects';
      select.appendChild(option);
      return;
    }

    const frag = document.createDocumentFragment();
    state.projects.forEach((project) => {
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      const manager = project.assignedManager?.name || project.assignedManager?.email || 'Not assigned';
      const docsCount = Array.isArray(project.documents) ? project.documents.length : 0;
      card.innerHTML = `<h3>${escapeHtml(project.title)}</h3><p class="muted">${escapeHtml(project.status)} | ${escapeHtml(project.location || '-')} | Manager: ${escapeHtml(manager)} | Docs: ${escapeHtml(docsCount)}</p><p>${escapeHtml(project.description || '')}</p>`;

      const docsWrap = document.createElement('div');
      docsWrap.className = 'dashboard-pill-list';
      (project.documents || []).slice(0, 5).forEach((doc) => {
        const link = document.createElement('a');
        link.className = 'btn btn-outline';
        link.href = doc.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = doc.filename;
        docsWrap.appendChild(link);
      });

      card.appendChild(docsWrap);
      frag.appendChild(card);

      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.title;
      select.appendChild(option);
    });
    el.projectsList.appendChild(frag);
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

  const renderThreads = () => {
    el.threadsList.innerHTML = '';
    if (!state.threads.length) {
      el.threadsList.innerHTML = '<p class="muted">No communication threads yet.</p>';
      return;
    }

    const frag = document.createDocumentFragment();
    state.threads.forEach((thread) => {
      const card = document.createElement('article');
      card.className = `dashboard-item ${thread.id === state.selectedThreadId ? 'is-active' : ''}`;
      card.innerHTML = `<h3>${escapeHtml(thread.name || thread.subject || 'Thread')}</h3><p class="muted">Updated: ${escapeHtml(new Date(thread.updatedAt).toLocaleString('en-GB'))}</p>`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline';
      btn.textContent = 'Open';
      btn.addEventListener('click', async () => {
        state.selectedThreadId = thread.id;
        renderThreads();
        await loadMessages();
      });
      card.appendChild(btn);
      frag.appendChild(card);
    });
    el.threadsList.appendChild(frag);
  };

  const renderMessages = () => {
    el.messagesList.innerHTML = '';
    if (!state.selectedThreadId) {
      el.messagesList.innerHTML = '<p class="muted">Select a thread to view messages.</p>';
      return;
    }
    if (!state.messages.length) {
      el.messagesList.innerHTML = '<p class="muted">No messages in this thread.</p>';
      return;
    }

    const frag = document.createDocumentFragment();
    state.messages.forEach((message) => {
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      const sender = message.sender?.name || message.sender?.email || 'Unknown';
      card.innerHTML = `<p class="muted">${escapeHtml(sender)} | ${escapeHtml(new Date(message.createdAt).toLocaleString('en-GB'))}</p><p>${escapeHtml(message.body || '')}</p>`;
      frag.appendChild(card);
    });
    el.messagesList.appendChild(frag);
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
    requestAccordionRefresh();
  };

  const loadThreads = async () => {
    const payload = await api('/api/group/threads?pageSize=100');
    state.threads = Array.isArray(payload.threads) ? payload.threads : [];
    if (!state.threads.some((thread) => thread.id === state.selectedThreadId)) {
      state.selectedThreadId = state.threads[0]?.id || '';
    }
    renderThreads();
    await loadMessages();
    requestAccordionRefresh();
  };

  const bootstrap = async () => {
    const loginUrl = `/auth.html?next=${encodeURIComponent('/client-dashboard.html')}`;
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
      await Promise.all([loadOverview(), loadThreads()]);
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

  el.logout.addEventListener('click', () => {
    clearSession();
    window.location.href = '/auth.html';
  });

  bootstrap();
})();
