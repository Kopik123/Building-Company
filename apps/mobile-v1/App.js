import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Constants from 'expo-constants';

const API_BASE = Constants?.expoConfig?.extra?.apiBaseUrl || 'https://levellines.co.uk/api/v2';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Request failed');
  }
  return payload?.data || {};
}

async function authRequest(path, accessToken) {
  return request(path, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

function useApiList(path, accessToken, pollMs = 0) {
  const [state, setState] = useState({ loading: true, error: '', items: [] });

  useEffect(() => {
    let active = true;
    let timer = null;

    const load = async () => {
      if (!accessToken) return;
      setState((prev) => ({ ...prev, loading: true, error: '' }));
      try {
        const data = await authRequest(path, accessToken);
        const key = Object.keys(data).find((item) => Array.isArray(data[item]));
        const items = key ? data[key] : [];
        if (active) setState({ loading: false, error: '', items });
      } catch (error) {
        if (active) setState({ loading: false, error: error.message || 'Could not load data', items: [] });
      }
    };

    load();

    if (pollMs > 0) {
      timer = setInterval(load, pollMs);
    }

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [path, accessToken, pollMs]);

  return state;
}

function ScreenCard({ title, loading, error, items, renderItem }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {loading ? <Text style={styles.muted}>Loading...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && !items.length ? <Text style={styles.muted}>No records.</Text> : null}
      {items.map((item, index) => (
        <View key={item.id || `${title}-${index}`} style={styles.item}>
          {renderItem(item)}
        </View>
      ))}
    </View>
  );
}

function AccountScreen({ user, unreadCount }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Account</Text>
      <Text style={styles.line}>{user.name || user.email}</Text>
      <Text style={styles.line}>Role: {user.role}</Text>
      <Text style={styles.line}>Email: {user.email}</Text>
      <Text style={styles.line}>Unread notifications: {unreadCount}</Text>
    </View>
  );
}

function NotificationsScreen({ accessToken }) {
  const list = useApiList('/notifications?page=1&pageSize=30', accessToken, 30000);
  return (
    <ScreenCard
      title="Notifications"
      loading={list.loading}
      error={list.error}
      items={list.items}
      renderItem={(notification) => (
        <>
          <Text style={styles.itemTitle}>{notification.title}</Text>
          <Text style={styles.muted}>{notification.type}</Text>
          <Text>{notification.body}</Text>
        </>
      )}
    />
  );
}

function InboxScreen({ accessToken }) {
  const list = useApiList('/messages/threads?page=1&pageSize=30', accessToken, 20000);
  return (
    <ScreenCard
      title="Inbox / Threads"
      loading={list.loading}
      error={list.error}
      items={list.items}
      renderItem={(thread) => (
        <>
          <Text style={styles.itemTitle}>{thread.name || thread.subject || 'Thread'}</Text>
          <Text style={styles.muted}>Updated: {new Date(thread.updatedAt).toLocaleString('en-GB')}</Text>
        </>
      )}
    />
  );
}

function ProjectsScreen({ accessToken }) {
  const list = useApiList('/projects?page=1&pageSize=30', accessToken, 20000);
  return (
    <ScreenCard
      title="Projects"
      loading={list.loading}
      error={list.error}
      items={list.items}
      renderItem={(project) => (
        <>
          <Text style={styles.itemTitle}>{project.title || 'Untitled project'}</Text>
          <Text style={styles.muted}>
            {project.status} | {project.location || '-'}
          </Text>
        </>
      )}
    />
  );
}

function QuotesScreen({ accessToken }) {
  const list = useApiList('/quotes?page=1&pageSize=30', accessToken, 20000);
  return (
    <ScreenCard
      title="Quotes"
      loading={list.loading}
      error={list.error}
      items={list.items}
      renderItem={(quote) => (
        <>
          <Text style={styles.itemTitle}>{quote.projectType || 'Quote'}</Text>
          <Text style={styles.muted}>
            {quote.status} | priority {quote.priority}
          </Text>
          <Text>{quote.description || ''}</Text>
        </>
      )}
    />
  );
}

function CrmScreen({ accessToken }) {
  const clients = useApiList('/crm/clients?page=1&pageSize=30', accessToken, 30000);
  return (
    <ScreenCard
      title="CRM Clients"
      loading={clients.loading}
      error={clients.error}
      items={clients.items}
      renderItem={(client) => (
        <>
          <Text style={styles.itemTitle}>{client.name || 'Client'}</Text>
          <Text style={styles.muted}>{client.email}</Text>
        </>
      )}
    />
  );
}

function InventoryScreen({ accessToken }) {
  const materials = useApiList('/inventory/materials?page=1&pageSize=30', accessToken, 30000);
  return (
    <ScreenCard
      title="Inventory"
      loading={materials.loading}
      error={materials.error}
      items={materials.items}
      renderItem={(material) => (
        <>
          <Text style={styles.itemTitle}>{material.name}</Text>
          <Text style={styles.muted}>
            SKU {material.sku || '-'} | {material.stockQty}/{material.minStockQty}
          </Text>
        </>
      )}
    />
  );
}

function ServiceCatalogueScreen({ accessToken }) {
  const list = useApiList('/services', accessToken, 60000);
  return (
    <ScreenCard
      title="Service Catalogue"
      loading={list.loading}
      error={list.error}
      items={list.items}
      renderItem={(service) => (
        <>
          <Text style={styles.itemTitle}>{service.title}</Text>
          <Text style={styles.muted}>{service.shortDescription || '-'}</Text>
        </>
      )}
    />
  );
}

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

  const tabs = useMemo(() => {
    const common = ['account', 'projects', 'quotes', 'inbox', 'notifications', 'services'];
    if (!staffRole) return common;
    return [...common, 'crm', 'inventory'];
  }, [staffRole]);

  useEffect(() => {
    if (!session.accessToken) return;
    let timer = null;
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
    timer = setInterval(pullUnread, 30000);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [session.accessToken]);

  const login = async () => {
    setError('');
    setLoading(true);
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

  if (!session.user) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>levels+lines Mobile v1</Text>
          <Text style={styles.subtitle}>Unified mobile panel for all roles.</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="email"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Pressable onPress={login} style={styles.button} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign in'}</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>Role: {role}</Text>
          <Text style={styles.subtitle}>{session.user.name || session.user.email}</Text>
          <View style={styles.tabWrap}>
            {tabs.map((tab) => (
              <Pressable
                key={tab}
                style={[styles.tabBtn, activeTab === tab ? styles.tabBtnActive : null]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={styles.tabText}>{tab}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={logout} style={styles.buttonSecondary}>
            <Text style={styles.buttonText}>Logout</Text>
          </Pressable>
        </View>

        {activeTab === 'account' ? <AccountScreen user={session.user} unreadCount={unreadCount} /> : null}
        {activeTab === 'projects' ? <ProjectsScreen accessToken={session.accessToken} /> : null}
        {activeTab === 'quotes' ? <QuotesScreen accessToken={session.accessToken} /> : null}
        {activeTab === 'inbox' ? <InboxScreen accessToken={session.accessToken} /> : null}
        {activeTab === 'notifications' ? <NotificationsScreen accessToken={session.accessToken} /> : null}
        {activeTab === 'services' ? <ServiceCatalogueScreen accessToken={session.accessToken} /> : null}
        {activeTab === 'crm' && staffRole ? <CrmScreen accessToken={session.accessToken} /> : null}
        {activeTab === 'inventory' && staffRole ? <InventoryScreen accessToken={session.accessToken} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f4f4'
  },
  scroll: {
    padding: 16,
    gap: 12
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2d4be',
    padding: 16,
    gap: 10
  },
  item: {
    borderWidth: 1,
    borderColor: '#ececec',
    borderRadius: 8,
    padding: 10,
    marginTop: 8
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111'
  },
  subtitle: {
    color: '#5f5f5f'
  },
  line: {
    color: '#242424'
  },
  itemTitle: {
    fontWeight: '600',
    color: '#111'
  },
  muted: {
    color: '#666'
  },
  input: {
    borderWidth: 1,
    borderColor: '#d3d3d3',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff'
  },
  button: {
    backgroundColor: '#c6a46c',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  buttonSecondary: {
    backgroundColor: '#111',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600'
  },
  tabWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  tabBtn: {
    borderWidth: 1,
    borderColor: '#d8c3a2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff'
  },
  tabBtnActive: {
    backgroundColor: '#ead0a8'
  },
  tabText: {
    fontSize: 12,
    textTransform: 'uppercase'
  },
  error: {
    color: '#9e2424'
  }
});
