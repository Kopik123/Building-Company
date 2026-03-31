(() => {
  const runtime = window.LevelLinesRuntime || {};
  const TOKEN_KEY = runtime.TOKEN_KEY || 'll_auth_token';
  const diffViewer = window.LevelLinesReviewDiff || {};
  const el = {
    title: document.getElementById('manager-review-title'),
    summary: document.getElementById('manager-review-summary'),
    status: document.getElementById('manager-review-status'),
    summaryList: document.getElementById('manager-review-summary-list'),
    estimateList: document.getElementById('manager-review-estimate-list'),
    historyList: document.getElementById('manager-review-history-list')
  };

  if (Object.values(el).some((value) => !value)) return;

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
  const createOverviewEntry = runtime.createOverviewEntry || (({ title, detail, meta }) => {
    const item = document.createElement('article');
    item.className = 'workspace-overview-entry';
    item.innerHTML = `<h3>${String(title || '')}</h3>${detail ? `<p>${String(detail)}</p>` : ''}${meta ? `<p class="muted">${String(meta)}</p>` : ''}`;
    return item;
  });
  const setStatus = runtime.setStatus || ((node, message = '', type = '') => {
    node.className = 'form-status';
    if (type === 'success') node.classList.add('is-success');
    if (type === 'error') node.classList.add('is-error');
    if (type === 'loading') node.classList.add('is-loading');
    node.textContent = message;
  });
  const titleCase = diffViewer.titleCase || runtime.titleCase || ((value) => String(value || ''));
  const formatDateTime = diffViewer.formatDateTime || runtime.formatDateTime || ((value) => String(value || ''));
  const formatCurrency = diffViewer.formatCurrency || ((value) => String(value || ''));

  const quoteId = new URLSearchParams(window.location.search).get('quoteId');

  const buildTimeline = (quote) => {
    const estimates = Array.isArray(quote?.estimates) ? quote.estimates : [];
    return [
      ...(Array.isArray(quote?.revisionHistory) ? quote.revisionHistory.map((entry) => ({ ...entry, scope: 'quote' })) : []),
      ...estimates.flatMap((estimate) => (
        Array.isArray(estimate.revisionHistory)
          ? estimate.revisionHistory.map((entry) => ({ ...entry, scope: `estimate · ${estimate.title || estimate.id}` }))
          : []
      ))
    ].sort((left, right) => Date.parse(right?.createdAt || 0) - Date.parse(left?.createdAt || 0));
  };

  const render = (quote) => {
    el.summaryList.innerHTML = '';
    el.estimateList.innerHTML = '';
    el.historyList.innerHTML = '';

    const latestEstimate = Array.isArray(quote.estimates) && quote.estimates.length ? quote.estimates[0] : null;
    el.title.textContent = `${titleCase(quote.projectType)} review timeline`;
    el.summary.textContent = 'Track review milestones, workflow changes and estimate revisions without leaving the operational flow.';

    el.summaryList.appendChild(createOverviewEntry({
      title: 'Workflow state',
      detail: `${titleCase(quote.workflowStatus || quote.status || 'new')} | client decision: ${titleCase(quote.clientDecisionStatus || 'pending')}`,
      meta: quote.assignedManager?.name ? `Assigned manager: ${quote.assignedManager.name}` : 'Unassigned'
    }));
    el.summaryList.appendChild(createOverviewEntry({
      title: 'Visit and start',
      detail: `Visit: ${quote.siteVisitDate || 'pending'}${quote.siteVisitTimeWindow ? ` (${quote.siteVisitTimeWindow})` : ''}`,
      meta: `Proposed start: ${quote.proposedStartDate || 'pending'}`
    }));

    if (latestEstimate) {
      el.estimateList.appendChild(createOverviewEntry({
        title: latestEstimate.title || 'Estimate',
        detail: `${titleCase(latestEstimate.status || 'draft')} | total ${formatCurrency(latestEstimate.total || 0)}`,
        meta: latestEstimate.sentToClientAt ? `Sent ${formatDateTime(latestEstimate.sentToClientAt)}` : ''
      }));
      if (latestEstimate.documentUrl) {
        const card = document.createElement('article');
        card.className = 'workspace-overview-entry';
        const heading = document.createElement('h3');
        heading.textContent = 'Estimate file';
        const detail = document.createElement('p');
        detail.textContent = latestEstimate.documentFilename || 'Open latest estimate file';
        const link = document.createElement('a');
        link.className = 'btn btn-outline';
        link.href = latestEstimate.documentUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Open estimate file';
        card.append(heading, detail, link);
        el.estimateList.appendChild(card);
      }
    } else {
      el.estimateList.appendChild(createOverviewEntry({
        title: 'Estimate pack',
        detail: 'No linked estimate is available yet.',
        meta: ''
      }));
    }

    const timeline = buildTimeline(quote);
    if (!timeline.length) {
      el.historyList.appendChild(createOverviewEntry({
        title: 'Timeline',
        detail: 'Revision and review events will appear here once the quote changes.',
        meta: ''
      }));
      return;
    }

    timeline.forEach((entry, index) => {
      const previous = timeline[index + 1] || null;
      if (diffViewer.createEntry) {
        el.historyList.appendChild(diffViewer.createEntry({
          entry,
          previousEntry: previous,
          scope: entry.scope
        }));
      }
    });
  };

  const loadQuote = async () => {
    if (!quoteId) {
      setStatus(el.status, 'Missing quoteId in the URL.', 'error');
      return;
    }
    if (!localStorage.getItem(TOKEN_KEY)) {
      setStatus(el.status, 'Login first to open the manager review timeline.', 'error');
      return;
    }
    setStatus(el.status, 'Loading manager review...');
    try {
      const payload = await api(`/api/manager/quotes/${encodeURIComponent(quoteId)}`);
      render(payload.quote || {});
      setStatus(el.status, '');
    } catch (error) {
      setStatus(el.status, error.message || 'Failed to load manager review timeline.', 'error');
    }
  };

  window.addEventListener('ll:session-changed', loadQuote);
  loadQuote();
})();
