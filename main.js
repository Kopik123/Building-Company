(() => {
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navMenu = document.querySelector('[data-nav-menu]');
  const menuWrap = document.querySelector('[data-menu-wrap]');
  const navLinks = document.querySelectorAll('[data-nav-link]');
  const yearNodes = document.querySelectorAll('[data-year]');
  const beforeAfterNodes = document.querySelectorAll('[data-before-after]');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const next = !navMenu.classList.contains('is-open');
      navMenu.classList.toggle('is-open', next);
      navToggle.setAttribute('aria-expanded', String(next));
    });

    if (menuWrap) {
      menuWrap.addEventListener('mouseenter', () => {
        navToggle.setAttribute('aria-expanded', 'true');
      });

      menuWrap.addEventListener('mouseleave', () => {
        if (!navMenu.classList.contains('is-open')) {
          navToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    document.addEventListener('click', (event) => {
      if (!menuWrap) return;
      if (menuWrap.contains(event.target)) return;
      navMenu.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
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
