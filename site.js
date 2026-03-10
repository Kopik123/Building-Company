(() => {
  const TOKEN_KEY = 'll_auth_token';
  const USER_KEY = 'll_auth_user';
  const brand = window.LEVEL_LINES_BRAND || null;

  const body = document.body;
  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navMenu = document.querySelector('[data-nav-menu]');
  const isPublicShell = body?.classList.contains('public-site');
  const suppressHeaderUtilityActions = isPublicShell;
  const menuWrap =
    document.querySelector('[data-menu-wrap]') ||
    (navMenu ? navMenu.closest('.menu-wrap') : null) ||
    (navMenu ? navMenu.closest('.main-nav') : null);

  let menuPreviouslyFocused = null;

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const getSavedUser = () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  };

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
    container.innerHTML = '';

    brand.serviceAreas.forEach((area) => {
      const item = document.createElement('span');
      item.className = itemClass;
      item.textContent = area;
      container.appendChild(item);
    });
  };

  const renderBrandServices = (container) => {
    if (!brand || !container || !Array.isArray(brand.services)) return;

    const linkClass = container.getAttribute('data-link-class') || '';
    container.innerHTML = '';

    brand.services.forEach((service) => {
      const link = document.createElement('a');
      link.href = service.href || '/index.html#consultation';
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
      const selectedValue = String(select.getAttribute('data-selected-value') || '').trim().toLowerCase();
      select.innerHTML = '';

      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = defaultLabel;
      select.appendChild(emptyOption);

      brand.services.forEach((service) => {
        const option = document.createElement('option');
        option.value = service.category || service.key || 'other';
        option.textContent = service.title || 'Service';
        if (selectedValue && option.value.toLowerCase() === selectedValue) {
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

  const isAuthLink = (link) => {
    const href = String(link.getAttribute('href') || '').toLowerCase();
    return href.includes('auth.html') || /login\s*\/\s*register/i.test(link.textContent || '');
  };

  const getNavLinks = () => {
    if (!navMenu) return [];
    return Array.from(navMenu.querySelectorAll('[data-nav-link]'));
  };

  const clearInjectedAccountItems = () => {
    if (!navMenu) return;
    navMenu.querySelectorAll('[data-nav-injected="account"]').forEach((node) => node.remove());
  };

  const createNavAnchor = (href, label) => {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.textContent = label;
    anchor.dataset.navLink = '';
    anchor.classList.add('nav-account-sub');
    return anchor;
  };

  const insertNavItemAfter = (baseLink, newAnchor) => {
    if (!baseLink || !newAnchor) return;

    if (navMenu && navMenu.tagName === 'UL') {
      const li = document.createElement('li');
      li.dataset.navInjected = 'account';
      li.appendChild(newAnchor);

      const baseLi = baseLink.closest('li');
      if (baseLi && baseLi.parentElement === navMenu) {
        baseLi.insertAdjacentElement('afterend', li);
      } else {
        navMenu.appendChild(li);
      }
      return;
    }

    newAnchor.dataset.navInjected = 'account';
    baseLink.insertAdjacentElement('afterend', newAnchor);
  };

  const getGuestAuthLabel = (authLink) => {
    return String(authLink?.getAttribute('data-auth-guest-label') || '').trim() || brand?.publicAuthLabel || 'Account';
  };

  const ensureHeaderAccountButton = (loggedIn, href) => {
    const headerInner = document.querySelector('.header-inner');
    if (!headerInner) return;

    if (suppressHeaderUtilityActions) {
      headerInner.querySelector('[data-header-account-btn]')?.remove();
      return;
    }

    let accountBtn = headerInner.querySelector('[data-header-account-btn]');
    if (!accountBtn) {
      accountBtn = document.createElement('a');
      accountBtn.dataset.headerAccountBtn = '1';
      accountBtn.className = 'btn btn-outline header-account-btn';

      const cta = headerInner.querySelector('.header-cta');
      if (cta) {
        cta.insertAdjacentElement('beforebegin', accountBtn);
      } else {
        headerInner.appendChild(accountBtn);
      }
    }

    accountBtn.href = loggedIn ? href : '/auth.html';
    accountBtn.textContent = 'Account';
    accountBtn.title = loggedIn ? 'Open account settings' : 'Open account access';
    accountBtn.classList.toggle('is-authenticated', loggedIn);
  };

  const ensureDrawerCta = () => {
    if (suppressHeaderUtilityActions) {
      navMenu?.querySelector('[data-nav-drawer-cta]')?.remove();
      navMenu?.querySelector('.nav-drawer-cta-wrap')?.remove();
      return;
    }

    if (!navMenu || navMenu.querySelector('[data-nav-drawer-cta]')) return;

    const cta = document.createElement('a');
    cta.href = '/index.html#consultation';
    cta.className = 'btn btn-gold nav-drawer-cta';
    cta.dataset.navDrawerCta = '1';
    cta.textContent = 'Request Private Consultation';

    if (navMenu.tagName === 'UL') {
      const li = document.createElement('li');
      li.className = 'nav-drawer-cta-wrap';
      li.appendChild(cta);
      navMenu.appendChild(li);
      return;
    }

    navMenu.appendChild(cta);
  };

  const updateNavigationForSession = (user) => {
    const loggedIn = Boolean(user && localStorage.getItem(TOKEN_KEY));
    const accountHref = accountPathForRole(user?.role);
    const navLinks = getNavLinks();
    const authLink = navLinks.find(isAuthLink);

    ensureHeaderAccountButton(loggedIn, accountHref);
    clearInjectedAccountItems();

    if (!authLink) return;

    if (isPublicShell) {
      authLink.textContent = getGuestAuthLabel(authLink);
      authLink.setAttribute('href', '/auth.html');
      authLink.classList.remove('nav-account-link');
      return;
    }

    authLink.textContent = loggedIn ? 'Account' : getGuestAuthLabel(authLink);
    authLink.setAttribute('href', loggedIn ? accountHref : '/auth.html');
    authLink.classList.toggle('nav-account-link', loggedIn);

    if (!loggedIn) return;

    const settings = createNavAnchor('/auth.html', 'Account Settings');
    const workspace = createNavAnchor(accountHref, user?.role === 'client' ? 'Client Workspace' : 'Staff Workspace');
    const logout = createNavAnchor('#logout', 'Logout');
    logout.dataset.navLogout = '1';

    insertNavItemAfter(authLink, settings);
    insertNavItemAfter(settings, workspace);
    insertNavItemAfter(workspace, logout);
  };

  const validateSession = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      updateNavigationForSession(null);
      return;
    }

    updateNavigationForSession(getSavedUser());

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
      updateNavigationForSession(payload.user);
    } catch {
      clearSession();
      updateNavigationForSession(null);
    }
  };

  const isMobileMenuMode = () => window.matchMedia('(max-width: 992px)').matches;

  const getMenuFocusable = () => {
    if (!navMenu) return [];
    return Array.from(navMenu.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(
      (node) => !node.hasAttribute('hidden')
    );
  };

  const setMenuState = (isOpen) => {
    if (!navMenu || !navToggle) return;

    navMenu.classList.toggle('is-open', isOpen);
    navToggle.classList.toggle('is-open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
    body.classList.toggle('nav-open', isOpen);

    if (menuWrap) {
      menuWrap.classList.toggle('is-open', isOpen);
    }

    if (isOpen && isMobileMenuMode()) {
      menuPreviouslyFocused = document.activeElement;
      const first = getMenuFocusable()[0];
      if (first) first.focus();
    }

    if (!isOpen && menuPreviouslyFocused && typeof menuPreviouslyFocused.focus === 'function') {
      menuPreviouslyFocused.focus();
      menuPreviouslyFocused = null;
    }
  };

  const closeMenu = () => setMenuState(false);

  if (header) {
    const syncHeader = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };

    syncHeader();
    window.addEventListener('scroll', syncHeader, { passive: true });
  }

  if (navMenu && navToggle) {
    ensureDrawerCta();

    navToggle.addEventListener('click', () => {
      const willOpen = !navMenu.classList.contains('is-open');
      setMenuState(willOpen);
    });

    navMenu.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link) return;

      if (link.dataset.navLogout === '1') {
        event.preventDefault();
        clearSession();
        updateNavigationForSession(null);
        closeMenu();
        window.location.assign('/auth.html');
        return;
      }

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
      if (!isMobileMenuMode() && navMenu.classList.contains('is-open')) {
        closeMenu();
      }
      ensureHeaderAccountButton(Boolean(localStorage.getItem(TOKEN_KEY)), accountPathForRole(getSavedUser()?.role));
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
