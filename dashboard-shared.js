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
    meta.className = 'muted dashboard-message-meta';
    const body = document.createElement('p');
    body.className = 'dashboard-message-body';
    const attachments = document.createElement('div');
    attachments.className = 'dashboard-message-attachments';
    attachments.hidden = true;
    card.appendChild(meta);
    card.appendChild(body);
    card.appendChild(attachments);
    return card;
  };

  const formatAttachmentSize = (size) => {
    const value = Number(size || 0);
    if (!Number.isFinite(value) || value <= 0) return '';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderMessageCardContent = (card, { metaText, bodyText, attachments } = {}) => {
    if (!card) return;

    const metaNode = card.querySelector('.dashboard-message-meta') || card.children[0];
    const bodyNode = card.querySelector('.dashboard-message-body') || card.children[1];
    let attachmentsNode = card.querySelector('.dashboard-message-attachments');

    if (!attachmentsNode) {
      attachmentsNode = document.createElement('div');
      attachmentsNode.className = 'dashboard-message-attachments';
      attachmentsNode.hidden = true;
      card.appendChild(attachmentsNode);
    }

    if (metaNode) metaNode.textContent = metaText || '';
    if (bodyNode) bodyNode.textContent = bodyText || '';

    attachmentsNode.innerHTML = '';
    const attachmentList = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
    attachmentsNode.hidden = attachmentList.length === 0;

    attachmentList.forEach((attachment, index) => {
      const link = document.createElement('a');
      link.className = 'dashboard-attachment-link';
      link.href = attachment.url || '#';
      link.target = '_blank';
      link.rel = 'noreferrer noopener';
      link.textContent = attachment.name || `Attachment ${index + 1}`;

      const sizeText = formatAttachmentSize(attachment.size);
      if (sizeText) {
        const size = document.createElement('span');
        size.className = 'dashboard-attachment-size';
        size.textContent = sizeText;
        link.appendChild(size);
      }

      attachmentsNode.appendChild(link);
    });
  };

  window.LevelLinesDashboardShared = {
    createOverviewEntry,
    renderMailboxPreviewList,
    syncKeyedList,
    createMutedNode,
    createThreadCard,
    createMessageCard,
    renderMessageCardContent
  };
})();
