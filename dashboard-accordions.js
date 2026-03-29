(() => {
  const dashboardShell = document.querySelector('.dashboard-shell');
  if (!dashboardShell) return;

  const cards = Array.from(dashboardShell.querySelectorAll('section.card:not(.dashboard-session)'));
  const mobileQuery = globalThis.matchMedia('(max-width: 768px)');
  const isTruthyFlag = (value) => ['1', 'true', 'yes', 'open'].includes(String(value || '').toLowerCase());

  const setExpanded = (card, expanded) => {
    const toggle = card.querySelector('.dashboard-accordion-toggle');
    if (!toggle) return;
    card.classList.toggle('is-collapsed', !expanded);
    toggle.setAttribute('aria-expanded', String(expanded));
  };

  const createAccordionBody = (card, toggle, index) => {
    const accordionBody = document.createElement('div');
    accordionBody.className = 'dashboard-accordion-body';
    accordionBody.id = `dashboard-panel-${index + 1}`;
    accordionBody.setAttribute('role', 'region');
    accordionBody.setAttribute('aria-labelledby', toggle.id);

    let sibling = toggle.nextSibling;
    while (sibling) {
      const next = sibling.nextSibling;
      accordionBody.appendChild(sibling);
      sibling = next;
    }

    card.appendChild(accordionBody);
    toggle.setAttribute('aria-controls', accordionBody.id);
    toggle.setAttribute('aria-expanded', 'true');
  };

  const createAccordionToggle = (card, heading, index) => {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'dashboard-accordion-toggle';
    toggle.textContent = heading.textContent.trim();
    toggle.id = `dashboard-toggle-${index + 1}`;

    card.insertBefore(toggle, heading);
    heading.remove();
    return toggle;
  };

  const bindAccordionToggle = (card, toggle) => {
    toggle.addEventListener('click', () => {
      if (!mobileQuery.matches) return;
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      setExpanded(card, !expanded);
    });
  };

  const initializeAccordionCard = (card, index) => {
    if (card.dataset.accordionReady === '1') return;
    const heading = card.querySelector(':scope > h2');
    if (!heading) return;

    const toggle = createAccordionToggle(card, heading, index);
    createAccordionBody(card, toggle, index);
    bindAccordionToggle(card, toggle);
    card.dataset.accordionReady = '1';
  };

  cards.forEach(initializeAccordionCard);

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
  globalThis.addEventListener('resize', apply);
  globalThis.addEventListener('ll:dashboard-accordions-refresh', apply);

  dashboardShell.querySelectorAll('.dashboard-session-actions').forEach((row) => {
    row.classList.add('dashboard-sticky-actions');
  });
})();
