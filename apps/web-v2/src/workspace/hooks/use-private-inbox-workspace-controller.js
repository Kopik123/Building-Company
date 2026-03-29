import { useAuth } from '../../lib/auth.jsx';
import { usePrivateInboxWorkspaceState } from './use-private-inbox-workspace-state.js';
import { usePrivateInboxWorkspaceActions } from './use-private-inbox-workspace-actions.js';
import { buildPrivateInboxPanels } from '../view-models/private-inbox-panels.js';

/**
 * @returns {import('../view-models/private-inbox-panels.js').PrivateInboxPanelsViewModel}
 */
function usePrivateInboxWorkspaceController() {
  const { user } = useAuth();
  const state = usePrivateInboxWorkspaceState({ user });
  const actions = usePrivateInboxWorkspaceActions({
    sending: state.sending,
    draft: state.draft,
    selectedFiles: state.selectedFiles,
    setComposerError: state.setComposerError,
    setSending: state.setSending,
    selectedThreadId: state.selectedThreadId,
    selectedThread: state.selectedThread,
    resolveRecipient: state.resolveRecipient,
    staffMode: state.staffMode,
    subject: state.subject,
    directThreads: state.directThreads,
    setIsCreatingNewThread: state.setIsCreatingNewThread,
    setSelectedThreadId: state.setSelectedThreadId,
    setRecipientEmail: state.setRecipientEmail,
    setSubject: state.setSubject,
    resetComposer: state.resetComposer,
    setMessageState: state.setMessageState
  });

  return buildPrivateInboxPanels({
    search: state.search,
    setSearch: state.setSearch,
    staffMode: state.staffMode,
    startNewThread: state.startNewThread,
    directThreads: state.directThreads,
    filteredThreads: state.filteredThreads,
    user,
    selectedThreadId: state.selectedThreadId,
    onSelectThread: state.onSelectThread,
    selectedThread: state.selectedThread,
    canStartThread: state.canStartThread,
    recipientLabel: state.recipientLabel,
    messageState: state.messageState,
    peopleDirectory: state.peopleDirectory,
    recipientEmail: state.recipientEmail,
    setRecipientEmail: state.setRecipientEmail,
    subject: state.subject,
    setSubject: state.setSubject,
    draft: state.draft,
    setDraft: state.setDraft,
    onSubmit: actions.onSubmit,
    selectedFiles: state.selectedFiles,
    setSelectedFiles: state.setSelectedFiles,
    composerError: state.composerError,
    sending: state.sending
  });
}

export { usePrivateInboxWorkspaceController };
