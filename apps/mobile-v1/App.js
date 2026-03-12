import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
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
import { styles } from './src/styles';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState({ accessToken: '', refreshToken: '', user: null });
  const [activeTab, setActiveTab] = useState('projects');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [appState, setAppState] = useState(AppState.currentState);
  const pollersRef = useRef(new Map());

  const role = String(session.user?.role || 'client').toLowerCase();
  const staffRole = ['employee', 'manager', 'admin'].includes(role);

  const registerPoller = useCallback((baseKey, intervalMs, callback) => {
    const id = `${baseKey}:${Math.random().toString(36).slice(2)}`;
    const safeInterval = Math.max(1000, Number(intervalMs) || 1000);
    pollersRef.current.set(id, {
      intervalMs: safeInterval,
      nextRunAt: Date.now() + safeInterval,
      callback
    });

    return () => {
      pollersRef.current.delete(id);
    };
  }, []);

  const tabs = useMemo(() => {
    const common = ['account', 'projects', 'quotes', 'inbox', 'notifications', 'services'];
    if (!staffRole) return common;
    return [...common, 'crm', 'inventory'];
  }, [staffRole]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppState(nextState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!session.accessToken || appState !== 'active') return undefined;

    const timer = setInterval(() => {
      const now = Date.now();
      pollersRef.current.forEach((entry) => {
        if (!entry || now < entry.nextRunAt) return;
        entry.nextRunAt = now + entry.intervalMs;
        Promise.resolve(entry.callback()).catch(() => {});
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [appState, session.accessToken]);

  useEffect(() => {
    if (appState !== 'active') return;
    const now = Date.now();
    pollersRef.current.forEach((entry) => {
      if (!entry) return;
      entry.nextRunAt = now + entry.intervalMs;
    });
  }, [appState, session.accessToken]);

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
        {activeTab === 'projects' ? <ProjectsScreen accessToken={session.accessToken} registerPoller={registerPoller} /> : null}
        {activeTab === 'quotes' ? <QuotesScreen accessToken={session.accessToken} registerPoller={registerPoller} /> : null}
        {activeTab === 'inbox' ? <InboxScreen accessToken={session.accessToken} registerPoller={registerPoller} /> : null}
        {activeTab === 'notifications' ? <NotificationsScreen accessToken={session.accessToken} registerPoller={registerPoller} /> : null}
        {activeTab === 'services' ? <ServiceCatalogueScreen accessToken={session.accessToken} registerPoller={registerPoller} /> : null}
        {activeTab === 'crm' && staffRole ? <CrmScreen accessToken={session.accessToken} registerPoller={registerPoller} /> : null}
        {activeTab === 'inventory' && staffRole ? <InventoryScreen accessToken={session.accessToken} registerPoller={registerPoller} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
