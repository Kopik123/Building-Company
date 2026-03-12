import React from 'react';
import { Text, View } from 'react-native';
import { useApiList } from './useApiList';
import { styles } from './styles';

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

export function AccountScreen({ user, unreadCount }) {
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

export function NotificationsScreen({ accessToken, registerPoller }) {
  const list = useApiList('/notifications?page=1&pageSize=30', accessToken, 30000, registerPoller);
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

export function InboxScreen({ accessToken, registerPoller }) {
  const list = useApiList('/messages/threads?page=1&pageSize=30', accessToken, 20000, registerPoller);
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

export function ProjectsScreen({ accessToken, registerPoller }) {
  const list = useApiList('/projects?page=1&pageSize=30', accessToken, 20000, registerPoller);
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

export function QuotesScreen({ accessToken, registerPoller }) {
  const list = useApiList('/quotes?page=1&pageSize=30', accessToken, 20000, registerPoller);
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

export function CrmScreen({ accessToken, registerPoller }) {
  const clients = useApiList('/crm/clients?page=1&pageSize=30', accessToken, 30000, registerPoller);
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

export function InventoryScreen({ accessToken, registerPoller }) {
  const materials = useApiList('/inventory/materials?page=1&pageSize=30', accessToken, 30000, registerPoller);
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

export function ServiceCatalogueScreen({ accessToken, registerPoller }) {
  const list = useApiList('/services', accessToken, 60000, registerPoller);
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
