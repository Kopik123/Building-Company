(() => {
  const TOKEN_KEY = 'll_auth_token';
  const USER_KEY = 'll_auth_user';

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginStatus = document.getElementById('login-status');
  const registerStatus = document.getElementById('register-status');
  const sessionState = document.getElementById('auth-session-state');
  const logoutButton = document.getElementById('auth-logout');
  const clientLink = document.getElementById('auth-client-link');
  const dashboardLink = document.getElementById('auth-dashboard-link');

  if (!loginForm || !registerForm || !loginStatus || !registerStatus || !sessionState || !logoutButton || !clientLink || !dashboardLink) return;

  const parseError = (payload) => {
    if (payload?.error) return payload.error;
    if (Array.isArray(payload?.errors) && payload.errors.length) {
      return payload.errors.map((item) => item?.msg).filter(Boolean).join(', ');
    }

    return 'Request failed.';
  };

  const setStatus = (node, message, type) => {
    node.className = 'form-status';
    if (type === 'success') node.classList.add('is-success');
    if (type === 'error') node.classList.add('is-error');
    node.textContent = message || '';
  };

  const saveSession = (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
  };

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const getSavedUser = () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  };

  const getToken = () => localStorage.getItem(TOKEN_KEY) || '';

  const renderSession = (user) => {
    if (user?.email) {
      const label = user.name ? `${user.name} (${user.email})` : user.email;
      sessionState.textContent = `Logged in as: ${label}`;
      logoutButton.hidden = false;
      const role = String(user.role || '').toLowerCase();
      clientLink.hidden = role !== 'client';
      dashboardLink.hidden = !['employee', 'manager', 'admin'].includes(role);
      return;
    }

    sessionState.textContent = 'Not logged in.';
    logoutButton.hidden = true;
    clientLink.hidden = true;
    dashboardLink.hidden = true;
  };

  const fetchJson = async (url, options) => {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(parseError(payload));
    }

    return payload;
  };

  const syncSession = async () => {
    const token = getToken();
    if (!token) {
      renderSession(null);
      return;
    }

    try {
      const payload = await fetchJson('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      renderSession(payload.user);
      localStorage.setItem(USER_KEY, JSON.stringify(payload.user || {}));
    } catch {
      clearSession();
      renderSession(null);
    }
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

    try {
      const payload = await fetchJson('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      saveSession(payload.token, payload.user);
      renderSession(payload.user);
      setStatus(loginStatus, 'Login successful.', 'success');
      loginForm.reset();
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

      saveSession(payload.token, payload.user);
      renderSession(payload.user);
      setStatus(registerStatus, 'Account created and logged in.', 'success');
      registerForm.reset();
    } catch (error) {
      setStatus(registerStatus, error.message || 'Registration failed.', 'error');
    }
  });

  logoutButton.addEventListener('click', () => {
    clearSession();
    setStatus(loginStatus, '');
    setStatus(registerStatus, '');
    renderSession(null);
  });

  renderSession(getSavedUser());
  syncSession();
})();
