import React, { useCallback, useMemo, useState } from 'react';
import Constants from 'expo-constants';
import mobileContracts from '@building-company/mobile-contracts';
import mobileCore from '@building-company/mobile-core';
import mobileHooks from '@building-company/mobile-core/react';
import mobileUI from '@building-company/mobile-ui';

const { APP_VARIANTS } = mobileContracts;
const { createApiClient, createEmptySession, formatDateTime, resolveApiBaseFromExpoConfig } = mobileCore;
const { useAsyncResource, usePollerScheduler } = mobileHooks;
const {
  ActionButton,
  AppScreen,
  EmptyState,
  InputField,
  ListCard,
  MetricGrid,
  Notice,
  SectionCard,
  TabBar
} = mobileUI;

const COMPANY_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'projects', label: 'Projects' },
  { key: 'quotes', label: 'Quotes' },
  { key: 'estimates', label: 'Estimates' },
  { key: 'inbox', label: 'Inbox' },
  { key: 'notifications', label: 'Alerts' },
  { key: 'crm', label: 'CRM' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'account', label: 'Account' }
];

const labelize = (value) =>
  String(value || '')
    .split('_')
    .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
    .join(' ');

function CompanyApp() {
  const apiBase = useMemo(() => resolveApiBaseFromExpoConfig(Constants?.expoConfig?.extra || {}), []);
  const api = useMemo(() => createApiClient({ apiBase }), [apiBase]);

  const [session, setSession] = useState(createEmptySession());
  const [activeTab, setActiveTab] = useState('overview');
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const role = String(session.user?.role || '');
  const roleAllowed = !session.user || mobileContracts.isRoleAllowedForVariant(role, APP_VARIANTS[1]);
  const { registerPoller } = usePollerScheduler(Boolean(session.accessToken && roleAllowed));

  const loadOverview = useCallback(() => api.loadOverview(session.accessToken), [api, session.accessToken]);
  const overviewResource = useAsyncResource(loadOverview, [session.accessToken, activeTab], {
    enabled: Boolean(session.accessToken && roleAllowed && activeTab === 'overview'),
    initialValue: null,
    pollMs: 30000,
    pollKey: 'company-overview',
    registerPoller
  });

  const loadProjects = useCallback(() => api.listProjects(session.accessToken), [api, session.accessToken]);
  const projectsResource = useAsyncResource(loadProjects, [session.accessToken, activeTab], {
    enabled: Boolean(session.accessToken && roleAllowed && activeTab === 'projects'),
    initialValue: [],
    pollMs: 30000,
    pollKey: 'company-projects',
    registerPoller
  });

  const loadQuotes = useCallback(() => api.listQuotes(session.accessToken), [api, session.accessToken]);
  const quotesResource = useAsyncResource(loadQuotes, [session.accessToken, activeTab], {
    enabled: Boolean(session.accessToken && roleAllowed && ['quotes', 'estimates'].includes(activeTab)),
    initialValue: [],
    pollMs: 25000,
    pollKey: 'company-quotes',
    registerPoller
  });

  const loadInbox = useCallback(async () => ({
    groupThreads: await api.listThreads(session.accessToken),
    directThreads: await api.listDirectThreads(session.accessToken)
  }), [api, session.accessToken]);
  const inboxResource = useAsyncResource(loadInbox, [session.accessToken, activeTab], {
    enabled: Boolean(session.accessToken && roleAllowed && activeTab === 'inbox'),
    initialValue: { groupThreads: [], directThreads: [] },
    pollMs: 25000,
    pollKey: 'company-inbox',
    registerPoller
  });

  const loadNotifications = useCallback(() => api.listNotifications(session.accessToken), [api, session.accessToken]);
  const notificationsResource = useAsyncResource(loadNotifications, [session.accessToken, activeTab], {
    enabled: Boolean(session.accessToken && roleAllowed && activeTab === 'notifications'),
    initialValue: [],
    pollMs: 30000,
    pollKey: 'company-notifications',
    registerPoller
  });

  const loadCrm = useCallback(async () => ({
    clients: await api.listCrmClients(session.accessToken),
    staff: await api.listCrmStaff(session.accessToken)
  }), [api, session.accessToken]);
  const crmResource = useAsyncResource(loadCrm, [session.accessToken, activeTab], {
    enabled: Boolean(session.accessToken && roleAllowed && activeTab === 'crm'),
    initialValue: { clients: [], staff: [] },
    pollMs: 45000,
    pollKey: 'company-crm',
    registerPoller
  });

  const loadInventory = useCallback(async () => ({
    materials: await api.listInventoryMaterials(session.accessToken),
    services: await api.listInventoryServices(session.accessToken)
  }), [api, session.accessToken]);
  const inventoryResource = useAsyncResource(loadInventory, [session.accessToken, activeTab], {
    enabled: Boolean(session.accessToken && roleAllowed && activeTab === 'inventory'),
    initialValue: { materials: [], services: [] },
    pollMs: 45000,
    pollKey: 'company-inventory',
    registerPoller
  });

  const handleLogin = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const nextSession = await api.login(authForm);
      setSession(nextSession);
      setActiveTab('overview');
      setStatusMessage('');
    } catch (error) {
      setErrorMessage(error.message || 'Could not sign in.');
    } finally {
      setLoading(false);
    }
  }, [api, authForm]);

  const handleAssignQuote = useCallback(async (quoteId) => {
    setLoading(true);
    setErrorMessage('');
    try {
      await api.assignQuote(session.accessToken, quoteId, {});
      await quotesResource.reload({ silent: true });
      setStatusMessage('Quote assigned to your workspace.');
    } catch (error) {
      setErrorMessage(error.message || 'Could not assign the quote.');
    } finally {
      setLoading(false);
    }
  }, [api, quotesResource, session.accessToken]);

  const handleConvertQuote = useCallback(async (quoteId) => {
    setLoading(true);
    setErrorMessage('');
    try {
      await api.convertQuoteToProject(session.accessToken, quoteId);
      await Promise.all([
        quotesResource.reload({ silent: true }),
        projectsResource.reload({ silent: true })
      ]);
      setStatusMessage('Quote converted into a project.');
    } catch (error) {
      setErrorMessage(error.message || 'Could not convert the quote.');
    } finally {
      setLoading(false);
    }
  }, [api, projectsResource, quotesResource, session.accessToken]);

  const logout = useCallback(() => {
    setSession(createEmptySession());
    setActiveTab('overview');
  }, []);

  const renderOverview = () => {
    if (overviewResource.loading) return <SectionCard title="Overview"><EmptyState text="Loading company overview..." /></SectionCard>;
    if (overviewResource.error) return <SectionCard title="Overview"><Notice tone="error" text={overviewResource.error} /></SectionCard>;
    if (!overviewResource.value) return null;
    const metrics = overviewResource.value.metrics;
    return (
      <SectionCard title="Overview" subtitle="One mobile-ready summary contract for operations, quotes and messaging.">
        <MetricGrid
          items={[
            { label: 'Projects', value: metrics.projectCount },
            { label: 'Quotes', value: metrics.quoteCount },
            { label: 'Unread alerts', value: metrics.unreadNotificationCount },
            { label: 'Low stock', value: metrics.lowStockMaterialCount }
          ]}
        />
      </SectionCard>
    );
  };

  const renderProjects = () => (
    <SectionCard title="Projects">
      {projectsResource.loading ? <EmptyState text="Loading projects..." /> : null}
      {projectsResource.error ? <Notice tone="error" text={projectsResource.error} /> : null}
      {projectsResource.value?.map((project) => (
        <ListCard
          key={project.id}
          title={project.title || 'Untitled project'}
          meta={`${labelize(project.projectStage || project.status)} • owner ${project.assignedManager?.name || 'Unassigned'}`}
          body={`${project.location || 'Location pending'} • due ${project.dueDate || 'TBC'}`}
        />
      ))}
      {!projectsResource.loading && !projectsResource.value?.length ? <EmptyState text="No projects yet." /> : null}
    </SectionCard>
  );

  const renderQuotes = () => (
    <SectionCard title="Quotes" subtitle="Operational quote actions for staff, manager and admin roles.">
      {quotesResource.loading ? <EmptyState text="Loading quotes..." /> : null}
      {quotesResource.error ? <Notice tone="error" text={quotesResource.error} /> : null}
      {quotesResource.value?.map((quote) => (
        <ListCard
          key={quote.id}
          title={labelize(quote.projectType || 'quote')}
          meta={`${labelize(quote.workflowStatus)} • ${quote.assignedManager?.name || 'Unassigned'}`}
          body={quote.location || 'Location pending'}
        >
          <ActionButton label="Assign to me" ghost onPress={() => handleAssignQuote(quote.id)} />
          {quote.canConvertToProject ? <ActionButton label="Convert to project" onPress={() => handleConvertQuote(quote.id)} /> : null}
        </ListCard>
      ))}
      {!quotesResource.loading && !quotesResource.value?.length ? <EmptyState text="No quotes yet." /> : null}
    </SectionCard>
  );

  const renderEstimates = () => (
    <SectionCard title="Estimates" subtitle="Versioned estimate status is exposed through quote detail contracts and latest-estimate summaries.">
      {quotesResource.loading ? <EmptyState text="Loading estimates..." /> : null}
      {quotesResource.value?.filter((quote) => quote.latestEstimate).map((quote) => (
        <ListCard
          key={quote.latestEstimate.id}
          title={quote.latestEstimate.title || 'Estimate'}
          meta={`${labelize(quote.latestEstimate.status)} • ${labelize(quote.latestEstimate.decisionStatus)}`}
          body={`Quote: ${labelize(quote.projectType)} • version ${quote.latestEstimate.versionNumber}`}
        />
      ))}
      {!quotesResource.loading && !quotesResource.value?.some((quote) => quote.latestEstimate) ? <EmptyState text="No estimates yet." /> : null}
    </SectionCard>
  );

  const renderInbox = () => (
    <SectionCard title="Inbox">
      {inboxResource.loading ? <EmptyState text="Loading inbox..." /> : null}
      {inboxResource.error ? <Notice tone="error" text={inboxResource.error} /> : null}
      {inboxResource.value?.directThreads?.map((thread) => (
        <ListCard key={thread.id} title={thread.counterparty?.name || thread.counterparty?.email || 'Direct thread'} meta={`Direct • ${thread.unreadCount} unread`} body={thread.latestMessagePreview || 'No message preview yet.'} />
      ))}
      {inboxResource.value?.groupThreads?.map((thread) => (
        <ListCard key={thread.id} title={thread.name || thread.subject || 'Project chat'} meta={`Project thread • ${thread.messageCount} messages`} body={thread.latestMessagePreview || 'No message preview yet.'} />
      ))}
      {!inboxResource.loading && !inboxResource.value?.directThreads?.length && !inboxResource.value?.groupThreads?.length ? <EmptyState text="No inbox threads yet." /> : null}
    </SectionCard>
  );

  const renderNotifications = () => (
    <SectionCard title="Notifications">
      {notificationsResource.loading ? <EmptyState text="Loading alerts..." /> : null}
      {notificationsResource.error ? <Notice tone="error" text={notificationsResource.error} /> : null}
      {notificationsResource.value?.map((notification) => (
        <ListCard key={notification.id} title={notification.title || 'Notification'} meta={`${notification.type || 'update'} • ${formatDateTime(notification.createdAt)}`} body={notification.body || ''} />
      ))}
      {!notificationsResource.loading && !notificationsResource.value?.length ? <EmptyState text="No notifications yet." /> : null}
    </SectionCard>
  );

  const renderCrm = () => (
    <SectionCard title="CRM">
      {crmResource.loading ? <EmptyState text="Loading CRM..." /> : null}
      {crmResource.error ? <Notice tone="error" text={crmResource.error} /> : null}
      {crmResource.value?.clients?.map((client) => (
        <ListCard key={client.id} title={client.name || client.email || 'Client'} meta={`Client • ${labelize(client.crmLifecycleStatus)}`} body={client.email || ''} />
      ))}
      {crmResource.value?.staff?.map((staff) => (
        <ListCard key={staff.id} title={staff.name || staff.email || 'Staff'} meta={`Staff • ${labelize(staff.role)}`} body={staff.email || ''} />
      ))}
    </SectionCard>
  );

  const renderInventory = () => (
    <SectionCard title="Inventory">
      {inventoryResource.loading ? <EmptyState text="Loading inventory..." /> : null}
      {inventoryResource.error ? <Notice tone="error" text={inventoryResource.error} /> : null}
      {inventoryResource.value?.materials?.map((material) => (
        <ListCard key={material.id} title={material.name || 'Material'} meta={`${labelize(material.category)} • SKU ${material.sku || '-'}`} body={`Stock ${material.stockQty}/${material.minStockQty}`} />
      ))}
      {inventoryResource.value?.services?.map((service) => (
        <ListCard key={service.id} title={service.title || 'Service'} meta={`${labelize(service.category)} • from ${service.basePriceFrom || 0}`} body={service.shortDescription || ''} />
      ))}
    </SectionCard>
  );

  const renderAccount = () => (
    <SectionCard title="Account">
      <ListCard title={session.user?.name || session.user?.email || 'User'} meta={`Role ${labelize(session.user?.role || '')}`} body={session.user?.email || ''} />
      <ActionButton label="Logout" secondary onPress={logout} />
    </SectionCard>
  );

  if (!session.user) {
    return (
      <AppScreen title="Level Lines Company" subtitle="Dedicated mobile workspace for staff, managers and admins.">
        <SectionCard title="Sign in" subtitle="Use your staff credentials to enter the company workspace.">
          <Notice tone="error" text={errorMessage} />
          <InputField label="Email" value={authForm.email} autoCapitalize="none" keyboardType="email-address" onChangeText={(value) => setAuthForm((previous) => ({ ...previous, email: value }))} />
          <InputField label="Password" value={authForm.password} secureTextEntry onChangeText={(value) => setAuthForm((previous) => ({ ...previous, password: value }))} />
          <ActionButton label={loading ? 'Signing in...' : 'Sign in'} disabled={loading} onPress={handleLogin} />
        </SectionCard>
      </AppScreen>
    );
  }

  if (!roleAllowed) {
    return (
      <AppScreen title="Company app access" subtitle="This mobile shell is only for staff, managers and admins.">
        <SectionCard title="Role blocked">
          <Notice tone="error" text="This account belongs to the client portal. Use the dedicated Level Lines Client app instead." />
          <ActionButton label="Logout" secondary onPress={logout} />
        </SectionCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen title="Level Lines Company" subtitle={session.user?.name || session.user?.email || 'Operational workspace'}>
      <SectionCard title="Navigation">
        <TabBar tabs={COMPANY_TABS} activeKey={activeTab} onChange={setActiveTab} />
      </SectionCard>
      <Notice tone="error" text={errorMessage} />
      <Notice tone="success" text={statusMessage} />
      {activeTab === 'overview' ? renderOverview() : null}
      {activeTab === 'projects' ? renderProjects() : null}
      {activeTab === 'quotes' ? renderQuotes() : null}
      {activeTab === 'estimates' ? renderEstimates() : null}
      {activeTab === 'inbox' ? renderInbox() : null}
      {activeTab === 'notifications' ? renderNotifications() : null}
      {activeTab === 'crm' ? renderCrm() : null}
      {activeTab === 'inventory' ? renderInventory() : null}
      {activeTab === 'account' ? renderAccount() : null}
    </AppScreen>
  );
}

export default CompanyApp;
