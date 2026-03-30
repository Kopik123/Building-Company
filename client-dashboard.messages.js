(() => {
  const createClientMessagesController = ({
    state,
    el,
    api,
    setStatus,
    createMutedNode,
    syncKeyedList,
    createThreadCard,
    createMessageCard,
    renderMessageCardContent,
    formatDateTime,
    requestAccordionRefresh,
    getThreadCounterparty,
    onRenderOperationsShell,
    onceVisible
  } = {}) => {
    if (!state || !el) return null;

    const buildPreviewText = (senderName, preview, fallback) => {
      if (!preview) return fallback;
      return senderName ? `${senderName}: ${preview}` : preview;
    };

    const getDirectMessagesEmptyText = (fallbackManager) => {
      if (state.selectedDirectThreadId) {
        return 'No private messages in this thread.';
      }

      if (fallbackManager) {
        return `Start a direct thread with ${fallbackManager.name || fallbackManager.email}.`;
      }

      return 'A direct manager conversation will appear here once a manager is assigned.';
    };

    const getDirectThreadsEmptyText = (fallbackManager) => {
      if (fallbackManager) {
        return `No private thread yet. Use the message box to start a direct conversation with ${fallbackManager.name || fallbackManager.email}.`;
      }

      return 'No manager thread yet. A direct conversation becomes available once a manager is assigned.';
    };

    const updateThreadCardContent = (card, { title, preview, meta, badge }) => {
      const titleNode = card.querySelector('.dashboard-item-title');
      const badgeNode = card.querySelector('.dashboard-thread-badge');
      const previewNode = card.querySelector('.dashboard-thread-preview');
      const metaNode = card.querySelector('.dashboard-thread-meta');
      if (titleNode) titleNode.textContent = title || 'Thread';
      if (previewNode) previewNode.textContent = preview || 'No recent messages yet.';
      if (metaNode) metaNode.textContent = meta || '';
      if (badgeNode) {
        const hasBadge = badge !== null && badge !== undefined && badge !== '' && Number(badge) > 0;
        badgeNode.hidden = !hasBadge;
        badgeNode.textContent = hasBadge ? `${badge} unread` : '';
      }
    };

    const renderOperationsShell = () => {
      onRenderOperationsShell?.();
    };

    const collectFiles = (form) => Array.from(form?.elements?.files?.files || []);

    const hasMessagePayload = ({ body, files }) => Boolean(String(body || '').trim() || files.length);

    const defaultAttachmentBody = (files) => `Sent ${files.length} file(s)`;

    const getSendStatusText = ({ hasThread, files }) => {
      if (!hasThread) return 'Opening thread...';
      return files.length ? 'Uploading...' : 'Sending...';
    };

    const getCurrentUserLabel = () => state.user?.name || state.user?.email || 'Client';

    const sendThreadMessage = async ({ threadType, threadId, body, files }) => {
      const normalizedBody = String(body || '').trim();
      if (!hasMessagePayload({ body: normalizedBody, files })) {
        throw new Error('Message or attachment is required.');
      }

      const baseUrl = threadType === 'group'
        ? `/api/group/threads/${threadId}/messages`
        : `/api/inbox/threads/${threadId}/messages`;

      if (files.length) {
        const formData = new FormData();
        formData.append('body', normalizedBody || defaultAttachmentBody(files));
        files.forEach((file) => formData.append('files', file));
        return api(`${baseUrl}/upload`, {
          method: 'POST',
          body: formData
        });
      }

      return api(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: normalizedBody })
      });
    };

    const getPreferredManager = () => {
      const projectManager = state.projects.find((project) => project.assignedManager?.id)?.assignedManager;
      if (projectManager?.id) return projectManager;
      const quoteManager = state.quotes.find((quote) => quote.assignedManager?.id)?.assignedManager;
      if (quoteManager?.id) return quoteManager;
      const threadManager = state.directThreads.map(getThreadCounterparty).find((user) => user?.id);
      return threadManager || null;
    };

    const openGroupThread = async (threadId) => {
      state.selectedThreadId = threadId;
      renderThreads();
      await loadMessages();
    };

    const createGroupThreadCardNode = () => createThreadCard({ onOpen: openGroupThread });

    const updateGroupThreadCard = (card, thread) => {
      card.dataset.threadId = thread.id;
      card.className = `dashboard-item ${thread.id === state.selectedThreadId ? 'is-active' : ''}`;
      const senderName = thread.latestMessageSender?.name || thread.latestMessageSender?.email || '';
      const metaParts = [];
      if (thread.messageCount) metaParts.push(`${thread.messageCount} messages`);
      const updatedAt = formatDateTime(thread.latestMessageAt || thread.updatedAt);
      if (updatedAt) metaParts.push(`Updated ${updatedAt}`);
      updateThreadCardContent(card, {
        title: thread.name || thread.subject || 'Thread',
        preview: buildPreviewText(senderName, thread.latestMessagePreview, 'Project communication route'),
        meta: metaParts.join(' | '),
        badge: 0
      });
    };

    const createEmptyGroupThreadsNode = () => createMutedNode('No communication threads yet.');

    const openDirectThread = async (threadId) => {
      state.selectedDirectThreadId = threadId;
      renderDirectThreads();
      await loadDirectMessages();
    };

    const createDirectThreadCardNode = () => createThreadCard({ onOpen: openDirectThread });

    const updateDirectThreadCard = (card, thread) => {
      const counterparty = getThreadCounterparty(thread);
      card.dataset.threadId = thread.id;
      card.className = `dashboard-item ${thread.id === state.selectedDirectThreadId ? 'is-active' : ''}`;
      const metaParts = [];
      if (Number(thread.unreadCount || 0) > 0) metaParts.push(`${thread.unreadCount} unread`);
      const updatedAt = formatDateTime(thread.latestMessageAt || thread.updatedAt);
      if (updatedAt) metaParts.push(`Updated ${updatedAt}`);
      updateThreadCardContent(card, {
        title: counterparty?.name || counterparty?.email || thread.subject || 'Direct thread',
        preview: thread.latestMessagePreview || thread.subject || 'Direct manager conversation',
        meta: metaParts.join(' | '),
        badge: thread.unreadCount || 0
      });
    };

    const createEmptyDirectThreadsNode = () => createMutedNode(getDirectThreadsEmptyText(getPreferredManager()));

    const updateMessageNode = (card, message) => {
      const sender = message.sender?.name || message.sender?.email || 'Unknown';
      renderMessageCardContent(card, {
        metaText: `${sender} | ${formatDateTime(message.createdAt) || '-'}`,
        bodyText: message.body || '',
        attachments: message.attachments
      });
    };

    const createEmptyMessagesNode = () => createMutedNode(state.selectedThreadId ? 'No messages in this thread.' : 'Select a thread to view messages.');

    const createEmptyDirectMessagesNode = () => createMutedNode(getDirectMessagesEmptyText(getPreferredManager()));

    const renderThreads = () => {
      syncKeyedList(el.threadsList, state.threads, {
        getKey: (thread) => thread.id,
        createNode: createGroupThreadCardNode,
        updateNode: updateGroupThreadCard,
        createEmptyNode: createEmptyGroupThreadsNode
      });
    };

    const renderDirectThreads = () => {
      syncKeyedList(el.directThreadsList, state.directThreads, {
        getKey: (thread) => thread.id,
        createNode: createDirectThreadCardNode,
        updateNode: updateDirectThreadCard,
        createEmptyNode: createEmptyDirectThreadsNode
      });
    };

    const renderMessages = () => {
      syncKeyedList(el.messagesList, state.selectedThreadId ? state.messages : [], {
        getKey: (message, index) => message.id || `${message.createdAt || 'message'}-${index}`,
        createNode: createMessageCard,
        updateNode: updateMessageNode,
        createEmptyNode: createEmptyMessagesNode
      });
    };

    const renderDirectMessages = () => {
      syncKeyedList(el.directMessagesList, state.selectedDirectThreadId ? state.directMessages : [], {
        getKey: (message, index) => message.id || `${message.createdAt || 'direct-message'}-${index}`,
        createNode: createMessageCard,
        updateNode: updateMessageNode,
        createEmptyNode: createEmptyDirectMessagesNode
      });
    };

    const loadMessages = async () => {
      if (!state.selectedThreadId) {
        state.messages = [];
        renderMessages();
        return;
      }

      const payload = await api(`/api/group/threads/${state.selectedThreadId}/messages?pageSize=100`);
      state.messages = Array.isArray(payload.messages) ? payload.messages : [];
      renderMessages();
    };

    const markSelectedDirectThreadRead = async () => {
      const selectedThread = state.directThreads.find((thread) => thread.id === state.selectedDirectThreadId) || null;
      if (Number(selectedThread?.unreadCount || 0) <= 0) return;

      await api(`/api/inbox/threads/${state.selectedDirectThreadId}/read`, { method: 'POST' });
      selectedThread.unreadCount = 0;
      renderDirectThreads();
      renderOperationsShell();
    };

    const loadDirectMessages = async () => {
      if (!state.selectedDirectThreadId) {
        state.directMessages = [];
        renderDirectMessages();
        return;
      }

      const payload = await api(`/api/inbox/threads/${state.selectedDirectThreadId}/messages?pageSize=100`);
      state.directMessages = Array.isArray(payload.messages) ? payload.messages : [];
      renderDirectMessages();
      await markSelectedDirectThreadRead();
    };

    const ensureThreadSummaries = async ({ forceRefresh = false } = {}) => {
      if (state.overviewLoaded.groupThreads && !forceRefresh) return;
      const payload = await api('/api/group/threads?pageSize=100');
      state.threads = Array.isArray(payload.threads) ? payload.threads : [];
      if (!state.threads.some((thread) => thread.id === state.selectedThreadId)) {
        state.selectedThreadId = state.threads[0]?.id || '';
      }
      state.overviewLoaded.groupThreads = true;
      renderOperationsShell();
    };

    const ensureDirectThreadSummaries = async (preferredThreadId = '', { forceRefresh = false } = {}) => {
      const shouldKeepSelection = preferredThreadId || state.selectedDirectThreadId;
      if (!state.overviewLoaded.directThreads || forceRefresh) {
        const payload = await api('/api/inbox/threads?pageSize=100');
        state.directThreads = Array.isArray(payload.threads) ? payload.threads : [];
        state.overviewLoaded.directThreads = true;
      }

      if (!state.directThreads.some((thread) => thread.id === shouldKeepSelection)) {
        state.selectedDirectThreadId = state.directThreads[0]?.id || '';
      } else {
        state.selectedDirectThreadId = shouldKeepSelection;
      }

      renderOperationsShell();
    };

    const loadThreads = async (options = {}) => {
      await ensureThreadSummaries(options);
      state.lazyLoaded.groupThreads = true;
      renderThreads();
      await loadMessages();
      requestAccordionRefresh?.();
    };

    const loadDirectThreads = async (preferredThreadId = '', options = {}) => {
      await ensureDirectThreadSummaries(preferredThreadId, options);
      state.lazyLoaded.directThreads = true;
      renderDirectThreads();
      await loadDirectMessages();
      requestAccordionRefresh?.();
    };

    const createLazyLoadTask = ({ target, isLoaded, load }) => ({
      target,
      loaded: false,
      load: async () => {
        if (isLoaded()) return;
        await load();
      }
    });

    const loadVisibleDirectThreads = async () => {
      if (state.lazyLoaded.directThreads) return;
      state.lazyLoaded.directThreads = true;
      await loadDirectThreads();
    };

    const loadVisibleGroupThreads = async () => {
      if (state.lazyLoaded.groupThreads) return;
      state.lazyLoaded.groupThreads = true;
      await loadThreads();
    };

    const runVisibilityFallback = (items) => {
      items.forEach((item) => item.load());
      return () => {};
    };

    const setupLazySections = () => {
      const directSection = el.directThreadsList.closest('section');
      const groupSection = el.threadsList.closest('section');
      const tasks = [];

      if (directSection) {
        tasks.push(createLazyLoadTask({
          target: directSection,
          isLoaded: () => state.lazyLoaded.directThreads,
          load: loadVisibleDirectThreads
        }));
      }

      if (groupSection) {
        tasks.push(createLazyLoadTask({
          target: groupSection,
          isLoaded: () => state.lazyLoaded.groupThreads,
          load: loadVisibleGroupThreads
        }));
      }

      (onceVisible || runVisibilityFallback)(tasks);
    };

    const readFormMessage = (form) => String(form.elements.body.value || '').trim();

    const validateMessagePayload = ({ body, files, statusNode }) => {
      if (hasMessagePayload({ body, files })) return true;
      setStatus(statusNode, 'Message or attachment is required.', 'error');
      return false;
    };

    const resetAndConfirmMessage = ({ form, statusNode, message }) => {
      setStatus(statusNode, message, 'success');
      form.reset();
    };

    const submitGroupMessage = async ({ body, files }) => {
      await sendThreadMessage({
        threadType: 'group',
        threadId: state.selectedThreadId,
        body,
        files
      });
      await loadThreads({ forceRefresh: true });
    };

    const createDirectThreadPayload = ({ managerId, body, hasFiles }) => {
      const payload = {
        recipientUserId: managerId,
        subject: `Direct manager conversation - ${getCurrentUserLabel()}`
      };

      if (hasFiles) {
        payload.createOnly = true;
      } else {
        payload.body = body;
      }

      return payload;
    };

    const createDirectThread = async ({ body, files }) => {
      const manager = getPreferredManager();
      if (!manager?.id) {
        throw new Error('No assigned manager is available for a private thread yet.');
      }

      const payload = await api('/api/inbox/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createDirectThreadPayload({
          managerId: manager.id,
          body,
          hasFiles: files.length > 0
        }))
      });
      const threadId = payload.thread?.id || '';

      if (files.length) {
        await sendThreadMessage({
          threadType: 'direct',
          threadId,
          body,
          files
        });
      }

      return threadId;
    };

    const resolveDirectThreadId = async ({ body, files }) => {
      if (state.selectedDirectThreadId) return state.selectedDirectThreadId;
      return createDirectThread({ body, files });
    };

    const submitDirectMessage = async ({ threadId, body, files }) => {
      if (threadId !== state.selectedDirectThreadId) {
        await loadDirectThreads(threadId, { forceRefresh: true });
        return;
      }

      await sendThreadMessage({
        threadType: 'direct',
        threadId,
        body,
        files
      });
      await loadDirectThreads(threadId, { forceRefresh: true });
    };

    const handleGroupMessageSubmit = async (event) => {
      event.preventDefault();
      if (!state.selectedThreadId) {
        setStatus(el.messageStatus, 'Select a thread first.', 'error');
        return;
      }

      const body = readFormMessage(el.messageForm);
      const files = collectFiles(el.messageForm);
      if (!validateMessagePayload({ body, files, statusNode: el.messageStatus })) return;

      setStatus(el.messageStatus, files.length ? 'Uploading...' : 'Sending...');
      try {
        await submitGroupMessage({ body, files });
        resetAndConfirmMessage({
          form: el.messageForm,
          statusNode: el.messageStatus,
          message: 'Message sent.'
        });
      } catch (error) {
        setStatus(el.messageStatus, error.message || 'Send failed.', 'error');
      }
    };

    const handleDirectMessageSubmit = async (event) => {
      event.preventDefault();
      const body = readFormMessage(el.directMessageForm);
      const files = collectFiles(el.directMessageForm);
      if (!validateMessagePayload({ body, files, statusNode: el.directMessageStatus })) return;

      setStatus(
        el.directMessageStatus,
        getSendStatusText({ hasThread: Boolean(state.selectedDirectThreadId), files })
      );

      try {
        const threadId = await resolveDirectThreadId({ body, files });
        await submitDirectMessage({ threadId, body, files });
        resetAndConfirmMessage({
          form: el.directMessageForm,
          statusNode: el.directMessageStatus,
          message: 'Private message sent.'
        });
      } catch (error) {
        setStatus(el.directMessageStatus, error.message || 'Private message failed.', 'error');
      }
    };

    const bindEvents = () => {
      el.messageForm.addEventListener('submit', handleGroupMessageSubmit);
      el.directMessageForm.addEventListener('submit', handleDirectMessageSubmit);
    };

    return {
      setupLazySections,
      bindEvents,
      loadThreads,
      loadDirectThreads
    };
  };

  globalThis.LevelLinesClientMessages = {
    createClientMessagesController
  };
})();
