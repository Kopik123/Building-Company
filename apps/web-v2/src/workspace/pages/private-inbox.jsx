import { PrivateInboxPanels } from '../components/private-inbox-sections.jsx';
import { usePrivateInboxWorkspaceController } from '../hooks/use-private-inbox-workspace-controller.js';

function PrivateInboxPage() {
  const { sidebarPanel, conversationPanel } = usePrivateInboxWorkspaceController();

  return <PrivateInboxPanels sidebarPanel={sidebarPanel} conversationPanel={conversationPanel} />;
}

export { PrivateInboxPage };
