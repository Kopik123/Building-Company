(() => {
  const TOKEN_KEY = 'll_auth_token';
  const USER_KEY = 'll_auth_user';

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

  const setStatus = (node, message = '', type = '') => {
    if (!node) return;
    node.className = 'form-status';
    if (type === 'success') node.classList.add('is-success');
    if (type === 'error') node.classList.add('is-error');
    if (type === 'loading') node.classList.add('is-loading');
    node.textContent = message;
  };

  const setSmallStatus = (node, message = '', type = '') => {
    if (!node) return;
    node.textContent = message;
    node.className = type === 'error' ? 'muted form-status is-error' : 'muted';
  };

  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  };

  const saveSession = (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
    window.dispatchEvent(new Event('ll:session-changed'));
  };

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event('ll:session-changed'));
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

  const buildQuery = (params) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (typeof value === 'undefined' || value === null || value === '') return;
      q.set(key, String(value));
    });
    return q.toString();
  };

  const debounce = (fn, wait = 200) => {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), wait);
    };
  };

  const createApiClient = (getToken) => async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    const token = typeof getToken === 'function' ? getToken() : '';
    if (!headers.has('Authorization') && token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetch(url, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(parseError(payload));
    return payload;
  };

  const requestAccordionRefresh = () => {
    window.dispatchEvent(new CustomEvent('ll:dashboard-accordions-refresh'));
  };

  const onceVisible = (items, options = {}) => {
    if (!('IntersectionObserver' in window)) {
      items.forEach((item) => item?.load?.());
      return () => {};
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const item = items.find((candidate) => candidate?.target === entry.target);
        if (!item || item.loaded) return;
        item.loaded = true;
        item.load();
        observer.unobserve(entry.target);
      });
    }, {
      rootMargin: '140px 0px',
      threshold: 0.18,
      ...options
    });

    items.forEach((item) => {
      if (item?.target) observer.observe(item.target);
    });

    return () => observer.disconnect();
  };

  window.LevelLinesRuntime = {
    TOKEN_KEY,
    USER_KEY,
    parseError,
    escapeHtml,
    setStatus,
    setSmallStatus,
    getStoredUser,
    saveSession,
    clearSession,
    waitForStoredUser,
    buildQuery,
    debounce,
    createApiClient,
    requestAccordionRefresh,
    onceVisible
  };
})();
