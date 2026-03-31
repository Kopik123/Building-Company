(() => {
  const rootWindow = typeof window !== 'undefined' ? window : {};
  const runtime = rootWindow.LevelLinesRuntime || {};
  const buildSafeSlug = runtime.buildSafeSlug || ((value) => String(value || '').trim().toLowerCase());

  const titleCase = runtime.titleCase || ((value) => String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()));

  const formatDateTime = runtime.formatDateTime || ((value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleString('en-GB');
  });

  const formatCurrency = (value) => `GBP ${Number(value || 0).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

  const formatDiffValue = (field, value) => {
    if (value === null || typeof value === 'undefined' || value === '') return 'empty';
    if (typeof value === 'boolean') return value ? 'yes' : 'no';
    if (Array.isArray(value)) return value.length ? value.join(', ') : 'empty';
    if (['subtotal', 'total', 'lineTotal'].includes(field)) return formatCurrency(value);
    if (field.toLowerCase().includes('date') || field.toLowerCase().includes('at')) {
      return formatDateTime(value) || String(value);
    }
    return String(value);
  };

  const buildEntryId = (entry, scope = '') => {
    const createdAt = String(entry?.createdAt || '').trim();
    const changeType = String(entry?.changeType || 'revision').trim().toLowerCase();
    const scopePart = buildSafeSlug(scope || entry?.scope || entry?.entity || 'entry');
    return [scopePart || 'entry', changeType || 'revision', createdAt || 'unknown'].join('__');
  };

  const isClientDecisionEntry = (entry) => {
    const changeType = String(entry?.changeType || '').toLowerCase();
    const changedFields = Array.isArray(entry?.changedFields) ? entry.changedFields.map((field) => String(field).toLowerCase()) : [];
    return changeType.includes('client')
      || changeType.includes('accept')
      || changeType.includes('reject')
      || changeType.includes('decision')
      || changedFields.includes('clientdecisionstatus')
      || changedFields.includes('clientdecisionnotes');
  };

  const buildRows = (entry, previousEntry) => {
    const current = entry?.snapshot || {};
    const previous = previousEntry?.snapshot || {};
    const fields = new Set([
      ...(Array.isArray(entry?.changedFields) ? entry.changedFields : []),
      ...Object.keys(current),
      ...Object.keys(previous)
    ]);

    return [...fields].sort((left, right) => left.localeCompare(right)).map((field) => {
      const previousValue = formatDiffValue(field, previous[field]);
      const currentValue = formatDiffValue(field, current[field]);
      return {
        field,
        label: titleCase(field),
        previousValue,
        currentValue,
        changed: previousValue !== currentValue
      };
    });
  };

  const createDiffColumn = (heading, rows, valueKey) => {
    const section = document.createElement('section');
    section.className = 'review-diff-column';
    const title = document.createElement('h4');
    title.textContent = heading;
    section.appendChild(title);
    rows.forEach((row) => {
      const item = document.createElement('div');
      item.className = `review-diff-row${row.changed ? ' is-changed' : ''}`;
      const label = document.createElement('span');
      label.className = 'review-diff-label';
      label.textContent = row.label;
      const value = document.createElement('span');
      value.className = 'review-diff-value';
      value.textContent = row[valueKey];
      item.append(label, value);
      section.appendChild(item);
    });
    return section;
  };

  const createEntry = ({ entry, previousEntry, scope, selectedEntryId = '' }) => {
    const rows = buildRows(entry, previousEntry);
    const card = document.createElement('article');
    const entryId = buildEntryId(entry, scope);
    const changedRows = rows.filter((row) => row.changed);
    const isSelected = Boolean(selectedEntryId && selectedEntryId === entryId);
    card.className = `review-diff-card${isSelected ? ' is-selected' : ''}`;
    card.dataset.entryId = entryId;

    const head = document.createElement('div');
    head.className = 'review-diff-head';
    const headCopy = document.createElement('div');
    headCopy.className = 'review-diff-head-copy';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'workspace-card-label';
    eyebrow.textContent = scope ? titleCase(scope) : titleCase(entry?.scope || entry?.entity || 'revision');
    const title = document.createElement('h3');
    title.textContent = titleCase(entry?.changeType || 'revision');
    headCopy.append(eyebrow, title);
    const badges = document.createElement('div');
    badges.className = 'review-diff-badges';
    changedRows.forEach((row) => {
      const badge = document.createElement('span');
      badge.className = 'review-diff-badge';
      badge.textContent = row.label;
      badges.appendChild(badge);
    });
    if (!changedRows.length) {
      const badge = document.createElement('span');
      badge.className = 'review-diff-badge review-diff-badge--muted';
      badge.textContent = 'Snapshot';
      badges.appendChild(badge);
    }
    headCopy.appendChild(badges);
    const meta = document.createElement('p');
    meta.className = 'muted review-diff-meta';
    meta.textContent = formatDateTime(entry?.createdAt) || '';
    head.append(headCopy, meta);

    const summary = document.createElement('p');
    summary.className = 'muted review-diff-summary';
    summary.textContent = changedRows.length
      ? `${changedRows.length} field${changedRows.length === 1 ? '' : 's'} changed across the selected revision snapshot.`
      : 'Snapshot recorded.';

    const grid = document.createElement('div');
    grid.className = 'review-diff-grid';
    grid.append(
      createDiffColumn('Previous', rows, 'previousValue'),
      createDiffColumn('Current', rows, 'currentValue')
    );

    card.append(head, summary);
    if (entry?.note) {
      const note = document.createElement('p');
      note.textContent = entry.note;
      card.appendChild(note);
    }
    card.appendChild(grid);
    return card;
  };

  const reviewDiffApi = {
    buildEntryId,
    createEntry,
    formatCurrency,
    formatDateTime,
    formatDiffValue,
    isClientDecisionEntry,
    titleCase
  };

  if (typeof window !== 'undefined') {
    window.LevelLinesReviewDiff = reviewDiffApi;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = reviewDiffApi;
  }
})();
