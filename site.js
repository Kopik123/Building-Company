(() => {
  const TOKEN_KEY = 'll_auth_token';
  const USER_KEY = 'll_auth_user';

  const body = document.body;
  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navMenu = document.querySelector('[data-nav-menu]');
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

  const ensureHeaderAccountButton = (loggedIn, href) => {
    const headerInner = document.querySelector('.header-inner');
    if (!headerInner) return;

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

    const mobile = window.matchMedia('(max-width: 992px)').matches;
    accountBtn.href = loggedIn ? href : '/auth.html';
    accountBtn.textContent = loggedIn ? 'Account' : (mobile ? 'Login' : 'Login / Register');
    accountBtn.classList.toggle('is-authenticated', loggedIn);
  };

  const ensureDrawerCta = () => {
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

    authLink.textContent = loggedIn ? 'Account' : 'Login / Register';
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

    const cards = Array.from(dashboardShell.querySelectorAll('section.card'));

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
        if (!window.matchMedia('(max-width: 768px)').matches) return;
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        setExpanded(card, !expanded);
      });

      card.dataset.accordionReady = '1';
    });

    const apply = () => {
      const mobile = window.matchMedia('(max-width: 768px)').matches;
      cards.forEach((card, index) => {
        if (!card.querySelector('.dashboard-accordion-toggle')) return;
        setExpanded(card, !mobile || index === 0);
      });
    };

    apply();
    window.addEventListener('resize', apply);

    dashboardShell.querySelectorAll('.dashboard-session-actions').forEach((row) => {
      row.classList.add('dashboard-sticky-actions');
    });
  };

  validateSession();
  window.addEventListener('ll:session-changed', validateSession);

  setupDashboardAccordions();

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

  const normalizeProjectType = (value) => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 'other';

    const aliases = new Map([
      ['bathroom', 'bathroom'],
      ['premium bathroom', 'bathroom'],
      ['bathroom renovation', 'bathroom'],
      ['kitchen', 'kitchen'],
      ['premium kitchen', 'kitchen'],
      ['kitchen renovation', 'kitchen'],
      ['interior', 'interior'],
      ['interior renovation', 'interior'],
      ['tiling', 'tiling'],
      ['extension', 'extension'],
      ['joinery', 'joinery'],
      ['rendering', 'rendering'],
      ['decorating', 'decorating'],
      ['other', 'other']
    ]);

    if (aliases.has(raw)) return aliases.get(raw);
    if (raw.includes('bath')) return 'bathroom';
    if (raw.includes('kitch')) return 'kitchen';
    if (raw.includes('interior')) return 'interior';
    if (raw.includes('tile')) return 'tiling';
    if (raw.includes('joinery')) return 'joinery';
    if (raw.includes('extension')) return 'extension';
    if (raw.includes('render')) return 'rendering';
    if (raw.includes('decor')) return 'decorating';
    return 'other';
  };

  const quoteForms = document.querySelectorAll('.quote-form:not(.js-quote-form)');

  quoteForms.forEach((form) => {
    const status = form.querySelector('.form-status');
    const submitButton = form.querySelector('button[type="submit"]');

    if (!status || !submitButton) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const guestName = String(formData.get('name') || '').trim();
      const guestEmail = String(formData.get('email') || '').trim();
      const guestPhone = String(formData.get('phone') || '').trim();
      const description = String(formData.get('message') || '').trim();
      const projectType = normalizeProjectType(formData.get('projectType') || formData.get('project-type'));
      const budgetRange = String(formData.get('budget') || '').trim();
      const location = String(formData.get('location') || '').trim() || 'Greater Manchester';
      const postcode = String(formData.get('postcode') || '').trim();

      status.className = 'form-status';
      status.textContent = '';

      if (!guestName || !description || (!guestEmail && !guestPhone)) {
        status.classList.add('is-error');
        status.textContent = 'Please provide your name, project details, and either email or phone.';
        return;
      }

      submitButton.disabled = true;
      status.classList.add('is-loading');
      status.textContent = 'Sending your request...';

      try {
        const response = await fetch('/api/quotes/guest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            guestName,
            guestEmail: guestEmail || undefined,
            guestPhone: guestPhone || undefined,
            projectType,
            budgetRange: budgetRange || undefined,
            description,
            location,
            postcode: postcode || undefined
          })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || 'Could not submit your consultation request.');
        }

        status.className = 'form-status is-success';
        status.textContent = payload.quoteId
          ? `Request sent. Reference: ${payload.quoteId}.`
          : 'Request sent.';
        form.reset();
      } catch (error) {
        status.className = 'form-status is-error';
        status.textContent = error.message || 'Could not submit your consultation request.';
      } finally {
        submitButton.disabled = false;
      }
    });
  });
})();
