(() => {
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navMenu = document.querySelector('[data-nav-menu]');
  const menuWrap = document.querySelector('[data-menu-wrap]');
  const navLinks = document.querySelectorAll('[data-nav-link]');
  const yearNodes = document.querySelectorAll('[data-year]');
  const beforeAfterNodes = document.querySelectorAll('[data-before-after]');

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
