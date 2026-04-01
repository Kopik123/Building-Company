(() => {
  const TOKEN_KEY = 'll_auth_token';
  const USER_KEY = 'll_auth_user';
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navMenu = document.querySelector('[data-nav-menu]');
  const menuWrap = document.querySelector('[data-menu-wrap]');
  const navLinks = Array.from(document.querySelectorAll('[data-nav-link]'));
  const yearNodes = document.querySelectorAll('[data-year], [data-current-year]');
  const beforeAfterNodes = document.querySelectorAll('[data-before-after]');
  const isAuthPage = /\/auth\.html$/i.test(window.location.pathname);

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

  const normalizeAuthLinkLabel = (value) => String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const isAuthLink = (link) => {
    const href = String(link.getAttribute('href') || '').toLowerCase();
    const normalizedLabel = normalizeAuthLinkLabel(link.textContent);
    return href.includes('auth.html')
      || normalizedLabel === 'login / register'
      || normalizedLabel === 'login/register'
      || normalizedLabel.includes('login / register')
      || normalizedLabel.includes('login/register');
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
    button.textContent = 'Account';
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
        link.textContent = 'Account';
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

      if (!response.ok) {
        throw new Error('Session expired');
      }

      const payload = await response.json().catch(() => ({}));
      const user = payload?.user || null;
      if (!user) throw new Error('Invalid session');

      localStorage.setItem(USER_KEY, JSON.stringify(user));
      syncAuthLinks(user);
    } catch {
      clearSession();
      syncAuthLinks(null);
      if (isAuthPage) window.location.assign('/auth.html');
    }
  };

  if (navToggle && navMenu) {
    const hoverMenuQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    let closeTimer = null;

    const setMenuState = (isOpen) => {
      navMenu.classList.toggle('is-open', isOpen);
      navToggle.classList.toggle('is-open', isOpen);
      if (menuWrap) {
        menuWrap.classList.toggle('is-open', isOpen);
      }
      document.body.classList.toggle('nav-open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
    };

    const openMenu = () => {
      if (closeTimer) clearTimeout(closeTimer);
      setMenuState(true);
    };

    const closeMenu = (delay = 0) => {
      if (closeTimer) clearTimeout(closeTimer);
      if (!delay) {
        setMenuState(false);
        return;
      }

      closeTimer = window.setTimeout(() => {
        setMenuState(false);
      }, delay);
    };

    navToggle.addEventListener('click', (event) => {
      event.preventDefault();
      const next = !navMenu.classList.contains('is-open');
      setMenuState(next);
    });

    if (hoverMenuQuery.matches) {
      navToggle.addEventListener('mouseenter', openMenu);

      if (menuWrap) {
        menuWrap.addEventListener('mouseenter', openMenu);
        menuWrap.addEventListener('mouseleave', () => {
          closeMenu(120);
        });

        menuWrap.addEventListener('focusout', () => {
          window.setTimeout(() => {
            if (!menuWrap.contains(document.activeElement)) {
              closeMenu();
            }
          }, 0);
        });
      } else {
        navToggle.addEventListener('mouseleave', () => closeMenu(140));
        navMenu.addEventListener('mouseenter', openMenu);
        navMenu.addEventListener('mouseleave', () => closeMenu(140));
      }
    }

    document.addEventListener('click', (event) => {
      if (navToggle.contains(event.target) || navMenu.contains(event.target)) return;
      closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && navMenu.classList.contains('is-open')) {
        closeMenu();
      }
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
  }

  validateSession();
  window.addEventListener('ll:session-changed', () => {
    validateSession();
  });

  if (yearNodes.length) {
    const year = String(new Date().getFullYear());
    yearNodes.forEach((node) => {
      node.textContent = year;
    });
  }

  beforeAfterNodes.forEach((node) => {
    const slider = node.querySelector('input[type="range"]');
    if (!slider) return;

    const applyValue = (rawValue) => {
      const value = Math.min(100, Math.max(0, Number(rawValue) || 50));
      node.style.setProperty('--after-width', `${value}%`);
    };

    applyValue(slider.value);
    slider.addEventListener('input', () => applyValue(slider.value));
  });
})();
