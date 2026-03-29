import React from 'react';
import { useAuth } from '../../lib/auth.jsx';
import { PrivateInboxPanels } from '../components/private-inbox-sections.jsx';
import { usePrivateInboxWorkspaceState } from '../hooks/use-private-inbox-workspace-state.js';
import { usePrivateInboxWorkspaceActions } from '../hooks/use-private-inbox-workspace-actions.js';
import { buildPrivateInboxPanels } from '../view-models/private-inbox-panels.js';

function PrivateInboxPage() {
  const { user } = useAuth();
  const {
    staffMode,
    directThreads,
    selectedThreadId,
    setSelectedThreadId,
    search,
    setSearch,
    draft,
    setDraft,
    selectedFiles,
    setSelectedFiles,
    sending,
    setSending,
    composerError,
    setComposerError,
    recipientEmail,
    setRecipientEmail,
    subject,
    setSubject,
    setIsCreatingNewThread,
    messageState,
    setMessageState,
    peopleDirectory,
    filteredThreads,
    selectedThread,
    canStartThread,
    recipientLabel,
    resetComposer,
    resolveRecipient,
    startNewThread,
    onSelectThread
  } = usePrivateInboxWorkspaceState({ user });

  const { onSubmit } = usePrivateInboxWorkspaceActions({
    sending,
    draft,
    selectedFiles,
    setComposerError,
    setSending,
    selectedThreadId,
    selectedThread,
    resolveRecipient,
    staffMode,
    subject,
    directThreads,
    setIsCreatingNewThread,
    setSelectedThreadId,
    setRecipientEmail,
    setSubject,
    resetComposer,
    setMessageState
  });

  const { sidebarPanel, conversationPanel } = buildPrivateInboxPanels({
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
  });

  return <PrivateInboxPanels sidebarPanel={sidebarPanel} conversationPanel={conversationPanel} />;
}

export { PrivateInboxPage };
