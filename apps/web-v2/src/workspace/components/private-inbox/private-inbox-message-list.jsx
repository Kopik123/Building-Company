import { EmptyState, MessageBubble } from '../../kit.jsx';

function PrivateInboxMessageList({ selectedThread, messageState, user }) {
  if (!selectedThread) {
    return null;
  }

  if (messageState.loading) {
    return <p className="muted">Loading private messages...</p>;
  }

  if (messageState.error) {
    return <p className="error">{messageState.error}</p>;
  }

  if (!messageState.messages.length) {
    return <EmptyState text="This private thread has no messages yet." />;
  }

  return (
    <div className="message-list">
      {messageState.messages.map((message) => (
        <MessageBubble key={message.id} message={message} currentUserId={user?.id} />
      ))}
    </div>
  );
}

export { PrivateInboxMessageList };
