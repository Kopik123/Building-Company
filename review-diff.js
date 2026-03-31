(() => {
  const runtime = window.LevelLinesRuntime || {};

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

  const createEntry = ({ entry, previousEntry, scope }) => {
    const rows = buildRows(entry, previousEntry);
    const card = document.createElement('article');
    card.className = 'review-diff-card';

    const head = document.createElement('div');
    head.className = 'review-diff-head';
    const headCopy = document.createElement('div');
    const eyebrow = document.createElement('p');
    eyebrow.className = 'workspace-card-label';
    eyebrow.textContent = scope ? titleCase(scope) : titleCase(entry?.scope || entry?.entity || 'revision');
    const title = document.createElement('h3');
    title.textContent = titleCase(entry?.changeType || 'revision');
    headCopy.append(eyebrow, title);
    const meta = document.createElement('p');
    meta.className = 'muted';
    meta.textContent = formatDateTime(entry?.createdAt) || '';
    head.append(headCopy, meta);

    const summary = document.createElement('p');
    summary.className = 'muted';
    const changedFields = rows.filter((row) => row.changed).map((row) => row.label);
    summary.textContent = changedFields.length
      ? `Changed: ${changedFields.join(', ')}`
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

  window.LevelLinesReviewDiff = {
    createEntry,
    formatCurrency,
    formatDateTime,
    formatDiffValue,
    titleCase
  };
})();
