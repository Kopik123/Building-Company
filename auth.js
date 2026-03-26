(() => {
  const runtime = globalThis.LevelLinesRuntime || {};
  const brand = globalThis.LEVEL_LINES_BRAND || null;
  const TOKEN_KEY = runtime.TOKEN_KEY || 'll_auth_token';
  const USER_KEY = runtime.USER_KEY || 'll_auth_user';
  const V2_ACCESS_KEY = runtime.V2_ACCESS_KEY || 'll_v2_access_token';
  const V2_REFRESH_KEY = runtime.V2_REFRESH_KEY || 'll_v2_refresh_token';
  const QUOTE_CLAIM_STORAGE_KEY = 'll_quote_claim_pending';
  const DEFAULT_QUOTE_WORKSPACE_PATH = '/client-dashboard.html';
  const PUBLIC_QUOTE_API_BASE = '/api/v2/public/quotes';

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const profileForm = document.getElementById('profile-form');
  const passwordForm = document.getElementById('password-form');
  const loginStatus = document.getElementById('login-status');
  const registerStatus = document.getElementById('register-status');
  const profileStatus = document.getElementById('profile-status');
  const passwordStatus = document.getElementById('password-status');
  const sessionState = document.getElementById('auth-session-state');
  const accountRole = document.getElementById('auth-account-role');
  const logoutButton = document.getElementById('auth-logout');
  const accountPanel = document.getElementById('auth-account-panel');
  const quickAccessPanel = document.getElementById('auth-quick-access-panel');
  const quickAccessLinks = document.getElementById('auth-quick-access-links');
  const quickAccessRole = document.getElementById('auth-quick-access-role');
  const guestGrid = document.getElementById('auth-guest-grid');
  const quoteClaimPanel = document.getElementById('auth-quote-claim-panel');
  const quoteClaimSummary = document.getElementById('auth-quote-claim-summary');
  const quoteClaimGuestCopy = document.getElementById('auth-quote-claim-guest-copy');
  const quoteClaimForm = document.getElementById('auth-quote-claim-form');
  const quoteClaimStatus = document.getElementById('auth-quote-claim-status');
  const quoteClaimReturn = document.getElementById('auth-quote-claim-return');

  if (
    !loginForm ||
    !registerForm ||
    !profileForm ||
    !passwordForm ||
    !loginStatus ||
    !registerStatus ||
    !profileStatus ||
    !passwordStatus ||
    !sessionState ||
    !accountRole ||
    !logoutButton ||
    !accountPanel ||
    !guestGrid ||
    !quoteClaimPanel ||
    !quoteClaimSummary ||
    !quoteClaimGuestCopy ||
    !quoteClaimForm ||
    !quoteClaimStatus ||
    !quoteClaimReturn
  ) {
    return;
  }

  const parseError = runtime.parseError || ((payload) => payload?.error || 'Request failed.');
  const setStatus = runtime.setStatus || ((node, message = '', type = '') => {
    node.className = 'form-status';
    if (type === 'success') node.classList.add('is-success');
    if (type === 'error') node.classList.add('is-error');
    node.textContent = message;
  });

  const getRoleProfile = (roleRaw) => {
    const role = String(roleRaw || '').toLowerCase();
    return brand?.roleProfiles?.[role] || null;
  };

  const sanitizeInternalPath = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (!raw.startsWith('/')) return '';
    if (raw.startsWith('//')) return '';
    if (raw.includes('://')) return '';
    return raw;
  };

  const dashboardPathForRole = (roleRaw) => {
    return getRoleProfile(roleRaw)?.accountPath || '/auth.html';
  };

  const resolveNextPath = () => {
    return sanitizeInternalPath(new URLSearchParams(globalThis.location.search).get('next'));
  };

  const humanRole = (roleRaw) => {
    return getRoleProfile(roleRaw)?.label || 'User';
  };
  const humanChannel = (value) => (String(value || '').toLowerCase() === 'phone' ? 'phone' : 'email');
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

  const getManagerQuickAccessOptions = () => Array.isArray(brand?.managerQuickAccess) ? brand.managerQuickAccess : [];

  const canUseManagerWorkspace = (roleRaw) => {
    return Boolean(getRoleProfile(roleRaw)?.managerWorkspace)
      && getManagerQuickAccessOptions().some((option) => option.roles.includes(String(roleRaw || '').toLowerCase()));
  };

  const createQuickAccessLink = (option) => {
    const link = document.createElement('a');
    link.className = 'workspace-option-link';
    link.href = option.href;

    const heading = document.createElement('strong');
    heading.textContent = option.label;
    link.appendChild(heading);

    return link;
  };

  const renderQuickAccess = (user) => {
    if (!quickAccessPanel || !quickAccessLinks) {
      return;
    }

    const role = String(user?.role || '').toLowerCase();
    const showQuickAccess = canUseManagerWorkspace(role);
    quickAccessPanel.hidden = !showQuickAccess;
    quickAccessLinks.replaceChildren();

    if (quickAccessRole) {
      quickAccessRole.textContent = showQuickAccess ? humanRole(role) : '';
    }

    if (!showQuickAccess) {
      return;
    }

    const options = getManagerQuickAccessOptions().filter((option) => option.roles.includes(role));
    const fragment = document.createDocumentFragment();
    options.forEach((option) => fragment.appendChild(createQuickAccessLink(option)));
    quickAccessLinks.appendChild(fragment);
  };

  const saveSession = runtime.saveSession || ((token, user, v2Session = null) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
    const accessToken = typeof v2Session?.accessToken === 'string' ? v2Session.accessToken.trim() : '';
    const refreshToken = typeof v2Session?.refreshToken === 'string' ? v2Session.refreshToken.trim() : '';
    if (accessToken) {
      localStorage.setItem(V2_ACCESS_KEY, accessToken);
    }
    if (refreshToken) {
      localStorage.setItem(V2_REFRESH_KEY, refreshToken);
    }
    globalThis.dispatchEvent(new Event('ll:session-changed'));
  });

  const clearSession = runtime.clearSession || (() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(V2_ACCESS_KEY);
    localStorage.removeItem(V2_REFRESH_KEY);
    globalThis.dispatchEvent(new Event('ll:session-changed'));
  });

  const getSavedUser = runtime.getStoredUser || (() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  });

  const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
  const getPendingQuoteClaim = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(QUOTE_CLAIM_STORAGE_KEY) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  };
  const clearPendingQuoteClaim = () => {
    localStorage.removeItem(QUOTE_CLAIM_STORAGE_KEY);
    globalThis.dispatchEvent(new Event('ll:quote-claim-changed'));
  };
  const isPendingQuoteClaimActive = (pendingClaim) => {
    const expiresAt = Date.parse(String(pendingClaim?.expiresAt || ''));
    return Boolean(pendingClaim?.quoteId && pendingClaim?.claimToken && Number.isFinite(expiresAt) && expiresAt > Date.now());
  };
  const getQuoteClaimPreviewPath = (pendingClaim) => sanitizeInternalPath(pendingClaim?.previewUrl) || '/quote.html';
  const getQuoteClaimWorkspacePath = (pendingClaim) =>
    sanitizeInternalPath(pendingClaim?.workspacePath) || DEFAULT_QUOTE_WORKSPACE_PATH;
  const hasActivePendingQuoteClaim = () => isPendingQuoteClaimActive(getPendingQuoteClaim());

  const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(parseError(payload));
    }

    return payload;
  };

  const fillProfileForm = (user) => {
    if (!user) return;

    const nameInput = profileForm.elements.namedItem('name');
    const phoneInput = profileForm.elements.namedItem('phone');
    const companyInput = profileForm.elements.namedItem('companyName');

    if (nameInput) nameInput.value = user.name || '';
    if (phoneInput) phoneInput.value = user.phone || '';
    if (companyInput) companyInput.value = user.companyName || '';
  };

  const renderQuoteClaimPanel = (user) => {
    const pendingClaim = getPendingQuoteClaim();
    if (!pendingClaim?.quoteId || !pendingClaim?.claimToken) {
      quoteClaimPanel.hidden = true;
      setStatus(quoteClaimStatus, '');
      return;
    }

    const isActive = isPendingQuoteClaimActive(pendingClaim);
    const channel = humanChannel(pendingClaim.channel);
    const targetSuffix = pendingClaim.maskedTarget ? ` to ${pendingClaim.maskedTarget}` : '';
    const expiryLabel = formatTimestamp(pendingClaim.expiresAt);

    quoteClaimPanel.hidden = false;
    quoteClaimReturn.href = getQuoteClaimPreviewPath(pendingClaim);
    quoteClaimReturn.hidden = !quoteClaimReturn.href;
    quoteClaimSummary.textContent = isActive
      ? `Quote ${pendingClaim.quoteId} is waiting to be claimed. A 6-digit code was sent via ${channel}${targetSuffix}${expiryLabel ? ` and expires at ${expiryLabel}.` : '.'}`
      : `The saved claim code for quote ${pendingClaim.quoteId} has expired. Return to the private quote link and request a new code.`;

    if (user?.email && isActive) {
      quoteClaimGuestCopy.hidden = true;
      quoteClaimForm.hidden = false;
      setStatus(quoteClaimStatus, '');
      return;
    }

    quoteClaimForm.hidden = true;
    quoteClaimGuestCopy.hidden = false;
    quoteClaimGuestCopy.textContent = user?.email
      ? 'This saved claim code expired. Return to the private quote link and request a new code, then come back here to finish claiming the quote.'
      : 'Login or create an account below, then this panel will switch to code confirmation automatically.';
    if (!isActive) {
      setStatus(quoteClaimStatus, 'Saved quote claim code expired. Request a new one from the private quote link.', 'error');
    } else {
      setStatus(quoteClaimStatus, '');
    }
  };

  const renderSession = (user) => {
    if (user?.email) {
      const role = String(user.role || '').toLowerCase();
      const label = user.name ? `${user.name} (${user.email})` : user.email;
      sessionState.textContent = `Logged in as: ${label}`;
      accountRole.textContent = `Role: ${humanRole(role)}`;
      logoutButton.hidden = false;
      guestGrid.hidden = true;
      accountPanel.hidden = false;
      fillProfileForm(user);
      renderQuickAccess(user);
      renderQuoteClaimPanel(user);
      return;
    }

    sessionState.textContent = 'Not logged in.';
    accountRole.textContent = '';
    logoutButton.hidden = true;
    guestGrid.hidden = false;
    accountPanel.hidden = true;
    renderQuickAccess(null);
    renderQuoteClaimPanel(null);
  };

  const syncSession = async () => {
    const token = getToken();
    if (!token) {
      renderSession(null);
      return null;
    }

    try {
      const payload = await fetchJson('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      localStorage.setItem(USER_KEY, JSON.stringify(payload.user || {}));
      renderSession(payload.user);
      return payload.user || null;
    } catch {
      clearSession();
      renderSession(null);
      return null;
    }
  };

  const redirectAfterLogin = (user) => {
    const requestedNext = resolveNextPath();
    const roleDestination = dashboardPathForRole(user?.role || getSavedUser()?.role);
    const destination = requestedNext || (roleDestination === '/auth.html' ? '/client-dashboard.html' : roleDestination);
    if (!destination) return;
    globalThis.setTimeout(() => {
      globalThis.location.assign(destination);
    }, 350);
  };

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    if (!email || !password) {
      setStatus(loginStatus, 'Email and password are required.', 'error');
      return;
    }

    setStatus(loginStatus, 'Logging in...');
    setStatus(registerStatus, '');

    try {
      const payload = await fetchJson('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      saveSession(payload.token, payload.user, payload.v2Session);
      renderSession(payload.user);
      loginForm.reset();
      if (hasActivePendingQuoteClaim()) {
        setStatus(loginStatus, 'Login successful. Enter the 6-digit quote claim code below to finish linking your enquiry.', 'success');
        quoteClaimForm.elements.namedItem('claimCode')?.focus();
      } else {
        setStatus(loginStatus, 'Login successful. Redirecting to your account...', 'success');
        redirectAfterLogin(payload.user);
      }
    } catch (error) {
      setStatus(loginStatus, error.message || 'Login failed.', 'error');
    }
  });

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(registerForm);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const phone = String(formData.get('phone') || '').trim();
    const companyName = String(formData.get('companyName') || '').trim();

    if (!name || !email || !password) {
      setStatus(registerStatus, 'Name, email and password are required.', 'error');
      return;
    }

    if (password.length < 8) {
      setStatus(registerStatus, 'Password must be at least 8 characters.', 'error');
      return;
    }

    setStatus(registerStatus, 'Creating account...');
    setStatus(loginStatus, '');

    try {
      const payload = await fetchJson('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          password,
          phone: phone || undefined,
          companyName: companyName || undefined
        })
      });

      saveSession(payload.token, payload.user, payload.v2Session);
      renderSession(payload.user);
      registerForm.reset();
      if (hasActivePendingQuoteClaim()) {
        setStatus(registerStatus, 'Account created. Enter the 6-digit quote claim code below to finish linking your enquiry.', 'success');
        quoteClaimForm.elements.namedItem('claimCode')?.focus();
      } else {
        setStatus(registerStatus, 'Account created. Redirecting to your account...', 'success');
        redirectAfterLogin(payload.user);
      }
    } catch (error) {
      setStatus(registerStatus, error.message || 'Registration failed.', 'error');
    }
  });

  profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const token = getToken();
    if (!token) {
      setStatus(profileStatus, 'Please login first.', 'error');
      return;
    }

    const formData = new FormData(profileForm);
    const payload = {
      name: String(formData.get('name') || '').trim(),
      phone: String(formData.get('phone') || '').trim() || null,
      companyName: String(formData.get('companyName') || '').trim() || null
    };

    if (!payload.name) {
      setStatus(profileStatus, 'Name is required.', 'error');
      return;
    }

    setStatus(profileStatus, 'Saving profile...');

    try {
      const response = await fetchJson('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      localStorage.setItem(USER_KEY, JSON.stringify(response.user || {}));
      renderSession(response.user || {});
      setStatus(profileStatus, 'Profile updated successfully.', 'success');
    } catch (error) {
      setStatus(profileStatus, error.message || 'Could not save profile.', 'error');
    }
  });

  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const token = getToken();
    if (!token) {
      setStatus(passwordStatus, 'Please login first.', 'error');
      return;
    }

    const formData = new FormData(passwordForm);
    const currentPassword = String(formData.get('currentPassword') || '');
    const newPassword = String(formData.get('newPassword') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatus(passwordStatus, 'All password fields are required.', 'error');
      return;
    }

    if (newPassword.length < 8) {
      setStatus(passwordStatus, 'New password must be at least 8 characters.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus(passwordStatus, 'New password confirmation does not match.', 'error');
      return;
    }

    setStatus(passwordStatus, 'Updating password...');

    try {
      await fetchJson('/api/auth/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      passwordForm.reset();
      setStatus(passwordStatus, 'Password changed successfully.', 'success');
    } catch (error) {
      setStatus(passwordStatus, error.message || 'Could not change password.', 'error');
    }
  });

  quoteClaimForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const token = getToken();
    if (!token) {
      setStatus(quoteClaimStatus, 'Please login or register first.', 'error');
      return;
    }

    const pendingClaim = getPendingQuoteClaim();
    if (!pendingClaim?.quoteId || !pendingClaim?.claimToken) {
      quoteClaimPanel.hidden = true;
      setStatus(quoteClaimStatus, '');
      return;
    }

    if (!isPendingQuoteClaimActive(pendingClaim)) {
      renderQuoteClaimPanel(getSavedUser());
      return;
    }

    const formData = new FormData(quoteClaimForm);
    const claimCode = String(formData.get('claimCode') || '').trim();
    if (!/^\d{6}$/.test(claimCode)) {
      setStatus(quoteClaimStatus, 'Enter the 6-digit claim code we sent for this quote.', 'error');
      return;
    }

    setStatus(quoteClaimStatus, 'Confirming quote claim...', 'loading');

    try {
      const response = await fetchJson(`${PUBLIC_QUOTE_API_BASE}/${encodeURIComponent(pendingClaim.quoteId)}/claim/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          claimToken: pendingClaim.claimToken,
          claimCode
        })
      });

      clearPendingQuoteClaim();
      quoteClaimForm.reset();
      quoteClaimForm.hidden = true;
      quoteClaimGuestCopy.hidden = true;
      quoteClaimReturn.hidden = true;
      quoteClaimSummary.textContent = `Quote ${response.quoteId || pendingClaim.quoteId} is now linked to your account. Opening the quotes workspace...`;
      setStatus(quoteClaimStatus, 'Quote claimed successfully. Redirecting to your quotes workspace...', 'success');

      globalThis.setTimeout(() => {
        globalThis.location.assign(getQuoteClaimWorkspacePath(pendingClaim));
      }, 400);
    } catch (error) {
      setStatus(quoteClaimStatus, error.message || 'Could not confirm the quote claim.', 'error');
    }
  });

  logoutButton.addEventListener('click', () => {
    clearSession();
    setStatus(loginStatus, '');
    setStatus(registerStatus, '');
    setStatus(profileStatus, '');
    setStatus(passwordStatus, '');
    renderSession(null);
    globalThis.location.assign('/auth.html');
  });

  renderSession(getSavedUser());
  syncSession();
})();
