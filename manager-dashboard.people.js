(() => {
  const createManagerPeopleController = ({
    state,
    el,
    api,
    buildQuery,
    createMutedNode,
    setStatus,
    escapeHtml,
    renderOperationsShell
  }) => {
    const renderClients = () => {
      el.clientsList.innerHTML = '';
      if (!state.clients.length) {
        el.clientsList.innerHTML = '<p class="muted">No clients found for the current search.</p>';
        renderOperationsShell();
        return;
      }

      const frag = document.createDocumentFragment();
      state.clients.forEach((client) => {
        const card = document.createElement('article');
        card.className = 'dashboard-item';
        card.innerHTML = `<h3>${escapeHtml(client.name || client.email || 'Client')}</h3><p class="muted">${escapeHtml(client.email || '-')} ${client.phone ? `| ${escapeHtml(client.phone)}` : ''}</p>`;
        frag.appendChild(card);
      });
      el.clientsList.appendChild(frag);
      renderOperationsShell();
    };

    const renderStaff = () => {
      el.staffList.innerHTML = '';
      if (!state.staff.length) {
        el.staffList.innerHTML = '<p class="muted">No staff found for the current search.</p>';
        renderOperationsShell();
        return;
      }

      const frag = document.createDocumentFragment();
      state.staff.forEach((member) => {
        const card = document.createElement('article');
        card.className = 'dashboard-item';
        card.innerHTML = `<h3>${escapeHtml(member.name || member.email || 'Staff member')}</h3><p class="muted">${escapeHtml(member.email || '-')} | ${escapeHtml(member.role || 'employee')}</p>`;
        frag.appendChild(card);
      });
      el.staffList.appendChild(frag);
      renderOperationsShell();
    };

    const loadClients = async () => {
      const payload = await api(`/api/manager/clients/search?${buildQuery({
        q: state.clientsQuery.q,
        pageSize: 25
      })}`);
      state.clients = Array.isArray(payload.clients) ? payload.clients : [];
      renderClients();
    };

    const loadStaff = async () => {
      const payload = await api(`/api/manager/staff/search?${buildQuery({
        q: state.staffQuery.q,
        pageSize: 25
      })}`);
      state.staff = Array.isArray(payload.staff) ? payload.staff : [];
      renderStaff();
    };

    const applyClientsFiltersFromUI = () => {
      state.clientsQuery.q = String(el.clientsFilterQ.value || '').trim();
    };

    const applyStaffFiltersFromUI = () => {
      state.staffQuery.q = String(el.staffFilterQ.value || '').trim();
    };

    const loadClientsIfNeeded = async () => {
      if (state.lazyLoaded.clients) return;
      state.lazyLoaded.clients = true;
      await loadClients();
    };

    const loadStaffIfNeeded = async () => {
      if (state.lazyLoaded.staff) return;
      state.lazyLoaded.staff = true;
      await loadStaff();
    };

    const createStaffMember = async (event) => {
      event.preventDefault();
      setStatus(el.staffCreateStatus, 'Creating staff member...');
      const f = el.staffCreateForm.elements;
      const payload = {
        name: String(f.name.value || '').trim(),
        email: String(f.email.value || '').trim().toLowerCase(),
        password: String(f.password.value || ''),
        role: String(f.role.value || 'employee'),
        phone: String(f.phone.value || '').trim()
      };
      if (!payload.name || !payload.email || !payload.password) {
        return setStatus(el.staffCreateStatus, 'Name, email and password are required.', 'error');
      }
      try {
        await api('/api/manager/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        setStatus(el.staffCreateStatus, 'Staff member created.', 'success');
        el.staffCreateForm.reset();
        f.role.value = 'employee';
        state.lazyLoaded.staff = true;
        await loadStaff();
      } catch (error) {
        setStatus(el.staffCreateStatus, error.message || 'Failed to create staff member.', 'error');
      }
    };

    const bindEvents = () => {
      el.clientsRefresh.addEventListener('click', () => {
        applyClientsFiltersFromUI();
        loadClients().catch((error) => globalThis.alert(error.message || 'Could not load clients'));
      });
      el.staffRefresh.addEventListener('click', () => {
        applyStaffFiltersFromUI();
        loadStaff().catch((error) => globalThis.alert(error.message || 'Could not load staff'));
      });
      el.staffCreateForm.addEventListener('submit', (event) => {
        createStaffMember(event).catch((error) => {
          setStatus(el.staffCreateStatus, error.message || 'Failed to create staff member.', 'error');
        });
      });
    };

    return {
      renderClients,
      renderStaff,
      loadClients,
      loadStaff,
      applyClientsFiltersFromUI,
      applyStaffFiltersFromUI,
      loadClientsIfNeeded,
      loadStaffIfNeeded,
      bindEvents
    };
  };

  globalThis.LevelLinesManagerPeople = {
    createManagerPeopleController
  };
})();
