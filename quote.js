(() => {
  const forms = document.querySelectorAll('.quote-form');
  if (!forms.length) return;
  const MAX_QUOTE_PHOTOS = 8;
  const EMPTY_FILES_STATUS_TEXT = 'Optional: attach up to 8 reference photos.';
  const QUOTE_PREVIEW_QUERY_KEY = 'quote';
  const previewUrlsByForm = new WeakMap();
  const quotePreviewToken = new URLSearchParams(window.location.search).get(QUOTE_PREVIEW_QUERY_KEY);
  let quotePreviewRequest;

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
    if (!files.length) return EMPTY_FILES_STATUS_TEXT;
    if (files.length === 1) return `${files[0].name} selected.`;
    return `${files.length} photos selected.`;
  };

  const formatFileSize = (bytes) => {
    const numericBytes = Number(bytes) || 0;
    if (numericBytes <= 0) return 'Image file';
    if (numericBytes < 1024 * 1024) return `${Math.max(1, Math.round(numericBytes / 1024))} KB`;
    return `${(numericBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTimestamp = (value) => {
    const timestamp = Date.parse(String(value || ''));
    if (!Number.isFinite(timestamp)) return '';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(timestamp));
    } catch (_error) {
      return new Date(timestamp).toLocaleString();
    }
  };

  const humanizeToken = (value) =>
    String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());

  const buildQuotePreviewUrl = (form, publicToken) => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set(QUOTE_PREVIEW_QUERY_KEY, publicToken);
    const anchorId = form.closest('section[id], article[id], div[id]')?.id;
    if (anchorId) {
      currentUrl.hash = anchorId;
    }
    return `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
  };

  const createFollowupMetaItem = (label, value) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'quote-followup-meta-item';

    const term = document.createElement('dt');
    term.textContent = label;

    const description = document.createElement('dd');
    description.textContent = value;

    wrapper.appendChild(term);
    wrapper.appendChild(description);
    return wrapper;
  };

  const renderSavedAttachments = (previewRoot, attachments) => {
    if (!previewRoot) return;

    previewRoot.textContent = '';
    const normalized = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
    if (!normalized.length) {
      previewRoot.hidden = true;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'quote-file-preview-grid';

    normalized.forEach((attachment, index) => {
      const card = document.createElement('article');
      card.className = 'quote-file-preview-card quote-file-preview-card--readonly';

      const thumb = document.createElement('div');
      thumb.className = 'quote-file-preview-thumb';

      const image = document.createElement('img');
      image.src = attachment.url || '';
      image.alt = `Submitted quote photo ${index + 1}: ${attachment.name || 'Reference image'}`;
      image.loading = 'lazy';
      image.decoding = 'async';
      thumb.appendChild(image);

      const meta = document.createElement('div');
      meta.className = 'quote-file-preview-meta';

      const name = document.createElement('p');
      name.className = 'quote-file-preview-name';
      name.textContent = attachment.name || `Reference image ${index + 1}`;

      const size = document.createElement('p');
      size.className = 'quote-file-preview-size';
      size.textContent = formatFileSize(attachment.size);

      const link = document.createElement('a');
      link.className = 'quote-file-preview-link';
      link.href = attachment.url || '#';
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = 'Open image';

      meta.appendChild(name);
      meta.appendChild(size);
      meta.appendChild(link);

      card.appendChild(thumb);
      card.appendChild(meta);
      grid.appendChild(card);
    });

    previewRoot.appendChild(grid);
    previewRoot.hidden = false;
  };

  const normalizeQuotePreviewPayload = (payload, publicToken) => {
    const quote = payload?.quote && typeof payload.quote === 'object' ? payload.quote : (payload || {});
    const attachments = Array.isArray(quote.attachments)
      ? quote.attachments
      : (Array.isArray(payload?.attachments) ? payload.attachments : []);

    return {
      quoteId: quote.id || payload?.quoteId || '',
      publicToken: publicToken || payload?.publicToken || '',
      projectType: quote.projectType || payload?.projectType || '',
      location: quote.location || payload?.location || '',
      status: quote.status || payload?.status || '',
      workflowStatus: quote.workflowStatus || payload?.workflowStatus || '',
      priority: quote.priority || payload?.priority || '',
      attachmentCount: Number(quote.attachmentCount ?? payload?.attachmentCount ?? attachments.length) || 0,
      attachments,
      createdAt: quote.createdAt || payload?.createdAt || '',
      updatedAt: quote.updatedAt || payload?.updatedAt || '',
      submittedAt: quote.submittedAt || payload?.submittedAt || '',
      assignedAt: quote.assignedAt || payload?.assignedAt || '',
      convertedAt: quote.convertedAt || payload?.convertedAt || '',
      closedAt: quote.closedAt || payload?.closedAt || ''
    };
  };

  const fetchQuotePreview = async (publicToken) => {
    const response = await fetch(`/api/quotes/guest/${encodeURIComponent(publicToken)}`, {
      headers: {
        Accept: 'application/json'
      }
    });
    const responsePayload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responsePayload.error || 'Could not load this private quote link.');
    }
    return normalizeQuotePreviewPayload(responsePayload, publicToken);
  };

  const renderQuoteFollowup = (form, preview) => {
    const panel = form.querySelector('[data-quote-followup]');
    if (!panel) return;

    const title = panel.querySelector('[data-quote-followup-title]');
    const summary = panel.querySelector('[data-quote-followup-summary]');
    const meta = panel.querySelector('[data-quote-followup-meta]');
    const actions = panel.querySelector('[data-quote-followup-actions]');
    const attachmentsRoot = panel.querySelector('[data-quote-followup-attachments]');
    const previewUrl = preview.publicToken ? buildQuotePreviewUrl(form, preview.publicToken) : '';
    const statusLabel = humanizeToken(preview.workflowStatus || preview.status || 'submitted');
    const projectTypeLabel = preview.projectType ? humanizeToken(preview.projectType) : 'Project';
    const summaryBits = [
      preview.quoteId ? `Reference ${preview.quoteId}.` : 'Quote saved.',
      preview.location ? `${projectTypeLabel} in ${preview.location}.` : `${projectTypeLabel} quote.`,
      preview.publicToken ? 'Keep the private link below to review status later.' : ''
    ].filter(Boolean);

    if (title) {
      title.textContent = `Quote status: ${statusLabel}`;
    }
    if (summary) {
      summary.textContent = summaryBits.join(' ');
    }

    if (meta) {
      meta.textContent = '';
      const items = [
        ['Reference', preview.quoteId || 'Pending reference'],
        ['Workflow', statusLabel],
        preview.status ? ['Legacy status', humanizeToken(preview.status)] : null,
        preview.priority ? ['Priority', humanizeToken(preview.priority)] : null,
        preview.submittedAt ? ['Submitted', formatTimestamp(preview.submittedAt)] : null,
        preview.assignedAt ? ['Assigned', formatTimestamp(preview.assignedAt)] : null,
        preview.convertedAt ? ['Converted', formatTimestamp(preview.convertedAt)] : null,
        preview.closedAt ? ['Closed', formatTimestamp(preview.closedAt)] : null,
        ['Photos', String(preview.attachmentCount || 0)]
      ].filter(Boolean);

      items.forEach(([label, value]) => {
        meta.appendChild(createFollowupMetaItem(label, value));
      });
    }

    renderSavedAttachments(attachmentsRoot, preview.attachments);

    if (actions) {
      actions.textContent = '';
      if (previewUrl) {
        const previewLink = document.createElement('a');
        previewLink.className = 'btn-outline-gold';
        previewLink.href = previewUrl;
        previewLink.textContent = 'Open private quote link';
        actions.appendChild(previewLink);
      }

      const authLink = document.createElement('a');
      authLink.className = 'btn-outline-gold';
      authLink.href = '/auth.html';
      authLink.textContent = 'Sign in to claim later';
      actions.appendChild(authLink);
    }

    panel.hidden = false;
  };

  const renderQuoteFollowupError = (form, message) => {
    const panel = form.querySelector('[data-quote-followup]');
    if (!panel) return;
    const title = panel.querySelector('[data-quote-followup-title]');
    const summary = panel.querySelector('[data-quote-followup-summary]');
    const meta = panel.querySelector('[data-quote-followup-meta]');
    const actions = panel.querySelector('[data-quote-followup-actions]');
    const attachmentsRoot = panel.querySelector('[data-quote-followup-attachments]');

    if (title) title.textContent = 'Private quote link unavailable';
    if (summary) summary.textContent = message || 'We could not load that private quote link.';
    if (meta) meta.textContent = '';
    if (actions) actions.textContent = '';
    if (attachmentsRoot) {
      attachmentsRoot.textContent = '';
      attachmentsRoot.hidden = true;
    }
    panel.hidden = false;
  };

  const hideQuoteFollowup = (form) => {
    const panel = form.querySelector('[data-quote-followup]');
    if (!panel) return;
    const meta = panel.querySelector('[data-quote-followup-meta]');
    const actions = panel.querySelector('[data-quote-followup-actions]');
    const attachmentsRoot = panel.querySelector('[data-quote-followup-attachments]');
    if (meta) meta.textContent = '';
    if (actions) actions.textContent = '';
    if (attachmentsRoot) {
      attachmentsRoot.textContent = '';
      attachmentsRoot.hidden = true;
    }
    panel.hidden = true;
  };

  const revokePreviewUrls = (form) => {
    const urls = previewUrlsByForm.get(form) || [];
    urls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (_) {
        // Ignore browsers that reject repeated revokes.
      }
    });
    previewUrlsByForm.delete(form);
  };

  const clearFilesPreview = (form, previewRoot) => {
    revokePreviewUrls(form);
    if (!previewRoot) return;
    previewRoot.hidden = true;
    previewRoot.textContent = '';
  };

  const rebuildSelectedFiles = (filesInput, removeIndex) => {
    if (!(filesInput instanceof HTMLInputElement) || typeof DataTransfer === 'undefined') {
      return false;
    }

    const files = Array.from(filesInput.files || []);
    if (removeIndex < 0 || removeIndex >= files.length) {
      return false;
    }

    const dataTransfer = new DataTransfer();
    files.forEach((file, index) => {
      if (index !== removeIndex) {
        dataTransfer.items.add(file);
      }
    });
    filesInput.files = dataTransfer.files;
    return true;
  };

  const renderFilesPreview = (form, previewRoot, files) => {
    if (!previewRoot) return;

    clearFilesPreview(form, previewRoot);

    if (!files.length) {
      return;
    }

    const urls = [];
    const grid = document.createElement('div');
    grid.className = 'quote-file-preview-grid';

    files.forEach((file, index) => {
      const card = document.createElement('article');
      card.className = 'quote-file-preview-card';

      const thumb = document.createElement('div');
      thumb.className = 'quote-file-preview-thumb';

      const image = document.createElement('img');
      const objectUrl = URL.createObjectURL(file);
      urls.push(objectUrl);
      image.src = objectUrl;
      image.alt = `Selected quote photo ${index + 1}: ${file.name}`;
      image.loading = 'lazy';
      image.decoding = 'async';
      thumb.appendChild(image);

      const meta = document.createElement('div');
      meta.className = 'quote-file-preview-meta';

      const name = document.createElement('p');
      name.className = 'quote-file-preview-name';
      name.textContent = file.name;

      const size = document.createElement('p');
      size.className = 'quote-file-preview-size';
      size.textContent = formatFileSize(file.size);

      meta.appendChild(name);
      meta.appendChild(size);

      card.appendChild(thumb);
      card.appendChild(meta);

      if (typeof DataTransfer !== 'undefined') {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'quote-file-preview-remove';
        removeButton.textContent = 'Remove';
        removeButton.setAttribute('data-quote-file-remove-index', String(index));
        removeButton.setAttribute('aria-label', `Remove ${file.name}`);
        card.appendChild(removeButton);
      }

      grid.appendChild(card);
    });

    previewRoot.appendChild(grid);
    previewRoot.hidden = false;
    previewUrlsByForm.set(form, urls);
  };

  const syncFilesUi = (form, filesInput, filesStatus, previewRoot) => {
    const files = Array.from(filesInput?.files || []);
    if (filesStatus) {
      filesStatus.textContent = getFilesStatusText(files);
    }
    renderFilesPreview(form, previewRoot, files);
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
    const filesPreview = form.querySelector('[data-quote-file-preview]');
    if (!submitButton || !status) return;

    applyProjectTypeContext(form);
    hideQuoteFollowup(form);
    if (filesInput) {
      syncFilesUi(form, filesInput, filesStatus, filesPreview);
      filesInput.addEventListener('change', () => {
        syncFilesUi(form, filesInput, filesStatus, filesPreview);
      });
    } else if (filesStatus) {
      filesStatus.textContent = EMPTY_FILES_STATUS_TEXT;
    }

    if (filesInput && filesPreview) {
      filesPreview.addEventListener('click', (event) => {
        const removeButton = event.target.closest('[data-quote-file-remove-index]');
        if (!removeButton) return;
        const removeIndex = Number(removeButton.getAttribute('data-quote-file-remove-index'));
        if (!Number.isInteger(removeIndex)) return;
        if (!rebuildSelectedFiles(filesInput, removeIndex)) return;
        syncFilesUi(form, filesInput, filesStatus, filesPreview);
      });
    }

    form.addEventListener('reset', () => {
      setTimeout(() => {
        applyProjectTypeContext(form);
        if (filesInput) {
          syncFilesUi(form, filesInput, filesStatus, filesPreview);
        } else if (filesStatus) {
          filesStatus.textContent = EMPTY_FILES_STATUS_TEXT;
        }
      }, 0);
    });

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
      hideQuoteFollowup(form);
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
        const previewPayload = normalizeQuotePreviewPayload({
          ...responsePayload,
          quote: {
            id: responsePayload.quoteId || '',
            projectType,
            location,
            status: responsePayload.status || 'pending',
            workflowStatus: responsePayload.workflowStatus || 'submitted',
            attachmentCount: responsePayload.attachmentCount || files.length,
            attachments: responsePayload.attachments || [],
            submittedAt: new Date().toISOString()
          }
        }, responsePayload.publicToken || '');
        renderQuoteFollowup(form, previewPayload);
        if (responsePayload.publicToken) {
          const nextUrl = buildQuotePreviewUrl(form, responsePayload.publicToken);
          window.history.replaceState({}, '', nextUrl);
        }
        form.reset();
      } catch (error) {
        status.className = 'form-status is-error';
        status.textContent = error.message || 'Could not submit your consultation request.';
      } finally {
        submitButton.disabled = false;
      }
    });

    if (quotePreviewToken) {
      quotePreviewRequest ||= fetchQuotePreview(quotePreviewToken);
      quotePreviewRequest
        .then((preview) => {
          renderQuoteFollowup(form, preview);
        })
        .catch((error) => {
          renderQuoteFollowupError(form, error.message || 'Could not load this private quote link.');
        });
    }
  });
})();
