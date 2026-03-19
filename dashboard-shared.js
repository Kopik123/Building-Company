(() => {
  const runtime = window.LevelLinesRuntime || {};
  const escapeHtml = runtime.escapeHtml || ((value) => String(value ?? ''));

  const createOverviewEntry = runtime.createOverviewEntry || (({ title, detail, meta }) => {
    const item = document.createElement('article');
    item.className = 'workspace-overview-entry';

    const heading = document.createElement('h3');
    heading.textContent = title;
    item.appendChild(heading);

    if (detail) {
      const text = document.createElement('p');
      text.textContent = detail;
      item.appendChild(text);
    }

    if (meta) {
      const metaLine = document.createElement('p');
      metaLine.className = 'muted';
      metaLine.textContent = meta;
      item.appendChild(metaLine);
    }

    return item;
  });

  const renderMailboxPreviewList = runtime.renderMailboxPreviewList || ((node, items, { loaded, loadingText, emptyText, mapItem }) => {
    if (!node) return;
    node.innerHTML = '';

    if (!loaded) {
      node.innerHTML = `<p class="muted">${escapeHtml(loadingText)}</p>`;
      return;
    }

    if (!items.length) {
      node.innerHTML = `<p class="muted">${escapeHtml(emptyText)}</p>`;
      return;
    }

    const frag = document.createDocumentFragment();
    items.slice(0, 2).forEach((item) => frag.appendChild(createOverviewEntry(mapItem(item))));
    node.appendChild(frag);
  });

  const syncKeyedList = runtime.syncKeyedList || ((container, items, { getKey, createNode, updateNode, createEmptyNode } = {}) => {
    if (!container) return;
    const existingByKey = new Map();
    let emptyNode = null;

    Array.from(container.children).forEach((child) => {
      if (child.dataset.emptyState === 'true') {
        emptyNode = child;
        return;
      }
      if (child.dataset.renderKey) existingByKey.set(child.dataset.renderKey, child);
    });

    if (!Array.isArray(items) || !items.length) {
      existingByKey.forEach((node) => node.remove());
      if (!createEmptyNode) {
        if (emptyNode) emptyNode.remove();
        return;
      }
      const nextEmptyNode = createEmptyNode();
      nextEmptyNode.dataset.emptyState = 'true';
      if (emptyNode) {
        if (emptyNode !== nextEmptyNode) emptyNode.replaceWith(nextEmptyNode);
      } else {
        container.appendChild(nextEmptyNode);
      }
      return;
    }

    if (emptyNode) emptyNode.remove();

    const orderedNodes = items.map((item, index) => {
      const key = String(getKey(item, index));
      let node = existingByKey.get(key);
      if (!node) {
        node = createNode(item, index);
        node.dataset.renderKey = key;
      }
      updateNode(node, item, index);
      existingByKey.delete(key);
      return node;
    });

    orderedNodes.forEach((node, index) => {
      const currentNode = container.children[index];
      if (currentNode !== node) {
        container.insertBefore(node, currentNode || null);
      }
    });

    existingByKey.forEach((node) => node.remove());
  });

  const createMutedNode = (message) => {
    const node = document.createElement('p');
    node.className = 'muted';
    node.textContent = message;
    return node;
  };

  const createThreadCard = ({ onOpen }) => {
    const card = document.createElement('article');
    card.className = 'dashboard-item';
    const head = document.createElement('div');
    head.className = 'dashboard-thread-head';
    const heading = document.createElement('h3');
    heading.className = 'dashboard-item-title';
    const badge = document.createElement('span');
    badge.className = 'dashboard-thread-badge';
    badge.hidden = true;
    const preview = document.createElement('p');
    preview.className = 'dashboard-thread-preview';
    const meta = document.createElement('p');
    meta.className = 'muted dashboard-thread-meta';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline';
    btn.textContent = 'Open';
    btn.addEventListener('click', async () => {
      const threadId = card.dataset.threadId || '';
      if (!threadId) return;
      await onOpen(threadId);
    });
    head.appendChild(heading);
    head.appendChild(badge);
    card.appendChild(head);
    card.appendChild(preview);
    card.appendChild(meta);
    card.appendChild(btn);
    return card;
  };

  const createMessageCard = () => {
    const card = document.createElement('article');
    card.className = 'dashboard-item';
    const meta = document.createElement('p');
    meta.className = 'muted';
    const body = document.createElement('p');
    card.appendChild(meta);
    card.appendChild(body);
    return card;
  };

  window.LevelLinesDashboardShared = {
    createOverviewEntry,
    renderMailboxPreviewList,
    syncKeyedList,
    createMutedNode,
    createThreadCard,
    createMessageCard
  };
})();
