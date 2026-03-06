(() => {
  const forms = document.querySelectorAll('.js-quote-form');
  if (!forms.length) return;

  const normalizeProjectType = (value) => {
    const lower = String(value || '').trim().toLowerCase();
    if (['bathroom', 'kitchen', 'interior', 'tiling', 'extension', 'joinery', 'rendering', 'decorating', 'other'].includes(lower)) {
      return lower;
    }
    return 'other';
  };

  forms.forEach((form) => {
    const submitButton = form.querySelector('button[type="submit"]');
    const status = form.querySelector('.form-status');
    if (!submitButton || !status) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const guestName = String(formData.get('name') || '').trim();
      const guestPhone = String(formData.get('phone') || '').trim();
      const guestEmail = String(formData.get('email') || '').trim();
      const projectType = normalizeProjectType(formData.get('projectType'));
      const budgetRange = String(formData.get('budget') || '').trim();
      const description = String(formData.get('message') || '').trim();

      if (!guestName || !description || (!guestPhone && !guestEmail)) {
        status.className = 'form-status is-error';
        status.textContent = 'Please provide your name, project details, and either phone or email.';
        return;
      }

      submitButton.disabled = true;
      status.className = 'form-status';
      status.textContent = 'Sending consultation request...';

      try {
        const response = await fetch('/api/quotes/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestName,
            guestPhone: guestPhone || undefined,
            guestEmail: guestEmail || undefined,
            projectType,
            budgetRange: budgetRange || undefined,
            description,
            location: 'Greater Manchester'
          })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || 'Could not submit consultation request.');
        }

        form.reset();
        status.className = 'form-status is-success';
        status.textContent = payload.quoteId
          ? `Thank you. Your consultation reference is ${payload.quoteId}.`
          : 'Thank you. Your request has been sent.';
      } catch (error) {
        status.className = 'form-status is-error';
        status.textContent = error.message || 'Could not submit consultation request.';
      } finally {
        submitButton.disabled = false;
      }
    });
  });
})();
