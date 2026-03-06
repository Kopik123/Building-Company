(() => {
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navMenu = document.querySelector('[data-nav-menu]');
  const navLinks = document.querySelectorAll('[data-nav-link]');
  const yearNodes = document.querySelectorAll('[data-year]');
  const beforeAfterNodes = document.querySelectorAll('[data-before-after]');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const next = !navMenu.classList.contains('is-open');
      navMenu.classList.toggle('is-open', next);
      navToggle.setAttribute('aria-expanded', String(next));
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
