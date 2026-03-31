(() => {
  const TOKEN_KEY = 'll_auth_token';
  const USER_KEY = 'll_auth_user';
  const assetManifest = window.LEVEL_LINES_ASSETS || { brand: {}, gallery: {} };

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

  const titleCase = (value) =>
    String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const formatDateTime = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleString('en-GB');
  };

  const formatCurrency = (value) => `GBP ${Number(value || 0).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

  const buildSafeSlug = (value, options = {}) => {
    const source = String(value ?? '').trim().toLowerCase();
    const allowUnderscore = Boolean(options.allowUnderscore);
    const maxLength = Number.isInteger(options.maxLength) && options.maxLength > 0 ? options.maxLength : 0;
    const slugChars = [];
    let needsDash = false;

    const flushDash = () => {
      if (!needsDash || !slugChars.length || slugChars[slugChars.length - 1] === '-') return;
      slugChars.push('-');
      needsDash = false;
    };

    for (const symbol of source) {
      const isLetter = symbol >= 'a' && symbol <= 'z';
      const isDigit = symbol >= '0' && symbol <= '9';
      const isUnderscore = allowUnderscore && symbol === '_';

      if (isLetter || isDigit || isUnderscore) {
        flushDash();
        slugChars.push(symbol);
      } else if (slugChars.length) {
        needsDash = true;
      }
    }

    while (slugChars[slugChars.length - 1] === '-') slugChars.pop();

    if (!maxLength || slugChars.length <= maxLength) {
      return slugChars.join('');
    }

    const bounded = slugChars.slice(0, maxLength);
    while (bounded[bounded.length - 1] === '-') bounded.pop();
    return bounded.join('');
  };

  const escapeSelector = (value) => {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
    return String(value).replace(/["\\]/g, '\\$&');
  };

  const syncReviewFilters = (state) => {
    const url = new URL(window.location.href);
    if (state.selectedEntryId) url.searchParams.set('entry', state.selectedEntryId);
    else url.searchParams.delete('entry');
    url.searchParams.set('filterQuote', String(state.filters.quote));
    url.searchParams.set('filterEstimate', String(state.filters.estimate));
    url.searchParams.set('filterDecision', String(state.filters.decision));
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const scrollToHistoryEntry = (historyList, entryId) => {
    if (!entryId) return;
    const target = historyList.querySelector(`[data-entry-id="${escapeSelector(entryId)}"]`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const createOverviewEntry = ({ title, detail, meta }) => {
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
  };

  const renderMailboxPreviewList = (node, items, { loaded, loadingText, emptyText, mapItem }) => {
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

  const getBrandAsset = (key, fallbackPath = '', fallbackDimensions = {}) => {
    const asset = assetManifest?.brand?.[key];
    return {
      fallback: asset?.fallback || fallbackPath,
      webp: asset?.webp || '',
      avif: asset?.avif || '',
      width: Number(asset?.width) || Number(fallbackDimensions.width) || 0,
      height: Number(asset?.height) || Number(fallbackDimensions.height) || 0
    };
  };

  const getOptimizedMedia = (src, options = {}) => {
    const asset = assetManifest?.gallery?.[src];
    const sizes = options.sizes || asset?.sizes || '';
    return {
      fallback: asset?.fallback || src,
      fallbackSet: asset?.fallbackSet || '',
      webp: asset?.webp || '',
      webpSet: asset?.webpSet || '',
      avif: asset?.avif || '',
      avifSet: asset?.avifSet || '',
      width: Number(asset?.width) || Number(options.width) || 0,
      height: Number(asset?.height) || Number(options.height) || 0,
      sizes,
      thumbnailSizes: options.thumbnailSizes || asset?.thumbnailSizes || sizes
    };
  };

  const createResponsivePicture = (media, options = {}) => {
    const resolved = {
      ...(media || {}),
      fallback: media?.fallback || media?.src || options.src || '',
      sizes: options.sizes || media?.sizes || ''
    };
    const picture = document.createElement('picture');

    if (options.className) {
      picture.className = options.className;
    }

    if (resolved.avif || resolved.avifSet) {
      const avif = document.createElement('source');
      avif.type = 'image/avif';
      avif.srcset = resolved.avifSet || resolved.avif;
      if (resolved.sizes) avif.sizes = resolved.sizes;
      picture.appendChild(avif);
    }

    if (resolved.webp || resolved.webpSet) {
      const webp = document.createElement('source');
      webp.type = 'image/webp';
      webp.srcset = resolved.webpSet || resolved.webp;
      if (resolved.sizes) webp.sizes = resolved.sizes;
      picture.appendChild(webp);
    }

    const image = document.createElement('img');
    image.src = resolved.fallback;
    if (resolved.fallbackSet) image.srcset = resolved.fallbackSet;
    if (resolved.sizes) image.sizes = resolved.sizes;
    image.alt = options.alt || '';
    image.loading = options.loading || 'lazy';
    image.decoding = options.decoding || 'async';
    if (options.imgClassName) image.className = options.imgClassName;
    if (resolved.width) image.width = resolved.width;
    if (resolved.height) image.height = resolved.height;
    picture.appendChild(image);

    return picture;
  };

  window.LevelLinesRuntime = {
    TOKEN_KEY,
    USER_KEY,
    assetManifest,
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
    titleCase,
    formatDateTime,
    formatCurrency,
    buildSafeSlug,
    escapeSelector,
    syncReviewFilters,
    scrollToHistoryEntry,
    createOverviewEntry,
    renderMailboxPreviewList,
    requestAccordionRefresh,
    onceVisible,
    getBrandAsset,
    getOptimizedMedia,
    createResponsivePicture
  };
})();
