(() => {
  const runtime = window.LevelLinesRuntime || {};
  const TOKEN_KEY = runtime.TOKEN_KEY || 'll_auth_token';
  const USER_KEY = runtime.USER_KEY || 'll_auth_user';
  const el = {
    title: document.getElementById('client-review-title'),
    summary: document.getElementById('client-review-summary'),
    status: document.getElementById('client-review-status'),
    summaryList: document.getElementById('client-review-summary-list'),
    estimateList: document.getElementById('client-review-estimate-list'),
    historyList: document.getElementById('client-review-history-list'),
    filterQuote: document.getElementById('client-review-filter-quote'),
    filterEstimate: document.getElementById('client-review-filter-estimate'),
    filterDecision: document.getElementById('client-review-filter-decision'),
    decisionForm: document.getElementById('client-review-decision-form'),
    decisionStatus: document.getElementById('client-review-decision-status')
  };

  if (Object.values(el).some((value) => !value)) return;
  const diffViewer = window.LevelLinesReviewDiff || {};

  const api = runtime.createApiClient
    ? runtime.createApiClient(() => localStorage.getItem(TOKEN_KEY) || '')
    : async (url, options = {}) => {
      const headers = new Headers(options.headers || {});
      const token = localStorage.getItem(TOKEN_KEY) || '';
      if (!headers.has('Authorization') && token) headers.set('Authorization', `Bearer ${token}`);
      const response = await fetch(url, { ...options, headers });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Request failed.');
      return payload;
    };
  const escapeHtml = runtime.escapeHtml || ((value) => String(value ?? ''));
  const titleCase = diffViewer.titleCase || runtime.titleCase || ((value) => String(value || ''));
  const formatDateTime = diffViewer.formatDateTime || runtime.formatDateTime || ((value) => String(value || ''));
  const formatCurrency = diffViewer.formatCurrency || ((value) => `GBP ${Number(value || 0).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`);
  const setStatus = runtime.setStatus || ((node, message = '', type = '') => {
    node.className = 'form-status';
    if (type === 'success') node.classList.add('is-success');
    if (type === 'error') node.classList.add('is-error');
    if (type === 'loading') node.classList.add('is-loading');
    node.textContent = message;
  });
  const createOverviewEntry = runtime.createOverviewEntry || (({ title, detail, meta }) => {
    const item = document.createElement('article');
    item.className = 'workspace-overview-entry';
    item.innerHTML = `<h3>${escapeHtml(title)}</h3>${detail ? `<p>${escapeHtml(detail)}</p>` : ''}${meta ? `<p class="muted">${escapeHtml(meta)}</p>` : ''}`;
    return item;
  });
  const toDateInputValue = (value) => (String(value || '').trim() ? String(value).slice(0, 10) : '');

  const state = {
    quote: null,
    selectedEntryId: new URLSearchParams(window.location.search).get('entry') || '',
    filters: {
      quote: new URLSearchParams(window.location.search).get('filterQuote') !== 'false',
      estimate: new URLSearchParams(window.location.search).get('filterEstimate') !== 'false',
      decision: new URLSearchParams(window.location.search).get('filterDecision') !== 'false'
    }
  };
  const escapeSelector = (value) => {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
    return String(value).replace(/["\\]/g, '\\$&');
  };

  const quoteId = new URLSearchParams(window.location.search).get('quoteId');
  const updateSearchParams = () => {
    const url = new URL(window.location.href);
    if (state.selectedEntryId) url.searchParams.set('entry', state.selectedEntryId);
    else url.searchParams.delete('entry');
    url.searchParams.set('filterQuote', String(state.filters.quote));
    url.searchParams.set('filterEstimate', String(state.filters.estimate));
    url.searchParams.set('filterDecision', String(state.filters.decision));
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const applySelection = () => {
    if (!state.selectedEntryId) return;
    const target = el.historyList.querySelector(`[data-entry-id="${escapeSelector(state.selectedEntryId)}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const buildHistory = (quote, visibleEstimate) => ([
    ...(Array.isArray(quote.revisionHistory) ? quote.revisionHistory.map((entry) => ({ ...entry, scope: 'quote' })) : []),
    ...(Array.isArray(visibleEstimate?.revisionHistory) ? visibleEstimate.revisionHistory.map((entry) => ({ ...entry, scope: 'estimate' })) : [])
  ].sort((left, right) => Date.parse(right?.createdAt || 0) - Date.parse(left?.createdAt || 0)));

  const filterHistory = (history) => history.filter((entry) => {
    const scope = String(entry.scope || '').toLowerCase();
    if (!state.filters.quote && scope === 'quote') return false;
    if (!state.filters.estimate && scope === 'estimate') return false;
    if (!state.filters.decision && diffViewer.isClientDecisionEntry && diffViewer.isClientDecisionEntry(entry)) return false;
    return true;
  });

  const getVisibleEstimate = (quote) => {
    const estimates = Array.isArray(quote?.estimates) ? quote.estimates : [];
    return estimates.find((estimate) => estimate.clientVisible) || estimates[0] || null;
  };

  const renderSummary = () => {
    el.summaryList.innerHTML = '';
    el.estimateList.innerHTML = '';
    el.historyList.innerHTML = '';
    const quote = state.quote;
    if (!quote) return;

    const visibleEstimate = getVisibleEstimate(quote);
    el.title.textContent = `${titleCase(quote.projectType)} review`;
    el.summary.textContent = quote.workflowStatus === 'client_review'
      ? 'Review the estimate pack, compare revisions and send your decision.'
      : 'This quote is still moving through the workflow. You can still review the current pack and send updates.';

    const summaryEntries = [
      createOverviewEntry({
        title: 'Quote status',
        detail: `${titleCase(quote.workflowStatus || quote.status || 'new')} | decision: ${titleCase(quote.clientDecisionStatus || 'pending')}`,
        meta: quote.assignedManager?.name ? `Manager: ${quote.assignedManager.name}` : 'Manager will appear here once assigned.'
      }),
      createOverviewEntry({
        title: 'Visit and timing',
        detail: `Visit: ${quote.siteVisitDate || 'pending'}${quote.siteVisitTimeWindow ? ` (${quote.siteVisitTimeWindow})` : ''}`,
        meta: `Proposed start: ${quote.proposedStartDate || 'pending'}`
      })
    ];
    summaryEntries.forEach((entry) => el.summaryList.appendChild(entry));

    if (visibleEstimate) {
      el.estimateList.appendChild(createOverviewEntry({
        title: visibleEstimate.title || 'Estimate',
        detail: `Status: ${titleCase(visibleEstimate.status || 'draft')} | Total: ${formatCurrency(visibleEstimate.total || 0)}`,
        meta: visibleEstimate.sentToClientAt ? `Sent ${formatDateTime(visibleEstimate.sentToClientAt)}` : ''
      }));
      if (visibleEstimate.notes) {
        el.estimateList.appendChild(createOverviewEntry({
          title: 'Estimate notes',
          detail: visibleEstimate.notes,
          meta: ''
        }));
      }
      if (quote.scopeOfWork || quote.materialsPlan || quote.labourEstimate) {
        el.estimateList.appendChild(createOverviewEntry({
          title: 'Pack summary',
          detail: [quote.scopeOfWork, quote.materialsPlan, quote.labourEstimate].filter(Boolean).join(' | '),
          meta: ''
        }));
      }
      if (visibleEstimate.documentUrl || quote.estimateDocumentUrl) {
        const linkWrap = document.createElement('article');
        linkWrap.className = 'workspace-overview-entry';
        const href = visibleEstimate.documentUrl || quote.estimateDocumentUrl;
        linkWrap.innerHTML = `<h3>Downloads</h3><p>${escapeHtml(visibleEstimate.documentFilename || 'Estimate pack file')}</p>`;
        const link = document.createElement('a');
        link.className = 'btn btn-outline';
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Open estimate file / PDF';
        linkWrap.appendChild(link);
        el.estimateList.appendChild(linkWrap);
      }
    } else {
      el.estimateList.appendChild(createOverviewEntry({
        title: 'Estimate pack',
        detail: 'The estimate pack is still being prepared.',
        meta: ''
      }));
    }

    const history = filterHistory(buildHistory(quote, visibleEstimate));

    if (!history.length) {
      el.historyList.appendChild(createOverviewEntry({
        title: 'History',
        detail: 'Revision history will appear here when the quote or estimate pack changes.',
        meta: ''
      }));
    } else {
      history.forEach((entry, index) => {
        const previous = history[index + 1] || null;
        if (diffViewer.createEntry) {
          el.historyList.appendChild(diffViewer.createEntry({
            entry,
            previousEntry: previous,
            scope: entry.scope,
            selectedEntryId: state.selectedEntryId
          }));
          return;
        }
        el.historyList.appendChild(createOverviewEntry({
          title: `${titleCase(entry.scope)}: ${titleCase(entry.changeType || 'update')}`,
          detail: 'Snapshot recorded.',
          meta: formatDateTime(entry.createdAt) || ''
        }));
      });
      applySelection();
    }

    const form = el.decisionForm.elements;
    form.clientDecisionStatus.value = '';
    form.siteVisitDate.value = toDateInputValue(quote.siteVisitDate);
    form.siteVisitTimeWindow.value = quote.siteVisitTimeWindow || '';
    form.clientDecisionNotes.value = quote.clientDecisionNotes || '';
  };

  const loadQuote = async () => {
    if (!quoteId) {
      setStatus(el.status, 'Missing quoteId in the URL.', 'error');
      return;
    }
    if (!localStorage.getItem(TOKEN_KEY)) {
      setStatus(el.status, 'Login first to open the dedicated client review screen.', 'error');
      return;
    }
    setStatus(el.status, 'Loading review...');
    try {
      const payload = await api(`/api/client/quotes/${encodeURIComponent(quoteId)}/review`);
      state.quote = payload.quote || null;
      renderSummary();
      setStatus(el.status, '');
    } catch (error) {
      setStatus(el.status, error.message || 'Failed to load quote review.', 'error');
    }
  };

  el.decisionForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.quote) return;
    const form = el.decisionForm.elements;
    const payload = {};
    const decision = String(form.clientDecisionStatus.value || '').trim();
    const visitDate = form.siteVisitDate.value || null;
    const visitWindow = String(form.siteVisitTimeWindow.value || '').trim() || null;
    const notes = String(form.clientDecisionNotes.value || '').trim() || null;
    if (decision) payload.clientDecisionStatus = decision;
    if ((visitDate || null) !== (state.quote.siteVisitDate || null)) payload.siteVisitDate = visitDate || null;
    if ((visitWindow || null) !== (state.quote.siteVisitTimeWindow || null)) payload.siteVisitTimeWindow = visitWindow || null;
    if (notes !== (state.quote.clientDecisionNotes || null)) payload.clientDecisionNotes = notes;
    if (!Object.keys(payload).length) {
      setStatus(el.decisionStatus, 'Add a decision, visit change or note first.', 'error');
      return;
    }

    setStatus(el.decisionStatus, 'Sending review update...', 'loading');
    try {
      await api(`/api/client/quotes/${encodeURIComponent(state.quote.id)}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setStatus(el.decisionStatus, 'Review update sent.', 'success');
      await loadQuote();
    } catch (error) {
      setStatus(el.decisionStatus, error.message || 'Failed to send review update.', 'error');
    }
  });

  [el.filterQuote, el.filterEstimate, el.filterDecision].forEach((input) => {
    if (!input) return;
    input.checked = state.filters[input === el.filterQuote ? 'quote' : input === el.filterEstimate ? 'estimate' : 'decision'];
    input.addEventListener('change', () => {
      state.filters.quote = el.filterQuote.checked;
      state.filters.estimate = el.filterEstimate.checked;
      state.filters.decision = el.filterDecision.checked;
      updateSearchParams();
      renderSummary();
    });
  });

  window.addEventListener('ll:session-changed', loadQuote);
  loadQuote();
})();
