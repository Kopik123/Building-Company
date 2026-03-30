import { PrivateInboxSidebarSurface } from './private-inbox/private-inbox-sidebar-surface.jsx';
import { PrivateInboxConversationSurface } from './private-inbox/private-inbox-conversation-surface.jsx';

function PrivateInboxPanels({ sidebarPanel, conversationPanel }) {
  return (
    <div className="messages-shell">
      <PrivateInboxSidebarSurface sidebarPanel={sidebarPanel} />
      <PrivateInboxConversationSurface conversationPanel={conversationPanel} />
    </div>
  );
}

export { PrivateInboxPanels };
