import {
  AccountPage,
  OverviewPage
} from './pages/account-overview.jsx';
import { ProjectsPage } from './pages/projects.jsx';
import { QuotesPage } from './pages/quotes.jsx';
import { PrivateInboxPage } from './pages/private-inbox.jsx';
import { MessagesPage } from './pages/messages.jsx';
import { NotificationsPage } from './pages/notifications.jsx';
import { CrmPage } from './pages/crm.jsx';
import { InventoryPage } from './pages/inventory.jsx';
import { ServiceCataloguePage } from './pages/service-catalogue.jsx';

const workspaceRouteDefinitions = [
  {
    path: '/overview',
    label: 'Overview',
    description: 'Role-aware summary and activity feed.',
    component: OverviewPage
  },
  {
    path: '/account',
    label: 'Account',
    description: 'Session, role and profile summary.',
    component: AccountPage
  },
  {
    path: '/projects',
    label: 'Projects',
    description: 'Project lifecycle, ownership and linked delivery routes.',
    component: ProjectsPage
  },
  {
    path: '/quotes',
    label: 'Quotes',
    description: 'Quote intake, estimates and approval workflow.',
    component: QuotesPage
  },
  {
    path: '/private-inbox',
    label: 'Private Inbox',
    description: 'Direct threads between clients and staff.',
    component: PrivateInboxPage
  },
  {
    path: '/messages',
    label: 'Project Chat',
    description: 'Project and quote group coordination routes.',
    component: MessagesPage
  },
  {
    path: '/notifications',
    label: 'Notifications',
    description: 'Unread and historical workflow alerts.',
    component: NotificationsPage
  },
  {
    path: '/services-catalogue',
    label: 'Services',
    description: 'Public service catalogue and rollout summary.',
    component: ServiceCataloguePage
  },
  {
    path: '/crm',
    label: 'CRM',
    description: 'Clients, staff and lifecycle visibility.',
    component: CrmPage,
    staffOnly: true
  },
  {
    path: '/inventory',
    label: 'Inventory',
    description: 'Service/material operations and stock control.',
    component: InventoryPage,
    staffOnly: true
  }
];

const workspaceNavItems = workspaceRouteDefinitions.map(({ path, label, description, staffOnly = false }) => ({
  path,
  label,
  description,
  staffOnly
}));

export { workspaceNavItems, workspaceRouteDefinitions };
