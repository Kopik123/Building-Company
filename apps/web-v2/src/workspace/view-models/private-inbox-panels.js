/**
 * @typedef {Object} PrivateInboxPanelsViewModel
 * @property {Object} sidebarPanel
 * @property {Object} conversationPanel
 */

/**
 * @param {Object} config
 * @returns {PrivateInboxPanelsViewModel}
 */
function buildPrivateInboxPanels({
  search,
  setSearch,
  staffMode,
  startNewThread,
  directThreads,
  filteredThreads,
  user,
  selectedThreadId,
  onSelectThread,
  selectedThread,
  canStartThread,
  recipientLabel,
  messageState,
  peopleDirectory,
  recipientEmail,
  setRecipientEmail,
  subject,
  setSubject,
  draft,
  setDraft,
  onSubmit,
  selectedFiles,
  setSelectedFiles,
  composerError,
  sending
}) {
  return {
    sidebarPanel: {
      search,
      setSearch,
      staffMode,
      startNewThread,
      directThreads,
      filteredThreads,
      user,
      selectedThreadId,
      onSelectThread
    },
    conversationPanel: {
      selectedThread,
      user,
      staffMode,
      canStartThread,
      recipientLabel,
      messageState,
      peopleDirectory,
      recipientEmail,
      setRecipientEmail,
      subject,
      setSubject,
      draft,
      setDraft,
      onSubmit,
      selectedFiles,
      setSelectedFiles,
      composerError,
      sending
    }
  };
}

export { buildPrivateInboxPanels };
