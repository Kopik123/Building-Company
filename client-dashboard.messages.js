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

    const renderThreads = () => {
      syncKeyedList(el.threadsList, state.threads, {
        getKey: (thread) => thread.id,
        createNode: () => createThreadCard({
          onOpen: async (threadId) => {
            state.selectedThreadId = threadId;
            renderThreads();
            await loadMessages();
          }
        }),
        updateNode: (card, thread) => {
          card.dataset.threadId = thread.id;
          card.className = `dashboard-item ${thread.id === state.selectedThreadId ? 'is-active' : ''}`;
          const senderName = thread.latestMessageSender?.name || thread.latestMessageSender?.email || '';
          const metaParts = [];
          if (thread.messageCount) metaParts.push(`${thread.messageCount} messages`);
          const updatedAt = formatDateTime(thread.latestMessageAt || thread.updatedAt);
          if (updatedAt) metaParts.push(`Updated ${updatedAt}`);
          updateThreadCardContent(card, {
            title: thread.name || thread.subject || 'Thread',
            preview: thread.latestMessagePreview
              ? `${senderName ? `${senderName}: ` : ''}${thread.latestMessagePreview}`
              : 'Project communication route',
            meta: metaParts.join(' | '),
            badge: 0
          });
        },
        createEmptyNode: () => createMutedNode('No communication threads yet.')
      });
    };

    const renderDirectThreads = () => {
      const fallbackManager = getPreferredManager();
      syncKeyedList(el.directThreadsList, state.directThreads, {
        getKey: (thread) => thread.id,
        createNode: () => createThreadCard({
          onOpen: async (threadId) => {
            state.selectedDirectThreadId = threadId;
            renderDirectThreads();
            await loadDirectMessages();
          }
        }),
        updateNode: (card, thread) => {
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
        },
        createEmptyNode: () => createMutedNode(
          fallbackManager
            ? `No private thread yet. Use the message box to start a direct conversation with ${fallbackManager.name || fallbackManager.email}.`
            : 'No manager thread yet. A direct conversation becomes available once a manager is assigned.'
        )
      });
    };

    const renderMessages = () => {
      syncKeyedList(el.messagesList, state.selectedThreadId ? state.messages : [], {
        getKey: (message, index) => message.id || `${message.createdAt || 'message'}-${index}`,
        createNode: createMessageCard,
        updateNode: (card, message) => {
          const sender = message.sender?.name || message.sender?.email || 'Unknown';
          renderMessageCardContent(card, {
            metaText: `${sender} | ${formatDateTime(message.createdAt) || '-'}`,
            bodyText: message.body || '',
            attachments: message.attachments
          });
        },
        createEmptyNode: () => createMutedNode(state.selectedThreadId ? 'No messages in this thread.' : 'Select a thread to view messages.')
      });
    };

    const renderDirectMessages = () => {
      const fallbackManager = getPreferredManager();
      syncKeyedList(el.directMessagesList, state.selectedDirectThreadId ? state.directMessages : [], {
        getKey: (message, index) => message.id || `${message.createdAt || 'direct-message'}-${index}`,
        createNode: createMessageCard,
        updateNode: (card, message) => {
          const sender = message.sender?.name || message.sender?.email || 'Unknown';
          renderMessageCardContent(card, {
            metaText: `${sender} | ${formatDateTime(message.createdAt) || '-'}`,
            bodyText: message.body || '',
            attachments: message.attachments
          });
        },
        createEmptyNode: () => createMutedNode(
          state.selectedDirectThreadId
            ? 'No private messages in this thread.'
            : (fallbackManager
              ? `Start a direct thread with ${fallbackManager.name || fallbackManager.email}.`
              : 'A direct manager conversation will appear here once a manager is assigned.')
        )
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

    const loadDirectMessages = async () => {
      if (!state.selectedDirectThreadId) {
        state.directMessages = [];
        renderDirectMessages();
        return;
      }

      const payload = await api(`/api/inbox/threads/${state.selectedDirectThreadId}/messages?pageSize=100`);
      state.directMessages = Array.isArray(payload.messages) ? payload.messages : [];
      renderDirectMessages();
      const selectedThread = state.directThreads.find((thread) => thread.id === state.selectedDirectThreadId) || null;
      if (Number(selectedThread?.unreadCount || 0) > 0) {
        await api(`/api/inbox/threads/${state.selectedDirectThreadId}/read`, { method: 'POST' });
        selectedThread.unreadCount = 0;
        renderDirectThreads();
        renderOperationsShell();
      }
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

    const setupLazySections = () => {
      const directSection = el.directThreadsList.closest('section');
      const groupSection = el.threadsList.closest('section');
      const tasks = [];

      if (directSection) {
        tasks.push({
          target: directSection,
          loaded: false,
          load: async () => {
            if (state.lazyLoaded.directThreads) return;
            state.lazyLoaded.directThreads = true;
            await loadDirectThreads();
          }
        });
      }

      if (groupSection) {
        tasks.push({
          target: groupSection,
          loaded: false,
          load: async () => {
            if (state.lazyLoaded.groupThreads) return;
            state.lazyLoaded.groupThreads = true;
            await loadThreads();
          }
        });
      }

      (onceVisible || ((items) => {
        items.forEach((item) => item.load());
        return () => {};
      }))(tasks);
    };

    const bindEvents = () => {
      el.messageForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!state.selectedThreadId) return setStatus(el.messageStatus, 'Select a thread first.', 'error');
        const body = String(el.messageForm.elements.body.value || '').trim();
        const files = collectFiles(el.messageForm);
        if (!hasMessagePayload({ body, files })) return setStatus(el.messageStatus, 'Message or attachment is required.', 'error');

        setStatus(el.messageStatus, files.length ? 'Uploading...' : 'Sending...');
        try {
          await sendThreadMessage({
            threadType: 'group',
            threadId: state.selectedThreadId,
            body,
            files
          });
          setStatus(el.messageStatus, 'Message sent.', 'success');
          el.messageForm.reset();
          await loadThreads({ forceRefresh: true });
        } catch (error) {
          setStatus(el.messageStatus, error.message || 'Send failed.', 'error');
        }
      });

      el.directMessageForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const body = String(el.directMessageForm.elements.body.value || '').trim();
        const files = collectFiles(el.directMessageForm);
        if (!hasMessagePayload({ body, files })) return setStatus(el.directMessageStatus, 'Message or attachment is required.', 'error');

        setStatus(el.directMessageStatus, state.selectedDirectThreadId ? (files.length ? 'Uploading...' : 'Sending...') : 'Opening thread...');
        try {
          let threadId = state.selectedDirectThreadId;
          if (!threadId) {
            const manager = getPreferredManager();
            if (!manager?.id) {
              return setStatus(el.directMessageStatus, 'No assigned manager is available for a private thread yet.', 'error');
            }

            const payload = await api('/api/inbox/threads', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipientUserId: manager.id,
                subject: `Direct manager conversation - ${state.user?.name || state.user?.email || 'Client'}`,
                ...(files.length
                  ? { createOnly: true }
                  : { body })
              })
            });
            threadId = payload.thread?.id || '';
            if (files.length) {
              await sendThreadMessage({
                threadType: 'direct',
                threadId,
                body,
                files
              });
            }
            await loadDirectThreads(threadId, { forceRefresh: true });
          } else {
            await sendThreadMessage({
              threadType: 'direct',
              threadId,
              body,
              files
            });
            await loadDirectThreads(threadId, { forceRefresh: true });
          }

          setStatus(el.directMessageStatus, 'Private message sent.', 'success');
          el.directMessageForm.reset();
        } catch (error) {
          setStatus(el.directMessageStatus, error.message || 'Private message failed.', 'error');
        }
      });
    };

    return {
      setupLazySections,
      bindEvents,
      loadThreads,
      loadDirectThreads
    };
  };

  window.LevelLinesClientMessages = {
    createClientMessagesController
  };
})();
