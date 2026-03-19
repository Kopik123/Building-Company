(() => {
  const createClientDashboardShellController = ({
    runtime,
    state,
    el,
    tokenKey,
    userKey,
    overviewController,
    messagesController,
    requestAccordionRefresh
  } = {}) => {
    if (!state || !el) return null;

    const clearSession = () => {
      (runtime.clearSession || (() => {
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(userKey);
      }))();
      state.token = '';
      state.user = null;
    };

    const getStoredUser = runtime.getStoredUser || (() => {
      try {
        return JSON.parse(localStorage.getItem(userKey) || 'null');
      } catch {
        return null;
      }
    });

    const waitForStoredUser = runtime.waitForStoredUser || ((timeoutMs = 900) =>
      new Promise((resolve) => {
        const startedAt = Date.now();
        const tick = () => {
          const user = getStoredUser();
          if (user && user.role) {
            resolve(user);
            return;
          }

          if (Date.now() - startedAt >= timeoutMs || !localStorage.getItem(tokenKey)) {
            resolve(null);
            return;
          }

          window.setTimeout(tick, 60);
        };
        tick();
      }));

    const bootstrap = async () => {
      const loginUrl = `/auth.html?next=${encodeURIComponent('/client-dashboard.html')}`;
      overviewController?.renderOperationsShell?.();
      state.token = localStorage.getItem(tokenKey) || '';
      if (!state.token) {
        el.session.textContent = 'No active session. Redirecting to login...';
        window.setTimeout(() => {
          window.location.assign(loginUrl);
        }, 700);
        return;
      }

      try {
        state.user = getStoredUser() || await waitForStoredUser();
        const role = String(state.user?.role || '').toLowerCase();
        if (role !== 'client') {
          clearSession();
          el.session.textContent = 'Session expired. Redirecting to login...';
          window.setTimeout(() => {
            window.location.assign(loginUrl);
          }, 700);
          return;
        }

        el.session.textContent = `Logged as ${state.user.name || state.user.email} (${state.user.role})`;
        await overviewController?.loadOverview?.();
        messagesController?.setupLazySections?.();
        requestAccordionRefresh?.();
      } catch (error) {
        clearSession();
        el.session.textContent = error.message || 'Session expired. Redirecting to login...';
        window.setTimeout(() => {
          window.location.assign(loginUrl);
        }, 700);
      }
    };

    const bindEvents = () => {
      el.logout.addEventListener('click', () => {
        clearSession();
        window.location.href = '/auth.html';
      });
    };

    return {
      bindEvents,
      bootstrap,
      clearSession
    };
  };

  window.LevelLinesClientDashboardShell = {
    createClientDashboardShellController
  };
})();
