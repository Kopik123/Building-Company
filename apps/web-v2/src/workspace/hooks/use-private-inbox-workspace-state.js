import React from 'react';
import { v2Api } from '../../lib/api';
import {
  isStaffRole,
  normalizeText,
  sortByRecent,
  getDirectThreadTitle,
  getDirectThreadPreview,
  getDirectThreadMeta,
  useAsyncState
} from '../kit.jsx';

function usePrivateInboxWorkspaceState({ user }) {
  const role = normalizeText(user?.role || 'client');
  const staffMode = isStaffRole(role);
  const directThreads = useAsyncState(() => v2Api.getDirectThreads(), [], []);
  const projects = useAsyncState(() => (!staffMode ? v2Api.getProjects() : Promise.resolve([])), [staffMode], []);
  const quotes = useAsyncState(() => (!staffMode ? v2Api.getQuotes() : Promise.resolve([])), [staffMode], []);
  const clients = useAsyncState(() => (staffMode ? v2Api.getCrmClients() : Promise.resolve([])), [staffMode], []);
  const staff = useAsyncState(() => (staffMode ? v2Api.getCrmStaff() : Promise.resolve([])), [staffMode], []);
  const [selectedThreadId, setSelectedThreadId] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [draft, setDraft] = React.useState('');
  const [selectedFiles, setSelectedFiles] = React.useState([]);
  const [sending, setSending] = React.useState(false);
  const [composerError, setComposerError] = React.useState('');
  const [recipientEmail, setRecipientEmail] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [isCreatingNewThread, setIsCreatingNewThread] = React.useState(false);
  const [messageState, setMessageState] = React.useState({
    threadId: '',
    thread: null,
    loading: false,
    error: '',
    messages: []
  });

  const deferredSearch = React.useDeferredValue(search);
  const preferredManager =
    projects.data.map((project) => project?.assignedManager).find((manager) => manager?.id)
    || quotes.data.map((quote) => quote?.assignedManager).find((manager) => manager?.id)
    || null;

  const peopleDirectory = (() => {
    if (!staffMode) return preferredManager ? [preferredManager] : [];
    const seen = new Set();
    return [...clients.data, ...staff.data]
      .filter((person) => person?.id && person.id !== user?.id && person?.email)
      .filter((person) => {
        const key = normalizeText(person.email);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) => String(left?.name || left?.email || '').localeCompare(String(right?.name || right?.email || '')));
  })();

  const filteredThreads = sortByRecent(directThreads.data, ['latestMessageAt', 'updatedAt', 'createdAt']).filter((thread) => {
    const needle = normalizeText(deferredSearch);
    if (!needle) return true;
    return [getDirectThreadTitle(thread, user?.id), getDirectThreadPreview(thread), getDirectThreadMeta(thread), thread?.subject]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });

  React.useEffect(() => {
    if (isCreatingNewThread) return;
    if (!filteredThreads.length) {
      if (selectedThreadId) setSelectedThreadId('');
      return;
    }
    if (!filteredThreads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(filteredThreads[0].id);
    }
  }, [filteredThreads, selectedThreadId, isCreatingNewThread]);

  React.useEffect(() => {
    if (!selectedThreadId) {
      setMessageState({
        threadId: '',
        thread: null,
        loading: false,
        error: '',
        messages: []
      });
      return;
    }

    let active = true;
    setMessageState((prev) => ({
      ...prev,
      threadId: selectedThreadId,
      loading: true,
      error: ''
    }));

    v2Api
      .getDirectThreadMessages(selectedThreadId)
      .then((payload) => {
        const nextSelectedThread = directThreads.data.find((thread) => thread.id === selectedThreadId) || null;
        if (!active) return;
        setMessageState({
          threadId: selectedThreadId,
          thread: payload.thread || nextSelectedThread,
          loading: false,
          error: '',
          messages: sortByRecent(payload.messages, ['createdAt']).reverse()
        });
      })
      .catch((error) => {
        const nextSelectedThread = directThreads.data.find((thread) => thread.id === selectedThreadId) || null;
        if (!active) return;
        setMessageState({
          threadId: selectedThreadId,
          thread: nextSelectedThread,
          loading: false,
          error: error.message || 'Could not load private messages',
          messages: []
        });
      });

    return () => {
      active = false;
    };
  }, [selectedThreadId, directThreads.data]);

  React.useEffect(() => {
    if (!selectedThreadId) return;
    const selectedThread = directThreads.data.find((thread) => thread.id === selectedThreadId);
    if (Number(selectedThread?.unreadCount || 0) <= 0) return;

    let active = true;
    v2Api
      .markDirectThreadRead(selectedThreadId)
      .then(() => {
        if (!active) return;
        directThreads.setData((prev) => prev.map((thread) => (thread.id === selectedThreadId ? { ...thread, unreadCount: 0 } : thread)));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [selectedThreadId, directThreads.data]);

  const selectedThread = filteredThreads.find((thread) => thread.id === selectedThreadId) || messageState.thread;
  const canStartThread = Boolean(staffMode ? peopleDirectory.length : preferredManager?.id);
  const recipientLabel = preferredManager?.name || preferredManager?.email || 'Assigned manager';

  const resetComposer = () => {
    setDraft('');
    setSelectedFiles([]);
    setComposerError('');
  };

  const resolveRecipient = () => {
    if (!staffMode) return preferredManager;
    return peopleDirectory.find((person) => normalizeText(person?.email) === normalizeText(recipientEmail)) || null;
  };

  const startNewThread = () => {
    setIsCreatingNewThread(true);
    setSelectedThreadId('');
    setSubject('');
    setRecipientEmail('');
    resetComposer();
  };

  const onSelectThread = (threadId) => {
    setIsCreatingNewThread(false);
    setSelectedThreadId(threadId);
    setComposerError('');
  };

  return {
    role,
    staffMode,
    directThreads,
    projects,
    quotes,
    clients,
    staff,
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
    isCreatingNewThread,
    setIsCreatingNewThread,
    messageState,
    setMessageState,
    preferredManager,
    peopleDirectory,
    filteredThreads,
    selectedThread,
    canStartThread,
    recipientLabel,
    resetComposer,
    resolveRecipient,
    startNewThread,
    onSelectThread
  };
}

export { usePrivateInboxWorkspaceState };
