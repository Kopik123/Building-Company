import React, { useEffect, useState } from 'react';
import { authRequest, request } from './src/api';
import {
  AccountScreen,
  CrmScreen,
  InboxScreen,
  InventoryScreen,
  NotificationsScreen,
  ProjectsScreen,
  QuotesScreen,
  ServiceCatalogueScreen
} from './src/screens';
import { getTabsForRole, LoggedInShell, LoggedOutScreen } from './src/session-shell';
import { usePollerScheduler } from './src/usePollerScheduler';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState({ accessToken: '', refreshToken: '', user: null });
  const [activeTab, setActiveTab] = useState('projects');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const role = String(session.user?.role || 'client').toLowerCase();
  const staffRole = ['employee', 'manager', 'admin'].includes(role);
  const tabs = getTabsForRole(staffRole);
  const { registerPoller } = usePollerScheduler(Boolean(session.accessToken));

  useEffect(() => {
    if (!session.accessToken) return undefined;
    let active = true;

    const pullUnread = async () => {
      try {
        const data = await authRequest('/notifications/unread-count', session.accessToken);
        if (active) setUnreadCount(Number(data.count || 0));
      } catch {
        if (active) setUnreadCount(0);
      }
    };

    pullUnread();
    const unregister = registerPoller('notifications-unread', 30000, pullUnread);

    return () => {
      active = false;
      unregister();
    };
  }, [registerPoller, session.accessToken]);

  const login = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      setSession({
        accessToken: data.accessToken || '',
        refreshToken: data.refreshToken || '',
        user: data.user || null
      });
      setActiveTab('projects');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setSession({ accessToken: '', refreshToken: '', user: null });
    setPassword('');
    setUnreadCount(0);
  };

  const renderActiveTab = () => {
    if (activeTab === 'account') {
      return <AccountScreen user={session.user} unreadCount={unreadCount} />;
    }
    if (activeTab === 'projects') {
      return <ProjectsScreen accessToken={session.accessToken} registerPoller={registerPoller} />;
    }
    if (activeTab === 'quotes') {
      return <QuotesScreen accessToken={session.accessToken} registerPoller={registerPoller} />;
    }
    if (activeTab === 'inbox') {
      return <InboxScreen accessToken={session.accessToken} registerPoller={registerPoller} />;
    }
    if (activeTab === 'notifications') {
      return <NotificationsScreen accessToken={session.accessToken} registerPoller={registerPoller} />;
    }
    if (activeTab === 'services') {
      return <ServiceCatalogueScreen accessToken={session.accessToken} registerPoller={registerPoller} />;
    }
    if (activeTab === 'crm' && staffRole) {
      return <CrmScreen accessToken={session.accessToken} registerPoller={registerPoller} />;
    }
    if (activeTab === 'inventory' && staffRole) {
      return <InventoryScreen accessToken={session.accessToken} registerPoller={registerPoller} />;
    }
    return null;
  };

  if (!session.user) {
    return (
      <LoggedOutScreen
        email={email}
        password={password}
        loading={loading}
        error={error}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onLogin={login}
      />
    );
  }

  return (
    <LoggedInShell
      role={role}
      user={session.user}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={logout}
    >
      {renderActiveTab()}
    </LoggedInShell>
  );
}
