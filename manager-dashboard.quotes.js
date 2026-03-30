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
    const toInputDate = (value) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.toISOString().slice(0, 10);
    };
    const toInputDateTime = (value) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.toISOString().slice(0, 16);
    };
    const formatAttachmentSize = (bytes) => {
      const numericBytes = Number(bytes) || 0;
      if (numericBytes <= 0) return 'Image';
      if (numericBytes < 1024 * 1024) return `${Math.max(1, Math.round(numericBytes / 1024))} KB`;
      return `${(numericBytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const humanizeTokenValue = (value) => String(value || 'project')
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (entry) => entry.toUpperCase());

    const createQuoteCard = () => {
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      const heading = document.createElement('h3');
      heading.className = 'dashboard-item-title';
      const meta = document.createElement('p');
      meta.className = 'muted dashboard-quote-meta';
      const description = document.createElement('p');
      description.className = 'dashboard-quote-description';
      const preview = document.createElement('div');
      preview.className = 'dashboard-quote-preview';
      preview.hidden = true;
      const controls = document.createElement('div');
      controls.className = 'dashboard-edit-grid';
      card.appendChild(heading);
      card.appendChild(meta);
      card.appendChild(description);
      card.appendChild(preview);
      card.appendChild(controls);
      return card;
    };

    const renderQuotePreviewGrid = (previewRoot, attachments) => {
      if (!(previewRoot instanceof HTMLElement)) return;
      previewRoot.textContent = '';
      const normalized = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
      if (!normalized.length) {
        previewRoot.hidden = true;
        return;
      }

      const visibleAttachments = normalized.slice(0, 4);
      const overflowCount = Math.max(0, normalized.length - visibleAttachments.length);
      const grid = document.createElement('div');
      grid.className = 'dashboard-quote-preview-grid';

      visibleAttachments.forEach((attachment, index) => {
        const link = document.createElement('a');
        link.className = 'dashboard-quote-preview-card';
        link.href = attachment.url || '#';
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.title = attachment.name || `Quote attachment ${index + 1}`;

        const thumb = document.createElement('div');
        thumb.className = 'dashboard-quote-preview-thumb';
        const isImage = String(attachment.mimeType || attachment.mediaType || '').toLowerCase().startsWith('image');
        if (isImage && attachment.url) {
          const image = document.createElement('img');
          image.src = attachment.url;
          image.alt = attachment.name || `Quote attachment ${index + 1}`;
          image.loading = 'lazy';
          image.decoding = 'async';
          image.addEventListener('error', () => {
            thumb.textContent = '';
            const fallback = document.createElement('span');
            fallback.textContent = 'FILE';
            thumb.appendChild(fallback);
          }, { once: true });
          thumb.appendChild(image);
        } else {
          const fallback = document.createElement('span');
          fallback.textContent = 'FILE';
          thumb.appendChild(fallback);
        }

        const caption = document.createElement('p');
        caption.className = 'dashboard-quote-preview-name';
        caption.textContent = attachment.name || `Attachment ${index + 1}`;

        const meta = document.createElement('span');
        meta.className = 'dashboard-quote-preview-size';
        meta.textContent = formatAttachmentSize(attachment.size || attachment.sizeBytes);

        link.appendChild(thumb);
        link.appendChild(caption);
        link.appendChild(meta);
        grid.appendChild(link);
      });

      if (overflowCount > 0) {
        const more = document.createElement('div');
        more.className = 'dashboard-quote-preview-card dashboard-quote-preview-card--more';

        const moreThumb = document.createElement('div');
        moreThumb.className = 'dashboard-quote-preview-thumb';
        moreThumb.textContent = `+${overflowCount}`;

        const moreCaption = document.createElement('p');
        moreCaption.className = 'dashboard-quote-preview-name';
        moreCaption.textContent = overflowCount === 1 ? '1 more photo' : `${overflowCount} more photos`;

        const moreMeta = document.createElement('span');
        moreMeta.className = 'dashboard-quote-preview-size';
        moreMeta.textContent = `${normalized.length} total`;

        more.appendChild(moreThumb);
        more.appendChild(moreCaption);
        more.appendChild(moreMeta);
        grid.appendChild(more);
      }

      previewRoot.appendChild(grid);
      previewRoot.hidden = false;
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
          const isNewQuote = String(quote.recordType || '').toLowerCase() === 'new_quote';
          const owner = quote.guestName || quote.client?.name || quote.client?.email || 'Unknown client';
          const heading = card.querySelector('.dashboard-item-title');
          const meta = card.querySelector('.dashboard-quote-meta');
          const description = card.querySelector('.dashboard-quote-description');
          const previewRoot = card.querySelector('.dashboard-quote-preview');
          const controls = card.querySelector('.dashboard-edit-grid');
          heading.textContent = `${humanizeTokenValue(quote.projectType)} | ${owner}`;

          const metaParts = [
            isNewQuote ? 'staged request' : String(quote.status || '').trim(),
            `workflow ${String(quote.workflowStatus || 'submitted').trim()}`,
            `priority ${String(quote.priority || 'medium').trim()}`,
            quote.quoteRef ? `ref ${quote.quoteRef}` : '',
            quote.location || '-',
            quote.postcode || '',
            quote.sourceChannel ? `via ${quote.sourceChannel}` : '',
            quote.assignedManager?.email ? `owner ${quote.assignedManager.email}` : (isNewQuote ? 'awaiting review' : 'unassigned')
          ].filter(Boolean);
          meta.textContent = metaParts.join(' | ');

          const descriptionParts = isNewQuote
            ? [
              quote.budgetRange ? `Budget ${quote.budgetRange}` : '',
              quote.attachmentCount ? `${quote.attachmentCount} photo(s)` : '',
              'Accept to convert this staged request into a project, or reject to remove it from the queue.',
              quote.description || ''
            ].filter(Boolean)
            : [
              quote.budgetRange ? `Budget ${quote.budgetRange}` : '',
              quote.currentEstimateId ? 'Estimate linked' : '',
              quote.nextActionAt ? `Next action ${quote.nextActionAt}` : '',
              quote.responseDeadline ? `Deadline ${quote.responseDeadline}` : '',
              quote.lossReason ? `Loss reason: ${quote.lossReason}` : '',
              quote.description || ''
            ].filter(Boolean);
          description.textContent = descriptionParts.join(' | ');
          renderQuotePreviewGrid(previewRoot, quote.attachments);

          controls.replaceChildren();

          if (isNewQuote) {
            const acceptBtn = document.createElement('button');
            acceptBtn.type = 'button';
            acceptBtn.className = 'btn btn-gold';
            acceptBtn.textContent = 'Accept';
            acceptBtn.disabled = !canManageQuotes();
            acceptBtn.addEventListener('click', async () => {
              try {
                await api(`/api/manager/quotes/${quote.id}/accept`, { method: 'POST' });
                await loadQuotes();
              } catch (error) {
                globalThis.alert(error.message || 'Failed to accept quote request');
              }
            });

            const rejectBtn = document.createElement('button');
            rejectBtn.type = 'button';
            rejectBtn.className = 'btn btn-outline';
            rejectBtn.textContent = 'Reject';
            rejectBtn.disabled = !canManageQuotes();
            rejectBtn.addEventListener('click', async () => {
              try {
                await api(`/api/manager/quotes/${quote.id}/reject`, { method: 'POST' });
                await loadQuotes();
              } catch (error) {
                globalThis.alert(error.message || 'Failed to reject quote request');
              }
            });

            controls.appendChild(createEditActions([acceptBtn, rejectBtn]));
            return;
          }

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

          const nextActionInput = document.createElement('input');
          nextActionInput.type = 'datetime-local';
          nextActionInput.value = toInputDateTime(quote.nextActionAt);

          const responseDeadlineInput = document.createElement('input');
          responseDeadlineInput.type = 'date';
          responseDeadlineInput.value = toInputDate(quote.responseDeadline);

          const lossReasonInput = document.createElement('textarea');
          lossReasonInput.rows = 2;
          lossReasonInput.value = quote.lossReason || '';

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
                body: JSON.stringify({
                  status: statusSelect.value,
                  priority: prioritySelect.value,
                  nextActionAt: nextActionInput.value || null,
                  responseDeadline: responseDeadlineInput.value || null,
                  lossReason: lossReasonInput.value || null
                })
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
          controls.appendChild(createControlField('Next action', nextActionInput));
          controls.appendChild(createControlField('Response deadline', responseDeadlineInput));
          controls.appendChild(createControlField('Loss reason', lossReasonInput));
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
        status: state.quotesQuery.status,
        workflowStatus: state.quotesQuery.workflowStatus,
        priority: state.quotesQuery.priority,
        projectType: state.quotesQuery.projectType
      })}`);
      state.quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
      state.quotesPagination = payload.pagination || state.quotesPagination;
      renderQuotes();
    };

    const applyQuotesFiltersFromUI = () => {
      state.quotesQuery.q = String(el.quotesFilterQ.value || '').trim();
      state.quotesQuery.status = String(el.quotesFilterStatus.value || '').trim();
      state.quotesQuery.workflowStatus = String(el.quotesFilterWorkflowStatus?.value || '').trim();
      state.quotesQuery.priority = String(el.quotesFilterPriority?.value || '').trim();
      state.quotesQuery.projectType = String(el.quotesFilterProjectType?.value || '').trim();
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
