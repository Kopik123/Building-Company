(() => {
  const runtime = globalThis.LevelLinesRuntime || {};
  const forms = document.querySelectorAll('.quote-form');
  if (!forms.length) return;
  const MAX_QUOTE_PHOTOS = 8;
  const EMPTY_FILES_STATUS_TEXT = 'Optional: attach up to 8 reference photos.';
  const QUOTE_PREVIEW_QUERY_KEY = 'quote';
  const QUOTE_CLAIM_STORAGE_KEY = 'll_quote_claim_pending';
  const QUOTE_WORKSPACE_PATH = '/client-dashboard.html';
  const TOKEN_KEY = runtime.TOKEN_KEY || 'll_auth_token';
  const USER_KEY = runtime.USER_KEY || 'll_auth_user';
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
  const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
  const normalizePhone = (value) => String(value || '').trim();
  const setStatus = (node, message = '', type = '') => {
    if (!node) return;
    node.className = 'form-status';
    if (type === 'success') node.classList.add('is-success');
    if (type === 'error') node.classList.add('is-error');
    if (type === 'loading') node.classList.add('is-loading');
    node.textContent = message;
  };
  const getSavedUser = () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  };
  const hasSessionToken = () => Boolean(localStorage.getItem(TOKEN_KEY));
  const getPendingQuoteClaim = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(QUOTE_CLAIM_STORAGE_KEY) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  };
  const savePendingQuoteClaim = (payload) => {
    localStorage.setItem(QUOTE_CLAIM_STORAGE_KEY, JSON.stringify(payload || {}));
    globalThis.dispatchEvent(new Event('ll:quote-claim-changed'));
  };
  const isPendingQuoteClaimActive = (pendingClaim) => {
    const expiresAt = Date.parse(String(pendingClaim?.expiresAt || ''));
    return Boolean(pendingClaim?.quoteId && pendingClaim?.claimToken && Number.isFinite(expiresAt) && expiresAt > Date.now());
  };
  const buildAuthClaimUrl = () => {
    const authUrl = new URL('/auth.html', window.location.origin);
    authUrl.searchParams.set('next', QUOTE_WORKSPACE_PATH);
    return `${authUrl.pathname}${authUrl.search}`;
  };

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
      canClaim: Boolean(quote.canClaim ?? payload?.canClaim ?? true),
      claimChannels: Array.isArray(quote.claimChannels)
        ? quote.claimChannels.filter(Boolean)
        : (Array.isArray(payload?.claimChannels) ? payload.claimChannels.filter(Boolean) : []),
      maskedGuestEmail: quote.maskedGuestEmail || payload?.maskedGuestEmail || '',
      maskedGuestPhone: quote.maskedGuestPhone || payload?.maskedGuestPhone || '',
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

  const buildClaimContactHint = (preview, channel) => {
    if (channel === 'email') {
      return preview.maskedGuestEmail
        ? `Use the same email used for this quote (${preview.maskedGuestEmail}).`
        : 'Use the same email used for this quote.';
    }

    return preview.maskedGuestPhone
      ? `Use the same phone used for this quote (${preview.maskedGuestPhone}).`
      : 'Use the same phone used for this quote.';
  };

  const createQuoteClaimPanel = ({ preview, previewUrl, guestEmail = '', guestPhone = '' }) => {
    const availableChannels = [...new Set([
      ...(Array.isArray(preview.claimChannels) ? preview.claimChannels : []),
      guestEmail ? 'email' : null,
      guestPhone ? 'phone' : null
    ].filter(Boolean))];

    if (!preview.canClaim || !preview.quoteId || !availableChannels.length) {
      return null;
    }

    const currentUser = getSavedUser();
    const pendingClaim = getPendingQuoteClaim();
    const hasActivePendingClaim = pendingClaim?.quoteId === preview.quoteId && isPendingQuoteClaimActive(pendingClaim);
    const wrapper = document.createElement('section');
    wrapper.className = 'quote-claim-card';

    const heading = document.createElement('div');
    heading.className = 'quote-claim-head';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'section-eyebrow section-eyebrow--compact';
    eyebrow.textContent = 'Claim Quote';

    const title = document.createElement('h4');
    title.textContent = 'Link this private quote to your account.';

    const intro = document.createElement('p');
    intro.className = 'page-aside-copy';
    intro.textContent = 'We send a 6-digit code to the same contact you used for this quote. After login or registration, confirm the code in your account.';

    heading.appendChild(eyebrow);
    heading.appendChild(title);
    heading.appendChild(intro);

    const form = document.createElement('form');
    form.className = 'quote-claim-form';
    form.noValidate = true;

    const controls = document.createElement('div');
    controls.className = 'quote-claim-grid';

    const channelLabel = document.createElement('label');
    channelLabel.textContent = 'Delivery channel';
    const channelSelect = document.createElement('select');
    channelSelect.name = 'channel';
    availableChannels.forEach((channel) => {
      const option = document.createElement('option');
      option.value = channel;
      option.textContent = channel === 'email' ? 'Email' : 'Phone';
      channelSelect.appendChild(option);
    });
    channelLabel.appendChild(channelSelect);

    const contactLabel = document.createElement('label');
    contactLabel.className = 'quote-claim-contact-label';
    const contactLabelText = document.createElement('span');
    contactLabelText.textContent = 'Quote email';
    const contactInput = document.createElement('input');
    contactInput.required = true;
    contactLabel.appendChild(contactLabelText);
    contactLabel.appendChild(contactInput);

    controls.appendChild(channelLabel);
    controls.appendChild(contactLabel);

    const hint = document.createElement('p');
    hint.className = 'quote-claim-hint';

    const actionRow = document.createElement('div');
    actionRow.className = 'quote-claim-actions';

    const requestButton = document.createElement('button');
    requestButton.type = 'submit';
    requestButton.className = 'btn-outline-gold';
    requestButton.textContent = hasActivePendingClaim ? 'Send new claim code' : 'Send claim code';

    const accountLink = document.createElement('a');
    accountLink.className = 'btn-outline-gold';
    accountLink.href = buildAuthClaimUrl();
    accountLink.textContent = currentUser?.email || hasSessionToken()
      ? 'Open account to confirm code'
      : 'Login or register to confirm';

    actionRow.appendChild(requestButton);
    actionRow.appendChild(accountLink);

    const status = document.createElement('p');
    status.className = 'form-status';

    const syncClaimField = () => {
      const channel = channelSelect.value === 'phone' ? 'phone' : 'email';
      if (channel === 'phone') {
        contactLabelText.textContent = 'Quote phone';
        contactInput.type = 'tel';
        contactInput.name = 'guestPhone';
        contactInput.autocomplete = 'tel';
        contactInput.inputMode = 'tel';
        contactInput.value = guestPhone || '';
      } else {
        contactLabelText.textContent = 'Quote email';
        contactInput.type = 'email';
        contactInput.name = 'guestEmail';
        contactInput.autocomplete = 'email';
        contactInput.inputMode = 'email';
        contactInput.value = guestEmail || '';
      }
      contactInput.placeholder = buildClaimContactHint(preview, channel);
      hint.textContent = buildClaimContactHint(preview, channel);
    };

    if (hasActivePendingClaim && pendingClaim.channel && availableChannels.includes(pendingClaim.channel)) {
      channelSelect.value = pendingClaim.channel;
    }
    if (availableChannels.length === 1) {
      channelLabel.hidden = true;
    }
    syncClaimField();

    if (hasActivePendingClaim) {
      const pendingChannelLabel = humanizeToken(pendingClaim.channel);
      const pendingTarget = pendingClaim.maskedTarget ? ` to ${pendingClaim.maskedTarget}` : '';
      setStatus(
        status,
        `A claim code is already active for this quote. Check your ${pendingChannelLabel.toLowerCase()}${pendingTarget} and confirm it in your account before ${formatTimestamp(pendingClaim.expiresAt)}.`,
        'success'
      );
    }

    channelSelect.addEventListener('change', () => {
      syncClaimField();
      setStatus(status, '');
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const channel = channelSelect.value === 'phone' ? 'phone' : 'email';
      const contactValue = channel === 'phone'
        ? normalizePhone(contactInput.value)
        : normalizeEmail(contactInput.value);

      if (!contactValue) {
        setStatus(
          status,
          channel === 'phone' ? 'Enter the phone number used for this quote.' : 'Enter the email used for this quote.',
          'error'
        );
        return;
      }

      requestButton.disabled = true;
      setStatus(status, 'Sending claim code...', 'loading');

      try {
        const response = await fetch(`/api/quotes/guest/${encodeURIComponent(preview.quoteId)}/claim/request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify(channel === 'phone'
            ? { channel, guestPhone: contactValue }
            : { channel, guestEmail: contactValue })
        });
        const responsePayload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(responsePayload.error || 'Could not send the quote claim code.');
        }

        const maskedTarget = responsePayload.maskedTarget || (channel === 'phone' ? preview.maskedGuestPhone : preview.maskedGuestEmail) || '';
        savePendingQuoteClaim({
          quoteId: preview.quoteId,
          claimToken: responsePayload.claimToken || '',
          channel,
          maskedTarget,
          expiresAt: responsePayload.expiresAt || '',
          previewUrl: previewUrl || '',
          workspacePath: QUOTE_WORKSPACE_PATH,
          publicToken: preview.publicToken || ''
        });

        setStatus(
          status,
          `Claim code sent via ${channel}. ${maskedTarget ? `Target: ${maskedTarget}. ` : ''}Open your account and confirm the 6-digit code before ${formatTimestamp(responsePayload.expiresAt)}.`,
          'success'
        );
        accountLink.textContent = 'Open account to confirm code';
      } catch (error) {
        setStatus(status, error.message || 'Could not send the quote claim code.', 'error');
      } finally {
        requestButton.disabled = false;
      }
    });

    form.appendChild(controls);
    form.appendChild(hint);
    form.appendChild(actionRow);
    form.appendChild(status);
    wrapper.appendChild(heading);
    wrapper.appendChild(form);
    return wrapper;
  };

  const renderQuoteFollowup = (form, preview, options = {}) => {
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
      const primaryActions = document.createElement('div');
      primaryActions.className = 'quote-followup-actions-row';
      if (previewUrl) {
        const previewLink = document.createElement('a');
        previewLink.className = 'btn-outline-gold';
        previewLink.href = previewUrl;
        previewLink.textContent = 'Open private quote link';
        primaryActions.appendChild(previewLink);
      }

      const authLink = document.createElement('a');
      authLink.className = 'btn-outline-gold';
      authLink.href = buildAuthClaimUrl();
      authLink.textContent = hasSessionToken() ? 'Open account' : 'Login or register';
      primaryActions.appendChild(authLink);
      actions.appendChild(primaryActions);

      const claimPanel = createQuoteClaimPanel({
        preview,
        previewUrl,
        guestEmail: normalizeEmail(options.guestEmail),
        guestPhone: normalizePhone(options.guestPhone)
      });
      if (claimPanel) {
        actions.appendChild(claimPanel);
      }
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
        renderQuoteFollowup(form, previewPayload, {
          guestEmail,
          guestPhone
        });
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
