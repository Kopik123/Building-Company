(() => {
  const runtime = window.LevelLinesRuntime || {};
  const forms = document.querySelectorAll('.quote-form');
  if (!forms.length) return;

  const resultPanel = document.querySelector('[data-quote-result]');
  const resultTitle = document.querySelector('[data-quote-result-title]');
  const resultReference = document.querySelector('[data-quote-result-reference]');
  const resultMessage = document.querySelector('[data-quote-result-message]');
  const resultClaimWrap = document.querySelector('[data-quote-result-claim-wrap]');
  const resultClaimCode = document.querySelector('[data-quote-result-claim-code]');
  const resultClaimExpiry = document.querySelector('[data-quote-result-claim-expiry]');
  const resultClaimWarning = document.querySelector('[data-quote-result-claim-warning]');
  const resultAuthLink = document.querySelector('[data-quote-result-auth-link]');
  const resultDashboardLink = document.querySelector('[data-quote-result-dashboard-link]');
  const claimForm = document.querySelector('[data-quote-claim-form]');
  const claimHelper = document.querySelector('[data-quote-claim-helper]');
  const claimStatus = document.querySelector('[data-quote-claim-status]');
  const TOKEN_KEY = runtime.TOKEN_KEY || 'll_auth_token';
  const quoteClaim = window.LevelLinesQuoteClaim || {};
  const claimState = { quoteId: '', claimToken: '', claimCode: '' };

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

  const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
  const getStoredUser = runtime.getStoredUser || (() => {
    try {
      return JSON.parse(localStorage.getItem(runtime.USER_KEY || 'll_auth_user') || 'null');
    } catch {
      return null;
    }
  });
  const api = runtime.createApiClient ? runtime.createApiClient(getToken) : async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    const token = getToken();
    if (!headers.has('Authorization') && token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Request failed.');
    return payload;
  };
  const formatDateTime = runtime.formatDateTime || ((value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleString('en-GB');
  });
  const setStatus = runtime.setStatus || ((node, message = '', type = '') => {
    if (!node) return;
    node.className = 'form-status';
    if (type === 'success') node.classList.add('is-success');
    if (type === 'error') node.classList.add('is-error');
    if (type === 'loading') node.classList.add('is-loading');
    node.textContent = message;
  });

  const updateClaimSessionCopy = () => {
    if (!claimForm || !claimHelper) return;
    claimHelper.textContent = getToken()
      ? 'Your account session is active. Confirm this guest quote into your account now.'
      : 'Login above first, then confirm this guest quote into your account here.';
  };

  const setClaimFormValues = ({ quoteId, claimToken, claimCode }) => {
    if (!claimForm) return;
    claimState.quoteId = String(quoteId || '').trim();
    claimState.claimToken = String(claimToken || '').trim();
    claimState.claimCode = String(claimCode || '').trim();
    claimForm.elements.quoteId.value = claimState.quoteId;
    claimForm.elements.claimToken.value = claimState.claimToken;
    claimForm.elements.claimCode.value = claimState.claimCode;
    claimForm.hidden = !(claimState.quoteId && claimState.claimToken && claimState.claimCode);
    updateClaimSessionCopy();
  };

  const renderResult = ({ quoteId, message, claimToken, claimCode, claimCodeExpiresAt, claimCodeWarning, authenticated }) => {
    if (!resultPanel) return;
    resultPanel.hidden = false;
    resultTitle.textContent = authenticated ? 'Quote added to your account.' : 'Quote saved. Keep your claim code.';
    resultReference.textContent = quoteId ? `Reference: ${quoteId}` : '';
    resultMessage.textContent = message || '';

    if (authenticated) {
      resultClaimWrap.hidden = true;
      if (claimForm) claimForm.hidden = true;
      resultDashboardLink.hidden = false;
      resultAuthLink.hidden = true;
    } else {
      resultClaimWrap.hidden = false;
      resultClaimCode.textContent = claimCode || '-';
      resultClaimExpiry.textContent = claimCodeExpiresAt ? `Valid until: ${formatDateTime(claimCodeExpiresAt)}` : '';
      resultClaimWarning.textContent = claimCodeWarning || 'Save this code now. It will not be shown again.';
      setClaimFormValues({ quoteId, claimToken, claimCode });
      if (resultAuthLink && quoteClaim.buildAuthClaimUrl) {
        resultAuthLink.href = quoteClaim.buildAuthClaimUrl({
          quoteId,
          claimToken,
          claimCode,
          next: `/client-review.html?quoteId=${encodeURIComponent(String(quoteId || ''))}`
        });
      }
      resultAuthLink.hidden = false;
      resultDashboardLink.hidden = true;
    }
  };

  if (claimForm) {
    claimForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!getToken()) {
        setStatus(claimStatus, 'Login above first or use the auth page claim flow.', 'error');
        return;
      }

      const quoteId = String(claimForm.elements.quoteId.value || '').trim();
      const claimToken = String(claimForm.elements.claimToken.value || '').trim();
      const claimCode = String(claimForm.elements.claimCode.value || '').trim();
      if (!quoteId || !claimToken || !claimCode) {
        setStatus(claimStatus, 'Quote claim details are incomplete.', 'error');
        return;
      }

      setStatus(claimStatus, 'Claiming quote...', 'loading');
      try {
        await quoteClaim.submitClaimConfirmation({
          quoteId,
          claimToken,
          claimCode,
          token: getToken()
        });
        setStatus(claimStatus, 'Quote claimed. Redirecting to the review screen...', 'success');
        globalThis.setTimeout(() => {
          globalThis.location.assign(`/client-review.html?quoteId=${encodeURIComponent(quoteId)}`);
        }, 350);
      } catch (error) {
        setStatus(claimStatus, error.message || 'Could not claim quote.', 'error');
      }
    });
    updateClaimSessionCopy();
    window.addEventListener('ll:session-changed', updateClaimSessionCopy);
  }

  forms.forEach((form) => {
    const submitButton = form.querySelector('button[type="submit"]');
    const status = form.querySelector('.form-status');
    if (!submitButton || !status) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const user = getStoredUser();
      const token = getToken();
      const isAuthenticated = Boolean(user?.role && token);
      const guestName = String(formData.get('name') || '').trim();
      const guestPhone = String(formData.get('phone') || '').trim();
      const guestEmail = String(formData.get('email') || '').trim();
      const projectTypeRaw = formData.get('projectType') || formData.get('project-type');
      const projectType = normalizeProjectType(projectTypeRaw);
      const budgetRange = String(formData.get('budget') || '').trim();
      const description = String(formData.get('message') || '').trim();
      const location = String(formData.get('location') || '').trim() || 'Greater Manchester';
      const postcode = String(formData.get('postcode') || '').trim();

      status.className = 'form-status';
      status.textContent = '';
      if (!description) {
        status.classList.add('is-error');
        status.textContent = 'Please provide your project details.';
        return;
      }
      if (!isAuthenticated && (!guestName || (!guestPhone && !guestEmail))) {
        status.classList.add('is-error');
        status.textContent = 'Please provide your name, project details, and either email or phone.';
        return;
      }

      submitButton.disabled = true;
      status.classList.add('is-loading');
      status.textContent = isAuthenticated ? 'Sending your request into your account...' : 'Sending your request...';

      try {
        const payload = isAuthenticated
          ? {
            projectType,
            budgetRange: budgetRange || undefined,
            description,
            location,
            postcode: postcode || undefined
          }
          : {
            guestName,
            guestPhone: guestPhone || undefined,
            guestEmail: guestEmail || undefined,
            projectType,
            budgetRange: budgetRange || undefined,
            description,
            location,
            postcode: postcode || undefined
          };

        const responsePayload = await api(isAuthenticated ? '/api/quotes' : '/api/quotes/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        status.className = 'form-status is-success';
        status.textContent = isAuthenticated
          ? 'Quote added to your account.'
          : 'Request sent. Save the claim code shown below.';
        renderResult({
          quoteId: responsePayload.quoteId,
          message: isAuthenticated
            ? 'You are signed in, so this quote is already attached to your account and ready for manager review.'
            : 'This quote was created without an account. Keep the claim code so you can attach it to your account later.',
          claimToken: responsePayload.claimToken,
          claimCode: responsePayload.claimCode,
          claimCodeExpiresAt: responsePayload.claimCodeExpiresAt,
          claimCodeWarning: responsePayload.claimCodeWarning,
          authenticated: isAuthenticated
        });
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
