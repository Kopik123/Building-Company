/**
 * @typedef {Object} PrivateInboxSidebarPanel
 * @property {string} search
 * @property {Function} setSearch
 * @property {boolean} staffMode
 * @property {Function} startNewThread
 * @property {Object} directThreads
 * @property {Array<Object>} filteredThreads
 * @property {Object | null} user
 * @property {string | null} selectedThreadId
 * @property {Function} onSelectThread
 */

/**
 * @typedef {Object} PrivateInboxConversationPanel
 * @property {Object | null} selectedThread
 * @property {Object | null} user
 * @property {boolean} staffMode
 * @property {boolean} canStartThread
 * @property {string} recipientLabel
 * @property {Object} messageState
 * @property {Array<Object>} peopleDirectory
 * @property {string} recipientEmail
 * @property {Function} setRecipientEmail
 * @property {string} subject
 * @property {Function} setSubject
 * @property {string} draft
 * @property {Function} setDraft
 * @property {Function} onSubmit
 * @property {Array<File>} selectedFiles
 * @property {Function} setSelectedFiles
 * @property {string} composerError
 * @property {boolean} sending
 */

/**
 * @typedef {Object} PrivateInboxPanelsViewModel
 * @property {PrivateInboxSidebarPanel} sidebarPanel
 * @property {PrivateInboxConversationPanel} conversationPanel
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
