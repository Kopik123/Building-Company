import { Surface, EmptyState, getDirectThreadTitle, getDirectThreadMeta } from '../../kit.jsx';
import { PrivateInboxMessageList } from './private-inbox-message-list.jsx';
import { PrivateInboxComposer } from './private-inbox-composer.jsx';

function PrivateInboxConversationSurface({ conversationPanel }) {
  const { selectedThread, user, staffMode, canStartThread, recipientLabel, messageState } = conversationPanel;

  return (
    <Surface
      eyebrow="Conversation"
      title={selectedThread ? getDirectThreadTitle(selectedThread, user?.id) : 'Start private route'}
      description={
        selectedThread
          ? getDirectThreadMeta(selectedThread) || 'Open the thread and continue the private route.'
          : staffMode
            ? 'Pick an existing person and write the opening message.'
            : canStartThread
              ? `Your private route will open with ${recipientLabel}.`
              : 'A direct route becomes available once a manager is assigned.'
      }
      className="messages-thread-panel"
    >
      {!selectedThread && !canStartThread ? <EmptyState text="No private route can be opened yet." /> : null}
      <PrivateInboxMessageList selectedThread={selectedThread} messageState={messageState} user={user} />
      <PrivateInboxComposer {...conversationPanel} />
    </Surface>
  );
}

export { PrivateInboxConversationSurface };
