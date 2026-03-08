(() => {
  const TOKEN_KEY = 'll_auth_token';
  const USER_KEY = 'll_auth_user';
  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navMenu = document.querySelector('[data-nav-menu]');
  const menuWrap = document.querySelector('[data-menu-wrap]');
  const navLinks = Array.from(document.querySelectorAll('[data-nav-link]'));

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

  const clearInjectedAccountItems = () => {
    document.querySelectorAll('[data-nav-injected]').forEach((node) => {
      node.remove();
    });
  };

  const insertNavItemAfter = (baseNode, anchor) => {
    const insertionTarget = baseNode?.tagName === 'LI' ? baseNode : (baseNode?.closest('li') || baseNode);
    const targetParent = insertionTarget?.parentElement;

    anchor.dataset.navInjected = '1';

    if (targetParent && targetParent.tagName === 'UL') {
      const li = document.createElement('li');
      li.dataset.navInjected = '1';
      li.appendChild(anchor);
      insertionTarget.insertAdjacentElement('afterend', li);
      return anchor;
    }

    insertionTarget?.insertAdjacentElement('afterend', anchor);
    return anchor;
  };

  const createMenuAnchor = (href, label, extraClass = '') => {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.dataset.navLink = '';
    anchor.classList.add('nav-account-sub');
    if (extraClass) anchor.classList.add(extraClass);
    anchor.textContent = label;
    return anchor;
  };

  const panelLabelForRole = (roleRaw) => {
    const role = String(roleRaw || '').toLowerCase();
    if (role === 'client') return 'Client Panel';
    if (['employee', 'manager', 'admin'].includes(role)) return 'Staff Dashboard';
    return 'Account';
  };

  const syncHeaderAccountButton = (loggedIn, accountHref = '/auth.html') => {
    const headerInner = document.querySelector('.header-inner');
    if (!headerInner) return;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    let button = headerInner.querySelector('[data-header-account-btn]');
    if (!button) {
      button = document.createElement('a');
      button.dataset.headerAccountBtn = '1';
      button.className = 'btn btn-outline header-account-btn';
      const headerCta = headerInner.querySelector('.header-cta');
      if (headerCta) {
        headerCta.insertAdjacentElement('beforebegin', button);
      } else {
        headerInner.appendChild(button);
      }
    }

    button.href = loggedIn ? accountHref : '/auth.html';
    button.textContent = loggedIn ? 'Account' : (isMobile ? 'Login' : 'Login / Register');
    button.title = loggedIn ? 'Open account settings' : 'Login or register account';
    button.classList.toggle('is-authenticated', loggedIn);
  };

  const syncAuthLinks = (user) => {
    const authLinks = navLinks.filter(isAuthLink);
    const loggedIn = Boolean(user && localStorage.getItem(TOKEN_KEY));
    const accountHref = accountPathForRole(user?.role);
    syncHeaderAccountButton(loggedIn, accountHref);
    if (!authLinks.length) return;

    authLinks.forEach((link) => {
      if (loggedIn) {
        link.textContent = 'Account Menu';
        link.setAttribute('href', '/auth.html');
        link.classList.add('nav-account-link');
      } else {
        link.textContent = 'Login / Register';
        link.setAttribute('href', '/auth.html');
        link.classList.remove('nav-account-link');
      }
    });

    clearInjectedAccountItems();

    if (loggedIn) {
      let insertionPoint = authLinks[0];

      const settingsAnchor = createMenuAnchor('/auth.html', 'Account Settings');
      insertionPoint = insertNavItemAfter(insertionPoint, settingsAnchor);

      const panelAnchor = createMenuAnchor(accountHref, panelLabelForRole(user?.role));
      insertionPoint = insertNavItemAfter(insertionPoint, panelAnchor);

      const logoutAnchor = createMenuAnchor('#logout', 'Logout', 'nav-logout-link');
      logoutAnchor.addEventListener('click', (event) => {
        event.preventDefault();
        clearSession();
        window.location.assign('/index.html');
      });
      insertNavItemAfter(insertionPoint, logoutAnchor);
      return;
    }
  };

  const validateSession = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      syncAuthLinks(null);
      return;
    }

    syncAuthLinks(getSavedUser());

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Session expired');

      const payload = await response.json().catch(() => ({}));
      if (!payload?.user) throw new Error('Invalid session');

      localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
      syncAuthLinks(payload.user);
    } catch {
      clearSession();
      syncAuthLinks(null);
    }
  };

  if (header) {
    const syncHeader = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 12);
    };

    syncHeader();
    window.addEventListener('scroll', syncHeader, { passive: true });
  }

  if (navToggle && navMenu) {
    const setMenuState = (isOpen) => {
      navMenu.classList.toggle('is-open', isOpen);
      navToggle.classList.toggle('is-open', isOpen);
      if (menuWrap) {
        menuWrap.classList.toggle('is-open', isOpen);
      }
      document.body.classList.toggle('nav-open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
    };

    const closeMenu = () => {
      setMenuState(false);
    };

    navToggle.addEventListener('click', () => {
      const nextState = !navMenu.classList.contains('is-open');
      setMenuState(nextState);
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });

    navMenu.addEventListener('click', (event) => {
      if (event.target.closest('a[data-nav-link]')) {
        closeMenu();
      }
    });

    document.addEventListener('click', (event) => {
      if (navToggle.contains(event.target) || navMenu.contains(event.target)) return;
      closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && navMenu.classList.contains('is-open')) {
        closeMenu();
      }
    });
  }

  validateSession();
  window.addEventListener('ll:session-changed', () => {
    validateSession();
  });

  const yearEls = document.querySelectorAll('[data-current-year]');
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
      ['kitchen', 'kitchen'],
      ['premium kitchen', 'kitchen'],
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

  // Handle non-js quote forms only to avoid double submit when quote.js is present.
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
        status.textContent = 'Please add your name, project details, and either an email or phone number.';
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
          ? `Request sent successfully. Reference: ${payload.quoteId}.`
          : 'Request sent successfully.';
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
