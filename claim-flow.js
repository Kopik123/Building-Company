(() => {
  const runtime = window.LevelLinesRuntime || {};
  const TOKEN_KEY = runtime.TOKEN_KEY || 'll_auth_token';

  const fetchJson = async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    const token = typeof options.token === 'string' ? options.token : (localStorage.getItem(TOKEN_KEY) || '');
    if (!headers.has('Authorization') && token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetch(url, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || 'Request failed.');
    }
    return payload;
  };

  const readClaimDraftFromSearch = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      quoteId: String(params.get('claimQuoteId') || '').trim(),
      claimToken: String(params.get('claimToken') || '').trim(),
      claimCode: String(params.get('claimCode') || '').trim()
    };
  };

  const hasClaimDraft = (draft) => Boolean(draft?.quoteId && draft?.claimToken && draft?.claimCode);

  const buildAuthClaimUrl = ({ quoteId, claimToken, claimCode, next }) => {
    const params = new URLSearchParams();
    if (quoteId) params.set('claimQuoteId', String(quoteId));
    if (claimToken) params.set('claimToken', String(claimToken));
    if (claimCode) params.set('claimCode', String(claimCode));
    if (next) params.set('next', String(next));
    const query = params.toString();
    return `/auth.html${query ? `?${query}` : ''}`;
  };

  const clearClaimDraftFromSearch = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('claimQuoteId');
    url.searchParams.delete('claimToken');
    url.searchParams.delete('claimCode');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const submitClaimConfirmation = async ({ quoteId, claimToken, claimCode, token }) => {
    if (!quoteId || !claimToken || !claimCode) {
      throw new Error('Quote claim details are incomplete.');
    }
    const normalizedQuoteId = String(quoteId).trim();
    const normalizedClaimToken = String(claimToken).trim();
    const normalizedClaimCode = String(claimCode).trim();
    if (!/^[0-9a-f-]{36}$/i.test(normalizedQuoteId)) {
      throw new Error('Quote reference format is invalid.');
    }
    if (!/^[0-9a-f]{16,}$/i.test(normalizedClaimToken)) {
      throw new Error('Claim token format is invalid.');
    }
    if (!/^[0-9A-Fa-f]{8}$/.test(normalizedClaimCode)) {
      throw new Error('Claim code must be an 8-character code.');
    }
    return fetchJson(`/api/quotes/guest/${encodeURIComponent(String(quoteId))}/claim/confirm`, {
      method: 'POST',
      token,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        claimToken: normalizedClaimToken,
        claimCode: normalizedClaimCode
      })
    });
  };

  window.LevelLinesQuoteClaim = {
    buildAuthClaimUrl,
    clearClaimDraftFromSearch,
    hasClaimDraft,
    readClaimDraftFromSearch,
    submitClaimConfirmation
  };
})();
