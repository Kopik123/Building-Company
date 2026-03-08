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

  const isAuthLink = (link) => {
    const href = String(link.getAttribute('href') || '').toLowerCase();
    return href.includes('auth.html') || /login\s*\/\s*register/i.test(link.textContent || '');
  };

  const createLogoutAnchor = () => {
    const anchor = document.createElement('a');
    anchor.href = '#logout';
    anchor.dataset.navLink = '';
    anchor.dataset.navLogout = '1';
    anchor.classList.add('nav-logout-link');
    anchor.textContent = 'Logout';
    anchor.addEventListener('click', (event) => {
      event.preventDefault();
      clearSession();
      window.location.assign('/index.html');
    });
    return anchor;
  };

  const ensureLogoutLink = (authLink) => {
    if (!authLink || document.querySelector('[data-nav-logout]')) return;

    const anchor = createLogoutAnchor();
    const parent = authLink.parentElement;
    if (parent && parent.tagName === 'LI') {
      const li = document.createElement('li');
      li.appendChild(anchor);
      parent.insertAdjacentElement('afterend', li);
      return;
    }

    authLink.insertAdjacentElement('afterend', anchor);
  };

  const syncAuthLinks = (user) => {
    const authLinks = navLinks.filter(isAuthLink);
    if (!authLinks.length) return;

    const loggedIn = Boolean(user && localStorage.getItem(TOKEN_KEY));
    const accountHref = accountPathForRole(user?.role);

    authLinks.forEach((link) => {
      if (loggedIn) {
        link.textContent = 'Account';
        link.setAttribute('href', accountHref);
        link.classList.add('nav-account-link');
      } else {
        link.textContent = 'Login / Register';
        link.setAttribute('href', '/auth.html');
        link.classList.remove('nav-account-link');
      }
    });

    const existingLogout = document.querySelectorAll('[data-nav-logout]');
    if (loggedIn) {
      ensureLogoutLink(authLinks[0]);
      return;
    }

    existingLogout.forEach((node) => {
      const parent = node.parentElement;
      if (parent && parent.tagName === 'LI') {
        parent.remove();
        return;
      }
      node.remove();
    });
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
    let closeTimer = null;

    const setMenuState = (isOpen) => {
      navMenu.classList.toggle('is-open', isOpen);
      navToggle.classList.toggle('is-open', isOpen);
      if (menuWrap) {
        menuWrap.classList.toggle('is-open', isOpen);
      }
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

    navToggle.addEventListener('click', () => {
      const next = !navMenu.classList.contains('is-open');
      setMenuState(next);
    });

    navToggle.addEventListener('mouseenter', openMenu);
    navToggle.addEventListener('focus', openMenu);

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

    document.addEventListener('click', (event) => {
      if (navToggle.contains(event.target) || navMenu.contains(event.target)) return;
      closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });
  }

  validateSession();

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
