(() => {
  const createManagerMessagesController = ({
    state,
    el,
    api,
    buildQuery,
    syncKeyedList,
    createMutedNode,
    createThreadCard,
    createMessageCard,
    renderMessageCardContent,
    formatDateTime,
    setStatus,
    normUuid,
    normEmail,
    renderOperationsShell,
    resolveUserByEmail,
    getInboxCounterparty,
    setSelectOptions
  }) => {
    const buildPreviewText = (senderName, preview, fallback) => {
      if (!preview) return fallback;
      return senderName ? `${senderName}: ${preview}` : preview;
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

    const selectedGroupThread = () =>
      state.groupThreads.find((thread) => thread.id === state.selectedGroupThreadId) || null;

    const selectedDirectThread = () =>
      state.directThreads.find((thread) => thread.id === state.selectedDirectThreadId) || null;

    const collectFiles = (form) => Array.from(form?.elements?.files?.files || []);

    const readFormMessage = (form) => String(form.elements.body.value || '').trim();

    const hasMessagePayload = ({ body, files }) => Boolean(String(body || '').trim() || files.length);

    const validateMessagePayload = ({ body, files, statusNode }) => {
      if (hasMessagePayload({ body, files })) return true;
      setStatus(statusNode, 'Message or attachment is required.', 'error');
      return false;
    };

    const defaultAttachmentBody = (files) => `Sent ${files.length} file(s)`;

    const getSendStatusText = ({ files }) => (files.length ? 'Uploading...' : 'Sending...');

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

    const updateMessageNode = (card, message) => {
      const sender = message.sender?.name || message.sender?.email || 'Unknown';
      renderMessageCardContent(card, {
        metaText: `${sender} | ${formatDateTime(message.createdAt) || '-'}`,
        bodyText: message.body || '',
        attachments: message.attachments
      });
    };

    const createEmptyDirectMessagesNode = () =>
      createMutedNode(state.selectedDirectThreadId ? 'No private messages in this thread.' : 'Select a private thread to view messages.');

    const createEmptyGroupMessagesNode = () =>
      createMutedNode(state.selectedGroupThreadId ? 'No project messages in this thread.' : 'Select a project chat thread to view messages.');

    const renderDirectMessages = () => {
      syncKeyedList(el.managerDirectMessagesList, state.selectedDirectThreadId ? state.directMessages : [], {
        getKey: (message, index) => message.id || `${message.createdAt || 'direct-message'}-${index}`,
        createNode: createMessageCard,
        updateNode: updateMessageNode,
        createEmptyNode: createEmptyDirectMessagesNode
      });
    };

    const syncMessagingComposerState = () => {
      const directMessageField = el.managerDirectMessageForm?.elements?.body;
      const groupMessageField = el.managerGroupMessageForm?.elements?.body;
      const groupMemberField = el.managerGroupMemberForm?.elements?.participantEmail;
      const selectedThread = selectedGroupThread();
      const canManageMembers = selectedThread?.currentUserMembershipRole === 'admin';

      if (directMessageField) {
        const disabled = !state.selectedDirectThreadId;
        directMessageField.disabled = disabled;
        if (el.managerDirectMessageForm?.elements?.files) {
          el.managerDirectMessageForm.elements.files.disabled = disabled;
        }
        el.managerDirectMessageForm.querySelector('button[type="submit"]').disabled = disabled;
      }

      if (groupMessageField) {
        const disabled = !state.selectedGroupThreadId;
        groupMessageField.disabled = disabled;
        if (el.managerGroupMessageForm?.elements?.files) {
          el.managerGroupMessageForm.elements.files.disabled = disabled;
        }
        el.managerGroupMessageForm.querySelector('button[type="submit"]').disabled = disabled;
      }

      if (groupMemberField) {
        const disabled = !selectedThread || !canManageMembers;
        groupMemberField.disabled = disabled;
        el.managerGroupMemberForm.elements.participantType.disabled = disabled;
        el.managerGroupMemberForm.querySelector('button[type="submit"]').disabled = disabled;
      }
    };

    const openDirectThread = async (threadId) => {
      state.selectedDirectThreadId = threadId;
      renderDirectThreads();
      await loadDirectMessages();
    };

    const createDirectThreadCardNode = () => createThreadCard({ onOpen: openDirectThread });

    const updateDirectThreadCard = (card, thread) => {
      const counterparty = getInboxCounterparty(thread);
      card.dataset.threadId = thread.id;
      card.className = `dashboard-item ${thread.id === state.selectedDirectThreadId ? 'is-active' : ''}`;
      const metaParts = [];
      if (Number(thread.unreadCount || 0) > 0) metaParts.push(`${thread.unreadCount} unread`);
      const updatedAt = formatDateTime(thread.latestMessageAt || thread.updatedAt);
      if (updatedAt) metaParts.push(`Updated ${updatedAt}`);
      updateThreadCardContent(card, {
        title: counterparty?.name || counterparty?.email || 'Direct thread',
        preview: thread.latestMessagePreview || thread.subject || 'Private inbox route',
        meta: metaParts.join(' | '),
        badge: thread.unreadCount || 0
      });
    };

    const createEmptyDirectThreadsNode = () => createMutedNode('No private threads yet.');

    const renderDirectThreads = () => {
      syncKeyedList(el.managerDirectThreadsList, state.directThreads, {
        getKey: (thread) => thread.id,
        createNode: createDirectThreadCardNode,
        updateNode: updateDirectThreadCard,
        createEmptyNode: createEmptyDirectThreadsNode
      });
      syncMessagingComposerState();
      renderOperationsShell();
    };

    const sortGroupMembers = (members) => [...members].sort((a, b) => {
      if ((a.role || '') !== (b.role || '')) return a.role === 'admin' ? -1 : 1;
      const aName = String(a.user?.name || a.user?.email || '').toLowerCase();
      const bName = String(b.user?.name || b.user?.email || '').toLowerCase();
      return aName.localeCompare(bName);
    });

    const buildGroupMemberMeta = (memberUser, memberRole) => {
      const parts = [memberRole || 'member', memberUser.email || '-'];
      if (memberUser.role) parts.push(memberUser.role);
      return parts.join(' | ');
    };

    const canManageGroupMember = (thread, member) =>
      thread?.currentUserMembershipRole === 'admin' && member.userId !== state.user?.id;

    const handleRemoveGroupMember = async ({ threadId, member }) => {
      const memberUser = member.user || {};
      const participantLabel = memberUser.name || memberUser.email || 'this participant';
      if (!globalThis.confirm(`Remove ${participantLabel} from the chat?`)) return;

      setStatus(el.managerGroupMemberStatus, 'Removing participant...');
      try {
        await api(`/api/group/threads/${threadId}/members/${member.userId}`, { method: 'DELETE' });
        setStatus(el.managerGroupMemberStatus, 'Participant removed.', 'success');
        await loadGroupThreads(threadId);
      } catch (error) {
        setStatus(el.managerGroupMemberStatus, error.message || 'Failed to remove participant.', 'error');
      }
    };

    const createGroupMemberCardNode = () => {
      const card = document.createElement('article');
      card.className = 'dashboard-item';
      const heading = document.createElement('h3');
      heading.className = 'dashboard-item-title';
      const meta = document.createElement('p');
      meta.className = 'muted';
      const row = document.createElement('div');
      row.className = 'dashboard-actions-row';
      card.appendChild(heading);
      card.appendChild(meta);
      card.appendChild(row);
      return card;
    };

    const updateGroupMemberCard = (card, member) => {
      const thread = selectedGroupThread();
      const memberUser = member.user || {};
      card.children[0].textContent = memberUser.name || memberUser.email || 'Participant';
      card.children[1].textContent = buildGroupMemberMeta(memberUser, member.role);
      const actionsRow = card.children[2];
      actionsRow.innerHTML = '';
      if (!canManageGroupMember(thread, member)) return;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn btn-outline';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', handleRemoveGroupMember.bind(null, {
        threadId: thread.id,
        member
      }));
      actionsRow.appendChild(removeBtn);
    };

    const createEmptyGroupMembersNode = () => {
      const thread = selectedGroupThread();
      return createMutedNode(
        thread
          ? 'No participants found in this project chat.'
          : 'Select a project chat thread to manage participants.'
      );
    };

    const renderGroupMembers = () => {
      const thread = selectedGroupThread();
      const members = Array.isArray(thread?.members) ? sortGroupMembers(thread.members) : [];

      syncKeyedList(el.managerGroupMembersList, members, {
        getKey: (member) => member.id || `${member.groupThreadId}:${member.userId}`,
        createNode: createGroupMemberCardNode,
        updateNode: updateGroupMemberCard,
        createEmptyNode: createEmptyGroupMembersNode
      });
    };

    const renderGroupMessages = () => {
      syncKeyedList(el.managerGroupMessagesList, state.selectedGroupThreadId ? state.groupMessages : [], {
        getKey: (message, index) => message.id || `${message.createdAt || 'group-message'}-${index}`,
        createNode: createMessageCard,
        updateNode: updateMessageNode,
        createEmptyNode: createEmptyGroupMessagesNode
      });
    };

    const openGroupThread = async (threadId) => {
      state.selectedGroupThreadId = threadId;
      renderGroupThreads();
      await loadGroupMessages();
    };

    const createGroupThreadCardNode = () => createThreadCard({ onOpen: openGroupThread });

    const updateGroupThreadCard = (card, thread) => {
      card.dataset.threadId = thread.id;
      card.className = `dashboard-item ${thread.id === state.selectedGroupThreadId ? 'is-active' : ''}`;
      const senderName = thread.latestMessageSender?.name || thread.latestMessageSender?.email || '';
      const contextParts = [];
      if (thread.project?.title) contextParts.push(thread.project.title);
      if (thread.memberCount) contextParts.push(`${thread.memberCount} members`);
      if (thread.messageCount) contextParts.push(`${thread.messageCount} messages`);
      const updatedAt = formatDateTime(thread.latestMessageAt || thread.updatedAt);
      if (updatedAt) contextParts.push(`Updated ${updatedAt}`);
      updateThreadCardContent(card, {
        title: thread.name || thread.subject || 'Project thread',
        preview: buildPreviewText(senderName, thread.latestMessagePreview, 'Project communication route'),
        meta: contextParts.join(' | '),
        badge: 0
      });
    };

    const createEmptyGroupThreadsNode = () => createMutedNode('No project chat threads available.');

    const renderGroupThreads = () => {
      syncKeyedList(el.managerGroupThreadsList, state.groupThreads, {
        getKey: (thread) => thread.id,
        createNode: createGroupThreadCardNode,
        updateNode: updateGroupThreadCard,
        createEmptyNode: createEmptyGroupThreadsNode
      });
      renderGroupMembers();
      syncMessagingComposerState();
      renderOperationsShell();
    };

    const markSelectedDirectThreadRead = async () => {
      const thread = selectedDirectThread();
      if (Number(thread?.unreadCount || 0) <= 0) return;

      await api(`/api/inbox/threads/${state.selectedDirectThreadId}/read`, { method: 'POST' });
      thread.unreadCount = 0;
      renderDirectThreads();
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

    const loadDirectThreads = async (preferredThreadId = '', options = {}) => {
      const { loadMessages = true, pageSize = 100 } = options;
      const payload = await api(`/api/inbox/threads?${buildQuery({ pageSize })}`);
      state.directThreads = Array.isArray(payload.threads) ? payload.threads : [];
      state.overviewLoaded.directThreads = true;
      const nextSelectedId = preferredThreadId || state.selectedDirectThreadId;
      if (!state.directThreads.some((thread) => thread.id === nextSelectedId)) {
        state.selectedDirectThreadId = state.directThreads[0]?.id || '';
      } else {
        state.selectedDirectThreadId = nextSelectedId;
      }
      renderDirectThreads();
      if (loadMessages) {
        await loadDirectMessages();
      }
    };

    const loadGroupMessages = async () => {
      if (!state.selectedGroupThreadId) {
        state.groupMessages = [];
        renderGroupMessages();
        return;
      }
      const payload = await api(`/api/group/threads/${state.selectedGroupThreadId}/messages?pageSize=100`);
      state.groupMessages = Array.isArray(payload.messages) ? payload.messages : [];
      renderGroupMessages();
    };

    const loadGroupThreads = async (preferredThreadId = '', options = {}) => {
      const { loadMessages = true, pageSize = 100 } = options;
      const payload = await api(`/api/group/threads?${buildQuery({ pageSize })}`);
      state.groupThreads = Array.isArray(payload.threads) ? payload.threads : [];
      state.overviewLoaded.groupThreads = true;
      const nextSelectedId = preferredThreadId || state.selectedGroupThreadId;
      if (!state.groupThreads.some((thread) => thread.id === nextSelectedId)) {
        state.selectedGroupThreadId = state.groupThreads[0]?.id || '';
      } else {
        state.selectedGroupThreadId = nextSelectedId;
      }
      renderGroupThreads();
      if (loadMessages) {
        await loadGroupMessages();
      }
    };

    const loadDirectThreadsIfNeeded = async () => {
      if (state.lazyLoaded.directThreads) return;
      state.lazyLoaded.directThreads = true;
      await loadDirectThreads();
    };

    const loadGroupThreadsIfNeeded = async () => {
      if (state.lazyLoaded.groupThreads) return;
      state.lazyLoaded.groupThreads = true;
      await loadGroupThreads();
    };

    const syncProjectChatProjectOptions = () => {
      const select = el.managerGroupThreadForm?.elements?.projectId;
      if (!select) return;
      const options = state.projects.map((project) => ({
        value: project.id,
        label: `${project.title || 'Project'}${project.location ? ` | ${project.location}` : ''}`
      }));
      setSelectOptions(select, options, 'Select project');
      if (!select.value && state.selectedProjectId && options.some((option) => option.value === state.selectedProjectId)) {
        select.value = state.selectedProjectId;
      }
    };

    const deriveProjectChatName = (projectId) => {
      const project = state.projects.find((item) => item.id === projectId);
      if (!project) return '';
      return `${project.title || 'Project'} Chat`;
    };

    const resolveExistingParticipant = async ({ participantType, participantEmail, statusNode }) => {
      const participant = await resolveUserByEmail(participantType, participantEmail);
      if (participant?.id) return participant;

      setStatus(statusNode, 'Pick an existing client or staff member from the suggestions.', 'error');
      return null;
    };

    const buildDirectThreadCreatePayload = ({ recipientUserId, subject, body, hasFiles }) => {
      const payload = { recipientUserId, subject };
      if (hasFiles) {
        payload.createOnly = true;
      } else {
        payload.body = body;
      }
      return payload;
    };

    const createDirectThread = async ({ recipientId, subject, body, files }) => {
      const payload = await api('/api/inbox/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildDirectThreadCreatePayload({
          recipientUserId: recipientId,
          subject,
          body,
          hasFiles: files.length > 0
        }))
      });

      if (files.length) {
        await sendThreadMessage({
          threadType: 'direct',
          threadId: payload.thread?.id,
          body,
          files
        });
      }

      return payload;
    };

    const buildProjectChatPayload = async ({
      projectId,
      name,
      participantEmail,
      participantType,
      includeProjectClient,
      includeAssignedStaff,
      statusNode
    }) => {
      const payload = {
        projectId,
        name,
        includeProjectClient,
        includeAssignedStaff,
        participantUserIds: []
      };

      if (!participantEmail) return payload;

      const participant = await resolveExistingParticipant({
        participantType,
        participantEmail,
        statusNode
      });
      if (!participant?.id) return null;

      payload.participantUserIds = [participant.id];
      return payload;
    };

    const handleProjectChatNameSuggestion = (event) => {
      const nameField = el.managerGroupThreadForm.elements.name;
      if (String(nameField.value || '').trim()) return;
      nameField.value = deriveProjectChatName(String(event.target.value || ''));
    };

    const handleDirectThreadSubmit = async (event) => {
      event.preventDefault();
      const form = el.managerDirectThreadForm.elements;
      const recipientType = String(form.recipientType.value || 'client');
      const recipientEmail = normEmail(form.recipientEmail.value);
      const subject = String(form.subject.value || '').trim();
      const body = readFormMessage(el.managerDirectThreadForm);
      const files = collectFiles(el.managerDirectThreadForm);

      if (!recipientEmail || !subject || !hasMessagePayload({ body, files })) {
        setStatus(el.managerDirectThreadStatus, 'Recipient, subject and an opening message or attachment are required.', 'error');
        return;
      }

      setStatus(el.managerDirectThreadStatus, 'Creating private thread...');
      try {
        const recipient = await resolveExistingParticipant({
          participantType: recipientType,
          participantEmail: recipientEmail,
          statusNode: el.managerDirectThreadStatus
        });
        if (!recipient?.id) return;

        const payload = await createDirectThread({
          recipientId: recipient.id,
          subject,
          body,
          files
        });

        setStatus(el.managerDirectThreadStatus, 'Private thread created.', 'success');
        el.managerDirectThreadForm.reset();
        await loadDirectThreads(payload.thread?.id || '');
      } catch (error) {
        setStatus(el.managerDirectThreadStatus, error.message || 'Failed to create private thread.', 'error');
      }
    };

    const handleGroupThreadSubmit = async (event) => {
      event.preventDefault();
      const form = el.managerGroupThreadForm.elements;
      const projectId = normUuid(form.projectId.value);
      const name = String(form.name.value || '').trim();
      const participantEmail = normEmail(form.participantEmail.value);
      const participantType = String(form.participantType.value || 'client');

      if (!projectId) {
        setStatus(el.managerGroupThreadStatus, 'Choose a project before creating the chat.', 'error');
        return;
      }

      setStatus(el.managerGroupThreadStatus, 'Creating project chat...');
      try {
        const payload = await buildProjectChatPayload({
          projectId,
          name,
          participantEmail,
          participantType,
          includeProjectClient: Boolean(form.includeProjectClient.checked),
          includeAssignedStaff: Boolean(form.includeAssignedStaff.checked),
          statusNode: el.managerGroupThreadStatus
        });
        if (!payload) return;

        const result = await api('/api/group/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        setStatus(el.managerGroupThreadStatus, 'Project chat created.', 'success');
        el.managerGroupThreadForm.reset();
        form.includeProjectClient.checked = true;
        form.includeAssignedStaff.checked = true;
        syncProjectChatProjectOptions();
        await loadGroupThreads(result.thread?.id || '');
      } catch (error) {
        setStatus(el.managerGroupThreadStatus, error.message || 'Failed to create project chat.', 'error');
      }
    };

    const handleGroupMemberSubmit = async (event) => {
      event.preventDefault();
      const thread = selectedGroupThread();
      if (!thread?.id) {
        setStatus(el.managerGroupMemberStatus, 'Select a project chat thread first.', 'error');
        return;
      }

      const form = el.managerGroupMemberForm.elements;
      const participantEmail = normEmail(form.participantEmail.value);
      const participantType = String(form.participantType.value || 'client');
      if (!participantEmail) {
        setStatus(el.managerGroupMemberStatus, 'Participant email is required.', 'error');
        return;
      }

      setStatus(el.managerGroupMemberStatus, 'Adding participant...');
      try {
        const participant = await resolveExistingParticipant({
          participantType,
          participantEmail,
          statusNode: el.managerGroupMemberStatus
        });
        if (!participant?.id) return;

        await api(`/api/group/threads/${thread.id}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: participant.id })
        });

        setStatus(el.managerGroupMemberStatus, 'Participant added.', 'success');
        el.managerGroupMemberForm.reset();
        await loadGroupThreads(thread.id);
      } catch (error) {
        setStatus(el.managerGroupMemberStatus, error.message || 'Failed to add participant.', 'error');
      }
    };

    const handleDirectMessageSubmit = async (event) => {
      event.preventDefault();
      if (!state.selectedDirectThreadId) {
        setStatus(el.managerDirectMessageStatus, 'Select a private thread first.', 'error');
        return;
      }

      const body = readFormMessage(el.managerDirectMessageForm);
      const files = collectFiles(el.managerDirectMessageForm);
      if (!validateMessagePayload({ body, files, statusNode: el.managerDirectMessageStatus })) return;

      setStatus(el.managerDirectMessageStatus, getSendStatusText({ files }));
      try {
        await sendThreadMessage({
          threadType: 'direct',
          threadId: state.selectedDirectThreadId,
          body,
          files
        });
        setStatus(el.managerDirectMessageStatus, 'Private message sent.', 'success');
        el.managerDirectMessageForm.reset();
        await loadDirectThreads(state.selectedDirectThreadId);
      } catch (error) {
        setStatus(el.managerDirectMessageStatus, error.message || 'Failed to send private message.', 'error');
      }
    };

    const handleGroupMessageSubmit = async (event) => {
      event.preventDefault();
      if (!state.selectedGroupThreadId) {
        setStatus(el.managerGroupMessageStatus, 'Select a project thread first.', 'error');
        return;
      }

      const body = readFormMessage(el.managerGroupMessageForm);
      const files = collectFiles(el.managerGroupMessageForm);
      if (!validateMessagePayload({ body, files, statusNode: el.managerGroupMessageStatus })) return;

      setStatus(el.managerGroupMessageStatus, getSendStatusText({ files }));
      try {
        await sendThreadMessage({
          threadType: 'group',
          threadId: state.selectedGroupThreadId,
          body,
          files
        });
        setStatus(el.managerGroupMessageStatus, 'Project message sent.', 'success');
        el.managerGroupMessageForm.reset();
        await loadGroupThreads(state.selectedGroupThreadId);
      } catch (error) {
        setStatus(el.managerGroupMessageStatus, error.message || 'Failed to send project message.', 'error');
      }
    };

    const bindManagedSubmit = (form, handler) => {
      if (!form) return;

      let isSubmitting = false;
      const runHandler = async (event) => {
        event?.preventDefault?.();
        if (isSubmitting) return;
        isSubmitting = true;
        try {
          await handler(event);
        } finally {
          isSubmitting = false;
        }
      };

      form.addEventListener('submit', runHandler);
      const submitButton = form.querySelector('button[type="submit"]');
      submitButton?.addEventListener('click', runHandler);
    };

    const bindEvents = () => {
      el.managerGroupThreadForm.elements.projectId.addEventListener('change', handleProjectChatNameSuggestion);
      bindManagedSubmit(el.managerDirectThreadForm, handleDirectThreadSubmit);
      bindManagedSubmit(el.managerGroupThreadForm, handleGroupThreadSubmit);
      bindManagedSubmit(el.managerGroupMemberForm, handleGroupMemberSubmit);
      bindManagedSubmit(el.managerDirectMessageForm, handleDirectMessageSubmit);
      bindManagedSubmit(el.managerGroupMessageForm, handleGroupMessageSubmit);
    };

    return {
      loadDirectThreads,
      loadDirectMessages,
      loadGroupThreads,
      loadGroupMessages,
      loadDirectThreadsIfNeeded,
      loadGroupThreadsIfNeeded,
      syncProjectChatProjectOptions,
      bindEvents
    };
  };

  globalThis.LevelLinesManagerMessages = {
    createManagerMessagesController
  };
})();
