(() => {
  const createManagerQuotesController = ({
    state,
    el,
    api,
    buildQuery,
    syncKeyedList,
    createMutedNode,
    renderPagination,
    createControlField,
    createEditActions,
    escapeHtml,
    renderOperationsShell
  }) => {
    const canManageQuotes = () => ['manager', 'admin'].includes(String(state.user?.role || '').toLowerCase());

    const createQuoteCard = () => {
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      const heading = document.createElement('h3');
      heading.className = 'dashboard-item-title';
      const meta = document.createElement('p');
      meta.className = 'muted';
      const description = document.createElement('p');
      const controls = document.createElement('div');
      controls.className = 'dashboard-edit-grid';
      card.appendChild(heading);
      card.appendChild(meta);
      card.appendChild(description);
      card.appendChild(controls);
      return card;
    };

    const renderQuotes = () => {
      if (!state.quotes.length) {
        syncKeyedList(el.quotesList, [], {
          getKey: () => '',
          createNode: createQuoteCard,
          updateNode: () => {},
          createEmptyNode: () => createMutedNode('No quotes found for current filters.')
        });
        renderPagination(el.quotesPagination, el.quotesPrev, el.quotesNext, state.quotesPagination);
        renderOperationsShell();
        return;
      }

      syncKeyedList(el.quotesList, state.quotes, {
        getKey: (quote) => quote.id,
        createNode: createQuoteCard,
        updateNode: (card, quote) => {
          const owner = quote.guestName || quote.client?.name || quote.client?.email || 'Unknown client';
          card.children[0].textContent = `${escapeHtml(quote.projectType)} | ${escapeHtml(owner)}`;
          card.children[1].textContent = `${escapeHtml(quote.status)} | priority ${escapeHtml(quote.priority)} | ${escapeHtml(quote.location || '-')} ${escapeHtml(quote.postcode || '')}`;
          card.children[2].textContent = quote.description || '';

          const controls = card.children[3];
          controls.replaceChildren();

          const statusSelect = document.createElement('select');
          ['pending', 'in_progress', 'responded', 'closed'].forEach((value) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            option.selected = quote.status === value;
            statusSelect.appendChild(option);
          });

          const prioritySelect = document.createElement('select');
          ['low', 'medium', 'high'].forEach((value) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            option.selected = quote.priority === value;
            prioritySelect.appendChild(option);
          });

          const saveBtn = document.createElement('button');
          saveBtn.type = 'button';
          saveBtn.className = 'btn btn-gold';
          saveBtn.textContent = 'Save';
          saveBtn.disabled = !canManageQuotes();
          saveBtn.addEventListener('click', async () => {
            try {
              await api(`/api/manager/quotes/${quote.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: statusSelect.value, priority: prioritySelect.value })
              });
              await loadQuotes();
            } catch (error) {
              globalThis.alert(error.message || 'Failed to update quote');
            }
          });

          let acceptBtn = null;
          if (!quote.assignedManagerId && quote.status === 'pending' && canManageQuotes()) {
            acceptBtn = document.createElement('button');
            acceptBtn.type = 'button';
            acceptBtn.className = 'btn btn-outline';
            acceptBtn.textContent = 'Accept';
            acceptBtn.addEventListener('click', async () => {
              try {
                await api(`/api/manager/quotes/${quote.id}/accept`, { method: 'POST' });
                await loadQuotes();
              } catch (error) {
                globalThis.alert(error.message || 'Failed to accept quote');
              }
            });
          }

          controls.appendChild(createControlField('Status', statusSelect));
          controls.appendChild(createControlField('Priority', prioritySelect));
          controls.appendChild(createEditActions([acceptBtn, saveBtn]));
        },
        createEmptyNode: () => createMutedNode('No quotes found for current filters.')
      });

      renderPagination(el.quotesPagination, el.quotesPrev, el.quotesNext, state.quotesPagination);
      renderOperationsShell();
    };

    const loadQuotes = async () => {
      const payload = await api(`/api/manager/quotes?${buildQuery({
        page: state.quotesQuery.page,
        pageSize: state.quotesQuery.pageSize,
        q: state.quotesQuery.q,
        status: state.quotesQuery.status
      })}`);
      state.quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
      state.quotesPagination = payload.pagination || state.quotesPagination;
      renderQuotes();
    };

    const applyQuotesFiltersFromUI = () => {
      state.quotesQuery.q = String(el.quotesFilterQ.value || '').trim();
      state.quotesQuery.status = String(el.quotesFilterStatus.value || '').trim();
      state.quotesQuery.pageSize = Number.parseInt(el.quotesPageSize.value, 10) || 25;
      state.quotesQuery.page = 1;
    };

    const lockQuotesForRole = () => {
      el.quotesFilterQ.disabled = true;
      el.quotesFilterStatus.disabled = true;
      el.quotesRefresh.disabled = true;
      el.quotesPageSize.disabled = true;
      el.quotesPrev.disabled = true;
      el.quotesNext.disabled = true;
      syncKeyedList(el.quotesList, [], {
        getKey: () => '',
        createNode: createQuoteCard,
        updateNode: () => {},
        createEmptyNode: () => createMutedNode('Quote management is available for manager/admin roles.')
      });
    };

    const loadQuotesForRole = async (role) => {
      if (state.lazyLoaded.quotes) return;
      state.lazyLoaded.quotes = true;
      if (['manager', 'admin'].includes(role)) {
        await loadQuotes();
        return;
      }
      lockQuotesForRole();
    };

    const bindEvents = () => {
      el.quotesRefresh.addEventListener('click', () => {
        applyQuotesFiltersFromUI();
        loadQuotes().catch((error) => globalThis.alert(error.message || 'Could not load quotes'));
      });
      el.quotesPrev.addEventListener('click', () => {
        if (state.quotesQuery.page <= 1) return;
        state.quotesQuery.page -= 1;
        loadQuotes().catch((error) => globalThis.alert(error.message || 'Could not load quotes'));
      });
      el.quotesNext.addEventListener('click', () => {
        if (state.quotesQuery.page >= Number(state.quotesPagination.totalPages || 1)) return;
        state.quotesQuery.page += 1;
        loadQuotes().catch((error) => globalThis.alert(error.message || 'Could not load quotes'));
      });
    };

    return {
      renderQuotes,
      loadQuotes,
      applyQuotesFiltersFromUI,
      loadQuotesForRole,
      bindEvents
    };
  };

  globalThis.LevelLinesManagerQuotes = {
    createManagerQuotesController
  };
})();
