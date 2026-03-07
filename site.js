(() => {
  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navMenu = document.querySelector('[data-nav-menu]');
  const navLinks = Array.from(document.querySelectorAll('[data-nav-link]'));

  if (header) {
    const syncHeader = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 12);
    };

    syncHeader();
    window.addEventListener('scroll', syncHeader, { passive: true });
  }

  if (navToggle && navMenu) {
    const closeMenu = () => {
      navMenu.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    };

    navToggle.addEventListener('click', () => {
      const nextState = !navMenu.classList.contains('is-open');
      navMenu.classList.toggle('is-open', nextState);
      navToggle.setAttribute('aria-expanded', String(nextState));
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });
  }

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

  const mapProjectType = (value) => {
    const raw = String(value || '').toLowerCase();

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

  const quoteForms = document.querySelectorAll('.quote-form');

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
      const projectType = mapProjectType(formData.get('project-type'));
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
        status.textContent = `Request sent successfully. Reference: ${payload.quoteId}.`;
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
