(() => {
  const forms = document.querySelectorAll('.quote-form');
  if (!forms.length) return;
  const MAX_QUOTE_PHOTOS = 8;

  const normalizeProjectType = (value) => {
    const lower = String(value || '').trim().toLowerCase();
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
      ['carpentry', 'joinery'],
      ['joinery', 'joinery'],
      ['internal wall systems', 'interior'],
      ['internal wall system', 'interior'],
      ['internal walls', 'interior'],
      ['external wall systems', 'rendering'],
      ['external wall system', 'rendering'],
      ['external walls', 'rendering'],
      ['rendering', 'rendering'],
      ['extension', 'extension'],
      ['decorating', 'decorating'],
      ['other', 'other']
    ]);

    if (aliases.has(lower)) return aliases.get(lower);
    if (lower.includes('bath')) return 'bathroom';
    if (lower.includes('kitch')) return 'kitchen';
    if (lower.includes('interior') || lower.includes('internal wall')) return 'interior';
    if (lower.includes('tile')) return 'tiling';
    if (lower.includes('carpent') || lower.includes('joinery')) return 'joinery';
    if (lower.includes('external wall')) return 'rendering';
    if (lower.includes('extension')) return 'extension';
    if (lower.includes('render')) return 'rendering';
    if (lower.includes('decor')) return 'decorating';
    return 'other';
  };

  const getFilesStatusText = (files) => {
    if (!files.length) return 'Optional: attach up to 8 reference photos.';
    if (files.length === 1) return `${files[0].name} selected.`;
    return `${files.length} photos selected.`;
  };

  const applyProjectTypeContext = (form) => {
    if (!form) return;

    const selectedRaw = new URLSearchParams(window.location.search).get('projectType');
    if (!selectedRaw) return;

    const select = form.querySelector('select[name="projectType"], select[name="project-type"]');
    if (!select) return;

    const selectedLower = String(selectedRaw).trim().toLowerCase();
    const normalized = normalizeProjectType(selectedRaw);
    const matchedOption = Array.from(select.options).find((option) => {
      const optionValue = String(option.value || '').trim().toLowerCase();
      return optionValue === selectedLower || optionValue === normalized;
    });

    if (matchedOption) {
      select.value = matchedOption.value;
    }
  };

  forms.forEach((form) => {
    const submitButton = form.querySelector('button[type="submit"]');
    const status = form.querySelector('.form-status');
    const filesInput = form.querySelector('input[type="file"][name="files"]');
    const filesStatus = form.querySelector('[data-quote-files-status]');
    if (!submitButton || !status) return;

    applyProjectTypeContext(form);
    if (filesInput && filesStatus) {
      filesStatus.textContent = getFilesStatusText([]);
      filesInput.addEventListener('change', () => {
        filesStatus.textContent = getFilesStatusText(Array.from(filesInput.files || []));
      });
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const guestName = String(formData.get('name') || '').trim();
      const guestPhone = String(formData.get('phone') || '').trim();
      const guestEmail = String(formData.get('email') || '').trim();
      const projectTypeRaw = formData.get('projectType') || formData.get('project-type');
      const projectType = normalizeProjectType(projectTypeRaw);
      const budgetRange = String(formData.get('budget') || '').trim();
      const description = String(formData.get('message') || '').trim();
      const location = String(formData.get('location') || '').trim() || 'Greater Manchester';
      const postcode = String(formData.get('postcode') || '').trim();
      const files = Array.from(filesInput?.files || []);

      status.className = 'form-status';
      status.textContent = '';
      if (!guestName || !description || (!guestPhone && !guestEmail)) {
        status.classList.add('is-error');
        status.textContent = 'Please provide your name, project details, and either email or phone.';
        return;
      }
      if (files.length > MAX_QUOTE_PHOTOS) {
        status.classList.add('is-error');
        status.textContent = `Attach up to ${MAX_QUOTE_PHOTOS} photos per quote.`;
        return;
      }
      if (files.some((file) => !String(file.type || '').toLowerCase().startsWith('image/'))) {
        status.classList.add('is-error');
        status.textContent = 'Only image files are allowed for quote photo attachments.';
        return;
      }

      submitButton.disabled = true;
      status.classList.add('is-loading');
      status.textContent = 'Sending your request...';

      try {
        const requestBody = new FormData();
        requestBody.set('guestName', guestName);
        if (guestPhone) requestBody.set('guestPhone', guestPhone);
        if (guestEmail) requestBody.set('guestEmail', guestEmail);
        requestBody.set('projectType', projectType);
        if (budgetRange) requestBody.set('budgetRange', budgetRange);
        requestBody.set('description', description);
        requestBody.set('location', location);
        if (postcode) requestBody.set('postcode', postcode);
        files.forEach((file) => requestBody.append('files', file));

        const response = await fetch('/api/quotes/guest', {
          method: 'POST',
          body: requestBody
        });

        const responsePayload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(responsePayload.error || 'Could not submit your consultation request.');
        }

        status.className = 'form-status is-success';
        status.textContent = responsePayload.quoteId
          ? responsePayload.attachmentCount
            ? `Request sent with ${responsePayload.attachmentCount} photo(s). Reference: ${responsePayload.quoteId}.`
            : `Request sent. Reference: ${responsePayload.quoteId}.`
          : 'Request sent.';
        form.reset();
        applyProjectTypeContext(form);
        if (filesStatus) filesStatus.textContent = getFilesStatusText([]);
      } catch (error) {
        status.className = 'form-status is-error';
        status.textContent = error.message || 'Could not submit your consultation request.';
      } finally {
        submitButton.disabled = false;
      }
    });
  });
})();
