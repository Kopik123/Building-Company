import React from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { styles } from './styles';

export function getTabsForRole(staffRole) {
  const commonTabs = ['account', 'projects', 'quotes', 'inbox', 'notifications', 'services'];
  return staffRole ? [...commonTabs, 'crm', 'inventory'] : commonTabs;
}

export function LoggedOutScreen({
  email,
  password,
  loading,
  error,
  onEmailChange,
  onPasswordChange,
  onLogin
}) {
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
          onChangeText={onEmailChange}
        />
        <TextInput
          style={styles.input}
          placeholder="password"
          secureTextEntry
          value={password}
          onChangeText={onPasswordChange}
        />
        <Pressable onPress={onLogin} style={styles.button} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign in'}</Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

export function LoggedInShell({
  role,
  user,
  tabs,
  activeTab,
  onTabChange,
  onLogout,
  children
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>Role: {role}</Text>
          <Text style={styles.subtitle}>{user.name || user.email}</Text>
          <View style={styles.tabWrap}>
            {tabs.map((tab) => (
              <Pressable
                key={tab}
                style={[styles.tabBtn, activeTab === tab ? styles.tabBtnActive : null]}
                onPress={() => onTabChange(tab)}
              >
                <Text style={styles.tabText}>{tab}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={onLogout} style={styles.buttonSecondary}>
            <Text style={styles.buttonText}>Logout</Text>
          </Pressable>
        </View>

        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
