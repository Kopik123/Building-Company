import { v2Api } from '../../lib/api';
import { sortByRecent, updateDirectThreadAfterSend } from '../kit.jsx';

function usePrivateInboxWorkspaceActions({
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
}) {
  const onSubmit = async (event) => {
    event.preventDefault();
    if (sending) return;

    const trimmedBody = String(draft || '').trim();
    if (!trimmedBody && !selectedFiles.length) {
      setComposerError('Write a message or attach at least one file.');
      return;
    }

    setSending(true);
    setComposerError('');

    try {
      let threadId = selectedThreadId;
      let nextMessage = null;
      let nextThread = selectedThread;

      if (!threadId) {
        const recipient = resolveRecipient();
        if (!recipient?.id) {
          throw new Error(
            staffMode
              ? 'Choose an existing client or staff email first.'
              : 'No assigned manager is available for a private route yet.'
          );
        }

        const threadSubject = String(subject || '').trim() || `Private conversation - ${recipient.name || recipient.email}`;
        const created = await v2Api.createDirectThread({
          recipientUserId: recipient.id,
          subject: threadSubject,
          body: selectedFiles.length ? '' : trimmedBody,
          createOnly: selectedFiles.length > 0
        });

        if (!created.thread?.id) {
          throw new Error('Private thread response missing thread payload');
        }

        threadId = created.thread.id;
        nextThread = created.thread;
        nextMessage = created.message || null;
        directThreads.setData((prev) =>
          sortByRecent([created.thread, ...prev.filter((thread) => thread.id !== created.thread.id)], ['latestMessageAt', 'updatedAt', 'createdAt'])
        );
      }

      if (selectedFiles.length) {
        nextMessage = await v2Api.uploadDirectThreadMessage(threadId, { body: trimmedBody, files: selectedFiles });
      } else if (selectedThreadId) {
        nextMessage = await v2Api.sendDirectThreadMessage(threadId, trimmedBody);
      }

      if (!nextMessage) {
        throw new Error('Private message response missing payload');
      }

      setIsCreatingNewThread(false);
      setSelectedThreadId(threadId);
      setRecipientEmail('');
      setSubject('');
      resetComposer();
      setMessageState((prev) => ({
        ...prev,
        threadId,
        thread: nextThread || prev.thread,
        error: '',
        loading: false,
        messages: selectedThreadId ? [...prev.messages, nextMessage] : [nextMessage]
      }));
      directThreads.setData((prev) => updateDirectThreadAfterSend(prev, threadId, nextMessage));
    } catch (error) {
      setComposerError(error.message || 'Could not send private message');
    } finally {
      setSending(false);
    }
  };

  return { onSubmit };
}

export { usePrivateInboxWorkspaceActions };
