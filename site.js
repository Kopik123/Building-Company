(() => {
  const runtime = window.LevelLinesRuntime || {};
  const TOKEN_KEY = runtime.TOKEN_KEY || 'll_auth_token';
  const USER_KEY = runtime.USER_KEY || 'll_auth_user';
  const AUTH_ME_CACHE_KEY = 'll_auth_me_cache';
  const AUTH_ME_TTL_MS = 60 * 1000;
  const brand = window.LEVEL_LINES_BRAND || null;

  const body = document.body;
  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navMenu = document.querySelector('[data-nav-menu]');
  const authToggle = document.querySelector('[data-auth-toggle]');
  const authLinks = Array.from(document.querySelectorAll('[data-auth-link]'));
  const guestOnlyNodes = Array.from(document.querySelectorAll('[data-auth-guest-only]'));
  const userOnlyNodes = Array.from(document.querySelectorAll('[data-auth-user-only]'));
  const accountSettingsLinks = Array.from(document.querySelectorAll('[data-account-settings-link]'));
  const inlineLoginForm = document.querySelector('[data-inline-login-form]');
  const inlineLoginRow = inlineLoginForm?.querySelector('.public-inline-login-row') || null;
  const inlineLoginEmailInput = inlineLoginForm?.querySelector('input[name="email"]') || null;
  const inlineLoginPasswordInput = inlineLoginForm?.querySelector('input[name="password"]') || null;
  const inlineLoginSubmitButton = inlineLoginForm?.querySelector('button[type="submit"]') || null;
  const inlineLoginStatus = document.querySelector('[data-inline-login-status]');
  const inlineAuthPanel = document.querySelector('[data-auth-panel]');
  const inlineSession = document.querySelector('[data-inline-session]');
  const inlineSessionCopy = document.querySelector('[data-inline-session-copy]');
  const inlineLogoutButton = document.querySelector('[data-inline-logout]');
  const menuWrap =
    document.querySelector('[data-menu-wrap]') ||
    (navMenu ? navMenu.closest('.menu-wrap') : null) ||
    (navMenu ? navMenu.closest('.main-nav') : null);

  let menuPreviouslyFocused = null;
  let authPreviouslyFocused = null;

  const isAuthPage = body.classList.contains('page-auth');
  const isClientWorkspace = body.classList.contains('page-client-dashboard');
  const isManagerWorkspace = body.classList.contains('page-manager-dashboard');
  const isWorkspacePage = isClientWorkspace || isManagerWorkspace;
  const isPublicPage = !isAuthPage && !isWorkspacePage;

  const readAuthMeCache = (token) => {
    if (!token || !window.sessionStorage) return null;

    try {
      const payload = JSON.parse(sessionStorage.getItem(AUTH_ME_CACHE_KEY) || 'null');
      if (!payload || payload.token !== token) return null;
      if (Number(payload.expiresAt || 0) <= Date.now()) return null;
      return payload.user || null;
    } catch {
      return null;
    }
  };

  const writeAuthMeCache = (token, user) => {
    if (!token || !window.sessionStorage) return;

    try {
      sessionStorage.setItem(
        AUTH_ME_CACHE_KEY,
        JSON.stringify({
          token,
          user: user || null,
          expiresAt: Date.now() + AUTH_ME_TTL_MS
        })
      );
    } catch {
      // Ignore cache write failures and keep auth flow functional.
    }
  };

  const clearAuthMeCache = () => {
    if (!window.sessionStorage) return;
    try {
      sessionStorage.removeItem(AUTH_ME_CACHE_KEY);
    } catch {
      // Ignore cache clear failures and keep auth flow functional.
    }
  };

  const baseClearSession = runtime.clearSession || (() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  });

  const clearSession = () => {
    clearAuthMeCache();
    baseClearSession();
  };

  const baseSaveSession = runtime.saveSession || ((token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
  });

  const saveSession = (token, user) => {
    baseSaveSession(token, user);
    writeAuthMeCache(token, user);
  };

  const parseError = runtime.parseError || ((payload) => payload?.error || 'Request failed.');
  const setStatus = runtime.setStatus || ((node, message = '', type = '') => {
    if (!node) return;
    node.className = 'form-status';
    if (type === 'success') node.classList.add('is-success');
    if (type === 'error') node.classList.add('is-error');
    if (type === 'loading') node.classList.add('is-loading');
    node.textContent = message;
  });

  const getSavedUser = runtime.getStoredUser || (() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  });

  const setBrandNodeValue = (node, value, href) => {
    if (!node || value == null) return;

    const tagName = node.tagName ? node.tagName.toLowerCase() : '';
    if (tagName === 'a' && href) {
      node.setAttribute('href', href);
    }

    if (tagName === 'input' || tagName === 'textarea') {
      node.value = value;
      return;
    }

    node.textContent = value;
  };

  const getBrandValueByPath = (path) => {
    return String(path || '')
      .split('.')
      .filter(Boolean)
      .reduce((result, key) => (result && typeof result === 'object' ? result[key] : undefined), brand);
  };

  const renderBrandAreas = (container) => {
    if (!brand || !container || !Array.isArray(brand.serviceAreas)) return;

    const itemClass = container.getAttribute('data-item-class') || 'area-chip';
    const maxItemsRaw = Number(container.getAttribute('data-max-items'));
    const items = Number.isFinite(maxItemsRaw) && maxItemsRaw > 0
      ? brand.serviceAreas.slice(0, maxItemsRaw)
      : brand.serviceAreas;
    container.innerHTML = '';

    items.forEach((area) => {
      const item = document.createElement('span');
      item.className = itemClass;
      item.textContent = area;
      container.appendChild(item);
    });
  };

  const renderBrandServices = (container) => {
    if (!brand || !container || !Array.isArray(brand.services)) return;

    const linkClass = container.getAttribute('data-link-class') || '';
    const maxItemsRaw = Number(container.getAttribute('data-max-items'));
    const services = Number.isFinite(maxItemsRaw) && maxItemsRaw > 0
      ? brand.services.slice(0, maxItemsRaw)
      : brand.services;
    container.innerHTML = '';

    services.forEach((service) => {
      const link = document.createElement('a');
      link.href = service.href || '/quote.html';
      link.textContent = service.title || 'Service';
      if (linkClass) link.className = linkClass;
      container.appendChild(link);
    });
  };

  const renderBrandClaimSegments = (node) => {
    if (!node || !brand?.claim) return;

    const parts = String(brand.claim)
      .split(/[|/]/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (!parts.length) {
      node.textContent = brand.claim;
      return;
    }

    node.innerHTML = '';
    node.setAttribute('aria-label', brand.claim);

    parts.forEach((part, index) => {
      const segment = document.createElement('span');
      segment.textContent = part;
      node.appendChild(segment);

      if (index < parts.length - 1) {
        const divider = document.createElement('span');
        divider.className = 'studio-claim-divider';
        divider.setAttribute('aria-hidden', 'true');
        node.appendChild(divider);
      }
    });
  };

  const renderBrandSelectOptions = (select) => {
    if (!select) return;

    if (select.hasAttribute('data-brand-project-type-select') && Array.isArray(brand?.services)) {
      const defaultLabel = select.getAttribute('data-default-label') || 'Select';
      const selectedValue = String(
        select.getAttribute('data-selected-value')
        || new URLSearchParams(window.location.search).get('projectType')
        || ''
      ).trim().toLowerCase();
      select.innerHTML = '';

      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = defaultLabel;
      select.appendChild(emptyOption);

      brand.services.forEach((service) => {
        const option = document.createElement('option');
        option.value = service.category || service.key || 'other';
        option.textContent = service.title || 'Service';
        const matchesSelectedValue = selectedValue && [
          option.value,
          service.key,
          ...(Array.isArray(service.aliases) ? service.aliases : [])
        ].some((candidate) => String(candidate || '').trim().toLowerCase() === selectedValue);
        if (matchesSelectedValue) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    }

    if (select.hasAttribute('data-brand-budget-select') && Array.isArray(brand?.budgetRanges)) {
      const defaultLabel = select.getAttribute('data-default-label') || 'Select';
      select.innerHTML = '';

      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = defaultLabel;
      select.appendChild(emptyOption);

      brand.budgetRanges.forEach((range) => {
        const option = document.createElement('option');
        option.value = range;
        option.textContent = range;
        select.appendChild(option);
      });
    }
  };

  const applyBrandContent = () => {
    if (!brand) return;

    document.querySelectorAll('[data-brand-name]').forEach((node) => {
      setBrandNodeValue(node, brand.name);
    });

    document.querySelectorAll('[data-brand-short-name]').forEach((node) => {
      setBrandNodeValue(node, brand.shortName || brand.name);
    });

    document.querySelectorAll('[data-brand-claim]').forEach((node) => {
      setBrandNodeValue(node, brand.claim);
    });

    document.querySelectorAll('[data-brand-claim-segmented]').forEach((node) => {
      renderBrandClaimSegments(node);
    });

    document.querySelectorAll('[data-brand-region]').forEach((node) => {
      setBrandNodeValue(node, brand.region);
    });

    document.querySelectorAll('[data-brand-email]').forEach((node) => {
      setBrandNodeValue(node, brand.email, `mailto:${brand.email}`);
    });

    document.querySelectorAll('[data-brand-phone]').forEach((node) => {
      const indexRaw = Number(node.getAttribute('data-brand-phone'));
      const phone = brand.phones?.[Number.isFinite(indexRaw) ? indexRaw : 0] || brand.phones?.[0];
      if (!phone) return;
      setBrandNodeValue(node, phone.display, phone.href);
      if (phone.label) node.setAttribute('aria-label', phone.label);
    });

    document.querySelectorAll('[data-brand-area-list]').forEach(renderBrandAreas);
    document.querySelectorAll('[data-brand-service-links]').forEach(renderBrandServices);
    document.querySelectorAll('[data-brand-footer-copy]').forEach((node) => {
      setBrandNodeValue(node, brand.footerCopy);
    });
    document.querySelectorAll('[data-brand-copy]').forEach((node) => {
      const path = node.getAttribute('data-brand-copy');
      const value = getBrandValueByPath(path);
      setBrandNodeValue(node, value);
    });
    document.querySelectorAll('select[data-brand-project-type-select], select[data-brand-budget-select]').forEach(renderBrandSelectOptions);
  };

  const accountPathForRole = (roleRaw) => {
    const role = String(roleRaw || '').toLowerCase();
    if (role === 'client') return '/client-dashboard.html';
    if (['employee', 'manager', 'admin'].includes(role)) return '/manager-dashboard.html';
    return '/auth.html';
  };

  const currentWorkspacePath = () => {
    if (isClientWorkspace) return '/client-dashboard.html';
    if (isManagerWorkspace) return '/manager-dashboard.html';
    return '';
  };

  const buildAuthRedirectUrl = (nextPath = '') => {
    const resolvedNext = nextPath || `${window.location.pathname}${window.location.search || ''}`;
    return `/auth.html?next=${encodeURIComponent(resolvedNext)}&reason=session`;
  };

  const setHidden = (node, hidden) => {
    if (!node) return;
    node.toggleAttribute('hidden', hidden);
  };

  const syncProtectedRoute = (user) => {
    if (!isWorkspacePage) return false;

    const token = localStorage.getItem(TOKEN_KEY);
    const expectedPath = currentWorkspacePath();

    if (!token || !user?.role) {
      window.location.assign(buildAuthRedirectUrl(expectedPath));
      return true;
    }

    const rolePath = accountPathForRole(user.role);
    if (rolePath !== expectedPath) {
      window.location.assign(rolePath);
      return true;
    }

    return false;
  };

  const getGuestAuthLabel = (authLink) => {
    return String(authLink?.getAttribute('data-auth-guest-label') || '').trim() || brand?.publicAuthLabel || 'Account';
  };

  const renderInlineAuthState = (user) => {
    const loggedIn = Boolean(user && localStorage.getItem(TOKEN_KEY));
    const authToggleLabel = authToggle?.querySelector('.public-auth-toggle-label');
    const showHeaderAuthPanel = (!loggedIn && !isWorkspacePage) || (loggedIn && isPublicPage);
    const showHeaderLoginForm = !loggedIn && !isWorkspacePage;
    const showHeaderSession = loggedIn && isPublicPage;
    const hideHeaderAccountLink = loggedIn && (isAuthPage || isWorkspacePage);
    const authView = showHeaderSession ? 'session' : showHeaderLoginForm ? 'guest' : 'hidden';

    body.classList.toggle('has-auth-session', loggedIn);
    body.classList.toggle('is-auth-guest', !loggedIn);
    if (header) {
      header.setAttribute('data-auth-view', authView);
    }
    if (inlineAuthPanel) {
      inlineAuthPanel.setAttribute('data-auth-view', authView);
    }

    if (!showHeaderAuthPanel) {
      header?.classList.remove('is-auth-open');
      authToggle?.setAttribute('aria-expanded', 'false');
    }

    if (authToggleLabel) {
      authToggleLabel.textContent = loggedIn ? 'Account' : 'Login';
    }

    setHidden(authToggle, !showHeaderAuthPanel);
    setHidden(inlineAuthPanel, !showHeaderAuthPanel);
    setHidden(inlineLoginForm, !showHeaderLoginForm);
    setHidden(inlineSession, !showHeaderSession);

    guestOnlyNodes.forEach((node) => {
      if (node === inlineLoginForm) return;
      setHidden(node, loggedIn);
    });
    userOnlyNodes.forEach((node) => {
      if (node === inlineSession) return;
      setHidden(node, !loggedIn);
    });

    accountSettingsLinks.forEach((link) => {
      link.setAttribute('href', '/auth.html');
      link.textContent = 'Account Settings';
      setHidden(link, !loggedIn);
    });

    authLinks.forEach((link) => {
      const isHeaderAccountLink = Boolean(link.closest('[data-nav-menu]'));
      link.textContent = loggedIn ? 'Account' : getGuestAuthLabel(link);
      link.setAttribute('href', loggedIn ? accountPathForRole(user?.role) : '/auth.html');
      link.classList.toggle('is-authenticated', loggedIn);
      setHidden(link, hideHeaderAccountLink && isHeaderAccountLink);
    });

    if (!loggedIn) {
      if (inlineSessionCopy) {
        inlineSessionCopy.textContent = 'Use the inline login to move into project visibility.';
      }
      return;
    }

    if (inlineSessionCopy) {
      const identity = user?.name || user?.email || 'Account ready';
      inlineSessionCopy.textContent = `${identity} is signed in. Use Account or Log out.`;
    }
  };

  const updateNavigationForSession = (user) => {
    renderInlineAuthState(user);
  };

  const ensureInlineAuthLabels = () => {
    if (inlineLoginEmailInput) inlineLoginEmailInput.placeholder = 'E-mail';
    if (inlineLoginPasswordInput) inlineLoginPasswordInput.placeholder = 'Password';
    if (inlineLoginSubmitButton) inlineLoginSubmitButton.textContent = 'Login';
  };

  const ensureInlineRegisterLink = () => {
    if (!inlineLoginRow) return;
    const existing = inlineLoginRow.querySelector('[data-inline-register]');
    if (existing) return;

    const registerLink = document.createElement('a');
    registerLink.href = '/auth.html';
    registerLink.className = 'public-inline-login-submit public-inline-register-link';
    registerLink.textContent = 'Register';
    registerLink.setAttribute('data-inline-register', 'true');
    inlineLoginRow.appendChild(registerLink);
  };

  const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(parseError(payload));
    }

    return payload;
  };

  const validateSession = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      clearAuthMeCache();
      updateNavigationForSession(null);
      syncProtectedRoute(null);
      return;
    }

    const storedUser = getSavedUser();
    updateNavigationForSession(storedUser);

    const cachedUser = readAuthMeCache(token);
    if (cachedUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(cachedUser));
      updateNavigationForSession(cachedUser);
      if (syncProtectedRoute(cachedUser)) return;
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Session expired');
      const payload = await response.json().catch(() => ({}));
      if (!payload?.user) throw new Error('Session expired');

      localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
      writeAuthMeCache(token, payload.user);
      updateNavigationForSession(payload.user);
      if (syncProtectedRoute(payload.user)) return;
    } catch {
      clearSession();
      updateNavigationForSession(null);
      syncProtectedRoute(null);
    }
  };

  if (inlineLoginForm) {
    inlineLoginForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(inlineLoginForm);
      const email = String(formData.get('email') || '').trim();
      const password = String(formData.get('password') || '');

      if (!email || !password) {
        setStatus(inlineLoginStatus, 'Email and password are required.', 'error');
        return;
      }

      setStatus(inlineLoginStatus, 'Logging in...', 'loading');

      try {
        const payload = await fetchJson('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });

        saveSession(payload.token, payload.user);
        updateNavigationForSession(payload.user);
        setStatus(inlineLoginStatus, 'Login successful. Redirecting to account...', 'success');
        inlineLoginForm.reset();
        window.setTimeout(() => {
          window.location.assign(accountPathForRole(payload.user?.role));
        }, 350);
      } catch (error) {
        setStatus(inlineLoginStatus, error.message || 'Login failed.', 'error');
      }
    });
  }

  if (inlineLogoutButton) {
    inlineLogoutButton.addEventListener('click', () => {
      clearSession();
      updateNavigationForSession(null);
      setStatus(inlineLoginStatus, '');
      if (header) {
        header.classList.remove('is-auth-open');
      }
    });
  }

  const isMobileMenuMode = () => window.matchMedia('(max-width: 992px)').matches;
  const isCompactAuthMode = () => window.matchMedia('(max-width: 768px)').matches;

  const getMenuFocusable = () => {
    if (!navMenu) return [];
    return Array.from(navMenu.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(
      (node) => !node.hasAttribute('hidden')
    );
  };

  const setMenuState = (isOpen) => {
    if (!navMenu || !navToggle) return;
    const desktopMode = !isMobileMenuMode();
    const resolvedOpen = desktopMode ? true : Boolean(isOpen);

    navMenu.classList.toggle('is-open', resolvedOpen);
    navMenu.toggleAttribute('hidden', !resolvedOpen);
    navMenu.setAttribute('aria-hidden', String(!resolvedOpen));
    navToggle.classList.toggle('is-open', resolvedOpen && !desktopMode);
    navToggle.setAttribute('aria-expanded', String(resolvedOpen && !desktopMode));
    body.classList.toggle('nav-open', resolvedOpen && !desktopMode);

    if (menuWrap) {
      menuWrap.classList.toggle('is-open', resolvedOpen);
    }

    if (resolvedOpen && isMobileMenuMode()) {
      menuPreviouslyFocused = document.activeElement;
      const first = getMenuFocusable()[0];
      if (first) first.focus();
    }

    if (!resolvedOpen && menuPreviouslyFocused && typeof menuPreviouslyFocused.focus === 'function') {
      menuPreviouslyFocused.focus();
      menuPreviouslyFocused = null;
    }
  };

  const closeMenu = () => setMenuState(false);

  const getAuthFocusable = () => {
    if (!inlineAuthPanel) return [];
    return Array.from(inlineAuthPanel.querySelectorAll('input, a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(
      (node) => !node.hasAttribute('hidden')
    );
  };

  const setAuthPanelState = (isOpen) => {
    if (!inlineAuthPanel || !authToggle) return;

    if (!isCompactAuthMode()) {
      header?.classList.remove('is-auth-open');
      authToggle.setAttribute('aria-expanded', 'false');
      return;
    }

    header?.classList.toggle('is-auth-open', isOpen);
    authToggle.setAttribute('aria-expanded', String(isOpen));

    if (isOpen) {
      authPreviouslyFocused = document.activeElement;
      const first = getAuthFocusable()[0];
      if (first) first.focus();
    }

    if (!isOpen && authPreviouslyFocused && typeof authPreviouslyFocused.focus === 'function') {
      authPreviouslyFocused.focus();
      authPreviouslyFocused = null;
    }
  };

  const closeAuthPanel = () => setAuthPanelState(false);

  if (header) {
    const syncHeader = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };

    syncHeader();
    window.addEventListener('scroll', syncHeader, { passive: true });
  }

  if (navMenu && navToggle) {
    setMenuState(!isMobileMenuMode());

    navToggle.addEventListener('click', () => {
      const willOpen = !navMenu.classList.contains('is-open');
      if (willOpen) closeAuthPanel();
      setMenuState(willOpen);
    });

    navMenu.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link) return;

      if (link.hasAttribute('data-nav-link')) {
        closeMenu();
      }
    });

    document.addEventListener('click', (event) => {
      if (!navMenu.classList.contains('is-open')) return;
      if (navMenu.contains(event.target) || navToggle.contains(event.target)) return;
      closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (!navMenu.classList.contains('is-open')) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== 'Tab' || !isMobileMenuMode()) return;

      const focusable = getMenuFocusable();
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    });

    window.addEventListener('resize', () => {
      setMenuState(!isMobileMenuMode());
      if (!isCompactAuthMode()) {
        closeAuthPanel();
      }
    });
  }

  if (authToggle) {
    authToggle.setAttribute('aria-expanded', 'false');

    authToggle.addEventListener('click', () => {
      if (authToggle.hasAttribute('hidden') || inlineAuthPanel?.hasAttribute('hidden')) return;

      if (!isCompactAuthMode()) {
        const focusTarget = inlineLoginForm?.querySelector('input[name="email"]') || inlineLogoutButton;
        focusTarget?.focus();
        return;
      }

      const willOpen = !header?.classList.contains('is-auth-open');
      if (willOpen) closeMenu();
      setAuthPanelState(willOpen);
    });

    document.addEventListener('click', (event) => {
      if (!header?.classList.contains('is-auth-open')) return;
      if (inlineAuthPanel?.contains(event.target) || authToggle.contains(event.target)) return;
      closeAuthPanel();
    });

    document.addEventListener('keydown', (event) => {
      if (!header?.classList.contains('is-auth-open')) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeAuthPanel();
      }
    });
  }

  const setupDashboardAccordions = () => {
    const dashboardShell = document.querySelector('.dashboard-shell');
    if (!dashboardShell) return;

    const cards = Array.from(dashboardShell.querySelectorAll('section.card:not(.dashboard-session)'));
    const mobileQuery = window.matchMedia('(max-width: 768px)');
    const isTruthyFlag = (value) => ['1', 'true', 'yes', 'open'].includes(String(value || '').toLowerCase());

    const setExpanded = (card, expanded) => {
      const toggle = card.querySelector('.dashboard-accordion-toggle');
      if (!toggle) return;
      card.classList.toggle('is-collapsed', !expanded);
      toggle.setAttribute('aria-expanded', String(expanded));
    };

    cards.forEach((card, index) => {
      if (card.dataset.accordionReady === '1') return;
      const heading = card.querySelector(':scope > h2');
      if (!heading) return;

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'dashboard-accordion-toggle';
      toggle.textContent = heading.textContent.trim();
      toggle.id = `dashboard-toggle-${index + 1}`;

      card.insertBefore(toggle, heading);
      heading.remove();

      const body = document.createElement('div');
      body.className = 'dashboard-accordion-body';
      body.id = `dashboard-panel-${index + 1}`;
      body.setAttribute('role', 'region');
      body.setAttribute('aria-labelledby', toggle.id);

      let sibling = toggle.nextSibling;
      while (sibling) {
        const next = sibling.nextSibling;
        body.appendChild(sibling);
        sibling = next;
      }

      card.appendChild(body);
      toggle.setAttribute('aria-controls', body.id);
      toggle.setAttribute('aria-expanded', 'true');

      toggle.addEventListener('click', () => {
        if (!mobileQuery.matches) return;
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        setExpanded(card, !expanded);
      });

      card.dataset.accordionReady = '1';
    });

    const apply = () => {
      const mobile = mobileQuery.matches;
      cards.forEach((card, index) => {
        if (!card.querySelector('.dashboard-accordion-toggle')) return;
        if (!mobile) {
          setExpanded(card, true);
          return;
        }

        if (card.hidden) {
          setExpanded(card, false);
          return;
        }

        const shouldOpen = isTruthyFlag(card.dataset.dashboardMobileOpen) || index === 0;
        setExpanded(card, shouldOpen);
      });
    };

    apply();
    window.addEventListener('resize', apply);
    window.addEventListener('ll:dashboard-accordions-refresh', apply);

    dashboardShell.querySelectorAll('.dashboard-session-actions').forEach((row) => {
      row.classList.add('dashboard-sticky-actions');
    });
  };

  const setupHomePageMotion = () => {
    if (!body?.classList.contains('page-home')) return;

    body.classList.add('has-home-motion');

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sections = Array.from(document.querySelectorAll('[data-home-section]'));

    if (reduceMotion) {
      body.classList.add('is-home-ready');
      sections.forEach((node) => node.classList.add('is-visible'));
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        body.classList.add('is-home-ready');
      });
    });

    if (!('IntersectionObserver' in window)) {
      sections.forEach((node) => node.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
        rootMargin: '0px 0px -10% 0px'
      }
    );

    sections.forEach((node) => observer.observe(node));
  };

  applyBrandContent();
  ensureInlineAuthLabels();
  ensureInlineRegisterLink();
  validateSession();
  window.addEventListener('ll:session-changed', validateSession);

  setupDashboardAccordions();
  setupHomePageMotion();

  const yearEls = document.querySelectorAll('[data-current-year], [data-year]');
  if (yearEls.length) {
    const year = String(new Date().getFullYear());
    yearEls.forEach((el) => {
      el.textContent = year;
    });
  }

  const nextAvailableDateEl = document.getElementById('next-available-date');
  if (nextAvailableDateEl) {
    const leadMonthsRaw = Number(nextAvailableDateEl.getAttribute('data-lead-months'));
    const leadMonths = Number.isFinite(leadMonthsRaw) ? leadMonthsRaw : 7;
    const now = new Date();
    const nextDate = new Date(now.getFullYear(), now.getMonth() + leadMonths, 1);

    nextAvailableDateEl.textContent = nextDate.toLocaleString('en-GB', {
      month: 'long',
      year: 'numeric'
    });
  }

  const sliders = document.querySelectorAll('[data-before-after]');
  sliders.forEach((slider) => {
    const range = slider.querySelector('input[type="range"]');
    if (!range) return;

    const apply = (rawValue) => {
      const value = Math.min(100, Math.max(0, Number(rawValue) || 50));
      slider.style.setProperty('--after-width', `${value}%`);
    };

    apply(range.value);
    range.addEventListener('input', () => apply(range.value));
  });

})();
