import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Constants from 'expo-constants';
import { Pressable, View } from 'react-native';
import mobileContracts from '@building-company/mobile-contracts';
import mobileCore from '@building-company/mobile-core';
import mobileHooks from '@building-company/mobile-core/react';
import mobileUI from '@building-company/mobile-ui';

const {
  APP_VARIANTS,
  QUOTE_PROJECT_TYPES,
  QUOTE_PROPOSAL_PROPERTY_TYPES,
  QUOTE_PROPOSAL_PLANNING_STAGES,
  QUOTE_PROPOSAL_START_WINDOWS,
  QUOTE_PROPOSAL_ROOM_TYPES,
  QUOTE_PROPOSAL_PRIORITIES
} = mobileContracts;
const {
  createApiClient,
  createDefaultQuoteForm,
  createEmptySession,
  formatDateTime,
  resolveApiBaseFromExpoConfig
} = mobileCore;
const { useAsyncResource, usePollerScheduler } = mobileHooks;
const {
  ActionButton,
  AppScreen,
  ChoiceChipGroup,
  EmptyState,
  InputField,
  ListCard,
  MetricGrid,
  Notice,
  SectionCard,
  TabBar,
  styles
} = mobileUI;

const AUTH_TABS = [
  { key: 'signin', label: 'Sign in' },
  { key: 'register', label: 'Register' },
  { key: 'quote', label: 'Submit quote' },
  { key: 'claim', label: 'Claim quote' }
];

const CLIENT_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'quotes', label: 'Quotes' },
  { key: 'projects', label: 'Projects' },
  { key: 'inbox', label: 'Inbox' },
  { key: 'notifications', label: 'Alerts' },
  { key: 'account', label: 'Account' }
];

const QUOTE_STEPS = [
  { key: 'basics', label: 'Basics' },
  { key: 'scope', label: 'Scope' },
  { key: 'brief', label: 'Brief' }
];

const labelize = (value) =>
  String(value || '')
    .split('_')
    .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
    .join(' ');

const optionSet = (values) => values.map((value) => ({ value, label: labelize(value) }));

const PROJECT_TYPE_OPTIONS = optionSet(QUOTE_PROJECT_TYPES);
const PROPERTY_TYPE_OPTIONS = optionSet(QUOTE_PROPOSAL_PROPERTY_TYPES);
const PLANNING_STAGE_OPTIONS = optionSet(QUOTE_PROPOSAL_PLANNING_STAGES);
const START_WINDOW_OPTIONS = optionSet(QUOTE_PROPOSAL_START_WINDOWS);
const ROOM_OPTIONS = optionSet(QUOTE_PROPOSAL_ROOM_TYPES);
const PRIORITY_OPTIONS = optionSet(QUOTE_PROPOSAL_PRIORITIES);

const isStepValid = (form, step) => {
  if (step === 0) {
    return Boolean(form.name && form.email && form.phone && form.projectType && form.budgetRange);
  }
  if (step === 1) {
    return Boolean(form.location && form.roomsInvolved.length);
  }
  return Boolean(form.summary);
};

function ClientApp() {
  const apiBase = useMemo(() => resolveApiBaseFromExpoConfig(Constants?.expoConfig?.extra || {}), []);
  const api = useMemo(() => createApiClient({ apiBase }), [apiBase]);

  const [session, setSession] = useState(createEmptySession());
  const [activeTab, setActiveTab] = useState('overview');
  const [authMode, setAuthMode] = useState('signin');
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', phone: '', companyName: '' });
  const [quoteForm, setQuoteForm] = useState(createDefaultQuoteForm());
  const [quoteStep, setQuoteStep] = useState(0);
  const [publicPreviewToken, setPublicPreviewToken] = useState('');
  const [publicQuotePreview, setPublicQuotePreview] = useState(null);
  const [claimForm, setClaimForm] = useState({ guestEmail: '', guestPhone: '', claimCode: '' });
  const [pendingClaim, setPendingClaim] = useState(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState('');
  const [estimateDecisionNote, setEstimateDecisionNote] = useState('');
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', companyName: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });

  const role = String(session.user?.role || '');
  const roleAllowed = !session.user || mobileContracts.isRoleAllowedForVariant(role, APP_VARIANTS[0]);
  const { registerPoller } = usePollerScheduler(Boolean(session.accessToken && roleAllowed));

  useEffect(() => {
    setProfileForm({
      name: session.user?.name || '',
      phone: session.user?.phone || '',
      companyName: session.user?.companyName || ''
    });
  }, [session.user]);

  const loadOverview = useCallback(() => api.loadOverview(session.accessToken), [api, session.accessToken]);
  const overviewResource = useAsyncResource(loadOverview, [session.accessToken, activeTab], {
    enabled: Boolean(session.accessToken && roleAllowed && activeTab === 'overview'),
    initialValue: null,
    pollMs: 30000,
    pollKey: 'client-overview',
    registerPoller
  });

  const loadQuotes = useCallback(() => api.listQuotes(session.accessToken), [api, session.accessToken]);
  const quotesResource = useAsyncResource(loadQuotes, [session.accessToken, activeTab], {
    enabled: Boolean(session.accessToken && roleAllowed && activeTab === 'quotes'),
    initialValue: [],
    pollMs: 30000,
    pollKey: 'client-quotes',
    registerPoller
  });

  const loadQuoteDetail = useCallback(() => api.getQuoteDetail(session.accessToken, selectedQuoteId), [api, selectedQuoteId, session.accessToken]);
  const quoteDetailResource = useAsyncResource(loadQuoteDetail, [session.accessToken, selectedQuoteId, activeTab], {
    enabled: Boolean(session.accessToken && roleAllowed && activeTab === 'quotes' && selectedQuoteId),
    initialValue: null
  });

  const loadProjects = useCallback(() => api.listProjects(session.accessToken), [api, session.accessToken]);
  const projectsResource = useAsyncResource(loadProjects, [session.accessToken, activeTab], {
    enabled: Boolean(session.accessToken && roleAllowed && activeTab === 'projects'),
    initialValue: [],
    pollMs: 30000,
    pollKey: 'client-projects',
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
    pollKey: 'client-inbox',
    registerPoller
  });

  const loadNotifications = useCallback(() => api.listNotifications(session.accessToken), [api, session.accessToken]);
  const notificationsResource = useAsyncResource(loadNotifications, [session.accessToken, activeTab], {
    enabled: Boolean(session.accessToken && roleAllowed && activeTab === 'notifications'),
    initialValue: [],
    pollMs: 30000,
    pollKey: 'client-notifications',
    registerPoller
  });

  useEffect(() => {
    if (!selectedQuoteId && quotesResource.value?.length) {
      setSelectedQuoteId(quotesResource.value[0].id);
    }
  }, [quotesResource.value, selectedQuoteId]);

  const handleSessionReady = useCallback((nextSession) => {
    setSession(nextSession);
    setActiveTab('overview');
    setAuthMode('signin');
    setAuthError('');
    setAuthMessage('');
  }, []);

  const handleLogin = useCallback(async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const nextSession = await api.login(loginForm);
      handleSessionReady(nextSession);
    } catch (error) {
      setAuthError(error.message || 'Could not sign in.');
    } finally {
      setAuthLoading(false);
    }
  }, [api, handleSessionReady, loginForm]);

  const handleRegister = useCallback(async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const nextSession = await api.registerClient(registerForm);
      handleSessionReady(nextSession);
    } catch (error) {
      setAuthError(error.message || 'Could not register.');
    } finally {
      setAuthLoading(false);
    }
  }, [api, handleSessionReady, registerForm]);

  const handleSubmitQuote = useCallback(async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await api.submitPublicQuote(quoteForm);
      setPublicPreviewToken(response.publicToken || '');
      setPublicQuotePreview({
        id: response.quoteId || null,
        workflowStatus: response.workflowStatus || response.status || 'submitted',
        attachmentCount: Number(response.attachmentCount || 0),
        proposalDetails: response.proposalDetails || null
      });
      setClaimForm((previous) => ({
        ...previous,
        guestEmail: quoteForm.email,
        guestPhone: quoteForm.phone
      }));
      setAuthMessage('Quote submitted. Keep the private token so you can preview and claim it later.');
      setAuthMode('claim');
    } catch (error) {
      setAuthError(error.message || 'Quote submit failed.');
    } finally {
      setAuthLoading(false);
    }
  }, [api, quoteForm]);

  const handlePreviewQuote = useCallback(async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await api.previewPublicQuote(publicPreviewToken);
      setPublicQuotePreview(response.quote || null);
      setAuthMessage('Private quote preview loaded.');
    } catch (error) {
      setPublicQuotePreview(null);
      setAuthError(error.message || 'Could not load the private quote preview.');
    } finally {
      setAuthLoading(false);
    }
  }, [api, publicPreviewToken]);

  const handleRequestClaim = useCallback(async (channel) => {
    if (!publicQuotePreview?.id) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await api.requestQuoteClaim(publicQuotePreview.id, {
        channel,
        guestEmail: claimForm.guestEmail,
        guestPhone: claimForm.guestPhone
      });
      setPendingClaim({
        quoteId: publicQuotePreview.id,
        publicToken: publicPreviewToken,
        claimToken: response.claimToken,
        channel
      });
      setAuthMessage('Claim code sent. Sign in or register, then confirm the code below.');
      if (!session.user) {
        setAuthMode('signin');
      }
    } catch (error) {
      setAuthError(error.message || 'Could not send claim code.');
    } finally {
      setAuthLoading(false);
    }
  }, [api, claimForm.guestEmail, claimForm.guestPhone, publicPreviewToken, publicQuotePreview?.id, session.user]);

  const handleConfirmClaim = useCallback(async () => {
    if (!session.accessToken || !pendingClaim?.quoteId || !pendingClaim.claimToken) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      await api.confirmQuoteClaim(pendingClaim.quoteId, session.accessToken, {
        claimToken: pendingClaim.claimToken,
        claimCode: claimForm.claimCode
      });
      if (pendingClaim.publicToken) {
        const preview = await api.previewPublicQuote(pendingClaim.publicToken);
        setPublicQuotePreview(preview.quote || null);
      }
      setPendingClaim(null);
      setClaimForm((previous) => ({ ...previous, claimCode: '' }));
      setAuthMessage('Quote claimed successfully.');
      setActiveTab('quotes');
    } catch (error) {
      setAuthError(error.message || 'Could not confirm the claim.');
    } finally {
      setAuthLoading(false);
    }
  }, [api, claimForm.claimCode, pendingClaim, session.accessToken]);

  const handleEstimateDecision = useCallback(async (decision) => {
    if (!session.accessToken || !quoteDetailResource.value?.latestEstimate?.id) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      await api.respondToEstimate(session.accessToken, quoteDetailResource.value.latestEstimate.id, {
        decision,
        decisionNote: estimateDecisionNote
      });
      await Promise.all([quotesResource.reload({ silent: true }), quoteDetailResource.reload({ silent: true })]);
      setEstimateDecisionNote('');
      setAuthMessage(`Estimate marked as ${decision}.`);
    } catch (error) {
      setAuthError(error.message || 'Could not update the estimate.');
    } finally {
      setAuthLoading(false);
    }
  }, [api, estimateDecisionNote, quoteDetailResource, quotesResource, session.accessToken]);

  const handleProfileUpdate = useCallback(async () => {
    if (!session.accessToken) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await api.updateProfile(session.accessToken, profileForm);
      setSession((previous) => ({
        ...previous,
        user: response.user || previous.user
      }));
      setAuthMessage('Profile updated.');
    } catch (error) {
      setAuthError(error.message || 'Could not update the profile.');
    } finally {
      setAuthLoading(false);
    }
  }, [api, profileForm, session.accessToken]);

  const handlePasswordUpdate = useCallback(async () => {
    if (!session.accessToken) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      await api.changePassword(session.accessToken, passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '' });
      setAuthMessage('Password updated. Sign in again on your next session refresh.');
    } catch (error) {
      setAuthError(error.message || 'Could not update the password.');
    } finally {
      setAuthLoading(false);
    }
  }, [api, passwordForm, session.accessToken]);

  const logout = useCallback(() => {
    setSession(createEmptySession());
    setActiveTab('overview');
  }, []);

  const renderQuoteStep = () => {
    if (quoteStep === 0) {
      return (
        <>
          <InputField label="Name" value={quoteForm.name} onChangeText={(value) => setQuoteForm((previous) => ({ ...previous, name: value }))} />
          <InputField label="Email" value={quoteForm.email} autoCapitalize="none" keyboardType="email-address" onChangeText={(value) => setQuoteForm((previous) => ({ ...previous, email: value }))} />
          <InputField label="Phone" value={quoteForm.phone} keyboardType="phone-pad" onChangeText={(value) => setQuoteForm((previous) => ({ ...previous, phone: value }))} />
          <ChoiceChipGroup options={PROJECT_TYPE_OPTIONS} values={[quoteForm.projectType]} onToggle={(value) => setQuoteForm((previous) => ({ ...previous, projectType: value }))} />
          <InputField label="Budget range" value={quoteForm.budgetRange} onChangeText={(value) => setQuoteForm((previous) => ({ ...previous, budgetRange: value }))} />
        </>
      );
    }
    if (quoteStep === 1) {
      return (
        <>
          <InputField label="Location" value={quoteForm.location} onChangeText={(value) => setQuoteForm((previous) => ({ ...previous, location: value }))} />
          <InputField label="Postcode" value={quoteForm.postcode} autoCapitalize="characters" onChangeText={(value) => setQuoteForm((previous) => ({ ...previous, postcode: value }))} />
          <ChoiceChipGroup options={PROPERTY_TYPE_OPTIONS} values={quoteForm.propertyType ? [quoteForm.propertyType] : []} onToggle={(value) => setQuoteForm((previous) => ({ ...previous, propertyType: value }))} />
          <ChoiceChipGroup options={ROOM_OPTIONS} values={quoteForm.roomsInvolved} onToggle={(value) => setQuoteForm((previous) => ({ ...previous, roomsInvolved: previous.roomsInvolved.includes(value) ? previous.roomsInvolved.filter((entry) => entry !== value) : [...previous.roomsInvolved, value] }))} />
          <ChoiceChipGroup options={PLANNING_STAGE_OPTIONS} values={quoteForm.planningStage ? [quoteForm.planningStage] : []} onToggle={(value) => setQuoteForm((previous) => ({ ...previous, planningStage: value }))} />
          <ChoiceChipGroup options={START_WINDOW_OPTIONS} values={quoteForm.targetStartWindow ? [quoteForm.targetStartWindow] : []} onToggle={(value) => setQuoteForm((previous) => ({ ...previous, targetStartWindow: value }))} />
        </>
      );
    }
    return (
      <>
        <InputField label="Project summary" multiline value={quoteForm.summary} onChangeText={(value) => setQuoteForm((previous) => ({ ...previous, summary: value }))} />
        <InputField label="Must have outcomes" multiline value={quoteForm.mustHaves} onChangeText={(value) => setQuoteForm((previous) => ({ ...previous, mustHaves: value }))} />
        <InputField label="Constraints / notes" multiline value={quoteForm.constraints} onChangeText={(value) => setQuoteForm((previous) => ({ ...previous, constraints: value }))} />
        <ChoiceChipGroup options={PRIORITY_OPTIONS} values={quoteForm.priorities} onToggle={(value) => setQuoteForm((previous) => ({ ...previous, priorities: previous.priorities.includes(value) ? previous.priorities.filter((entry) => entry !== value) : [...previous.priorities, value] }))} />
        <Notice text="Photo uploads remain available in the current web quote flow. The mobile foundation keeps the contract ready for native attachment pickers next." />
      </>
    );
  };

  const renderLoggedOut = () => (
    <AppScreen title="Level Lines Client" subtitle="Quote intake, claim handoff and the first mobile customer portal.">
      <SectionCard title="Start">
        <TabBar tabs={AUTH_TABS} activeKey={authMode} onChange={setAuthMode} />
        <Notice tone="error" text={authError} />
        <Notice tone="success" text={authMessage} />
      </SectionCard>

      {authMode === 'signin' ? (
        <SectionCard title="Sign in" subtitle="Use your customer account to review quotes, projects and messages.">
          <InputField label="Email" value={loginForm.email} autoCapitalize="none" keyboardType="email-address" onChangeText={(value) => setLoginForm((previous) => ({ ...previous, email: value }))} />
          <InputField label="Password" value={loginForm.password} secureTextEntry onChangeText={(value) => setLoginForm((previous) => ({ ...previous, password: value }))} />
          <ActionButton label={authLoading ? 'Signing in...' : 'Sign in'} disabled={authLoading} onPress={handleLogin} />
        </SectionCard>
      ) : null}

      {authMode === 'register' ? (
        <SectionCard title="Register" subtitle="Create a client account that can claim guest quotes and track projects later.">
          <InputField label="Name" value={registerForm.name} onChangeText={(value) => setRegisterForm((previous) => ({ ...previous, name: value }))} />
          <InputField label="Email" value={registerForm.email} autoCapitalize="none" keyboardType="email-address" onChangeText={(value) => setRegisterForm((previous) => ({ ...previous, email: value }))} />
          <InputField label="Password" value={registerForm.password} secureTextEntry onChangeText={(value) => setRegisterForm((previous) => ({ ...previous, password: value }))} />
          <InputField label="Phone" value={registerForm.phone} keyboardType="phone-pad" onChangeText={(value) => setRegisterForm((previous) => ({ ...previous, phone: value }))} />
          <InputField label="Company / household label" value={registerForm.companyName} onChangeText={(value) => setRegisterForm((previous) => ({ ...previous, companyName: value }))} />
          <ActionButton label={authLoading ? 'Creating account...' : 'Register'} disabled={authLoading} onPress={handleRegister} />
        </SectionCard>
      ) : null}

      {authMode === 'quote' ? (
        <SectionCard title="Submit quote" subtitle="A phased mobile-safe quote intake aligned with the new structured proposal contract.">
          <TabBar tabs={QUOTE_STEPS} activeKey={QUOTE_STEPS[quoteStep].key} onChange={(key) => setQuoteStep(Math.max(0, QUOTE_STEPS.findIndex((item) => item.key === key)))} />
          {renderQuoteStep()}
          <View style={styles.tabs}>
            {quoteStep > 0 ? <ActionButton label="Back" ghost onPress={() => setQuoteStep((value) => Math.max(0, value - 1))} /> : null}
            {quoteStep < QUOTE_STEPS.length - 1 ? (
              <ActionButton label="Next" disabled={!isStepValid(quoteForm, quoteStep)} onPress={() => setQuoteStep((value) => Math.min(QUOTE_STEPS.length - 1, value + 1))} />
            ) : (
              <ActionButton label={authLoading ? 'Sending...' : 'Send quote'} disabled={authLoading || !isStepValid(quoteForm, quoteStep)} onPress={handleSubmitQuote} />
            )}
          </View>
        </SectionCard>
      ) : null}

      {authMode === 'claim' ? (
        <SectionCard title="Claim guest quote" subtitle="Load your private quote preview first, then request a code by email or phone.">
          <InputField label="Private quote token" value={publicPreviewToken} autoCapitalize="none" onChangeText={setPublicPreviewToken} />
          <ActionButton label={authLoading ? 'Loading preview...' : 'Load preview'} disabled={authLoading || !publicPreviewToken} onPress={handlePreviewQuote} />
          {publicQuotePreview ? (
            <>
              <ListCard
                title={`Quote ${publicQuotePreview.projectType || 'request'}`}
                meta={`${labelize(publicQuotePreview.workflowStatus || 'submitted')} • ${publicQuotePreview.location || 'Location pending'}`}
                body={`Photos attached: ${publicQuotePreview.attachmentCount || 0}`}
              />
              <InputField label="Quote email" value={claimForm.guestEmail} autoCapitalize="none" keyboardType="email-address" onChangeText={(value) => setClaimForm((previous) => ({ ...previous, guestEmail: value }))} />
              <InputField label="Quote phone" value={claimForm.guestPhone} keyboardType="phone-pad" onChangeText={(value) => setClaimForm((previous) => ({ ...previous, guestPhone: value }))} />
              <View style={styles.tabs}>
                <ActionButton label="Send code by email" ghost onPress={() => handleRequestClaim('email')} />
                <ActionButton label="Send code by phone" ghost onPress={() => handleRequestClaim('phone')} />
              </View>
            </>
          ) : null}
        </SectionCard>
      ) : null}
    </AppScreen>
  );

  const renderOverview = () => {
    if (overviewResource.loading) return <SectionCard title="Overview"><EmptyState text="Loading mobile overview..." /></SectionCard>;
    if (overviewResource.error) return <SectionCard title="Overview"><Notice tone="error" text={overviewResource.error} /></SectionCard>;
    if (!overviewResource.value) return null;
    const metrics = overviewResource.value.metrics;
    return (
      <SectionCard title="Overview" subtitle="The same role-aware dashboard summary used by the responsive web rollout shell.">
        <MetricGrid
          items={[
            { label: 'Projects', value: metrics.projectCount },
            { label: 'Quotes', value: metrics.quoteCount },
            { label: 'Unread alerts', value: metrics.unreadNotificationCount },
            { label: 'Direct threads', value: metrics.directThreadCount }
          ]}
        />
      </SectionCard>
    );
  };

  const renderQuotes = () => (
    <SectionCard title="My quotes" subtitle="Review workflow state, estimate history and the current approval action from mobile.">
      {quotesResource.loading ? <EmptyState text="Loading quotes..." /> : null}
      {quotesResource.error ? <Notice tone="error" text={quotesResource.error} /> : null}
      {quotesResource.value?.map((quote) => (
        <Pressable key={quote.id} onPress={() => setSelectedQuoteId(quote.id)}>
          <ListCard
            title={labelize(quote.projectType || 'quote')}
            meta={`${labelize(quote.workflowStatus)} • ${quote.location || 'Location pending'}`}
            body={quote.description || 'No summary yet.'}
          />
        </Pressable>
      ))}
      {!quotesResource.loading && !quotesResource.value?.length ? <EmptyState text="No quotes yet." /> : null}

      {quoteDetailResource.value ? (
        <SectionCard title="Selected quote" subtitle={`Detail for ${labelize(quoteDetailResource.value.projectType || 'quote')}`}>
          <ListCard
            title={labelize(quoteDetailResource.value.workflowStatus)}
            meta={`Submitted ${formatDateTime(quoteDetailResource.value.submittedAt || quoteDetailResource.value.createdAt)}`}
            body={`Attachments: ${quoteDetailResource.value.attachmentCount} • Estimate versions: ${quoteDetailResource.value.estimateCount}`}
          />
          {quoteDetailResource.value.latestEstimate ? (
            <>
              <ListCard
                title={quoteDetailResource.value.latestEstimate.title || 'Current estimate'}
                meta={`${labelize(quoteDetailResource.value.latestEstimate.status)} • ${labelize(quoteDetailResource.value.latestEstimate.decisionStatus)}`}
                body={quoteDetailResource.value.latestEstimate.clientMessage || 'No manager message yet.'}
              />
              <InputField label="Decision note" multiline value={estimateDecisionNote} onChangeText={setEstimateDecisionNote} />
              <View style={styles.tabs}>
                <ActionButton label="Accept" onPress={() => handleEstimateDecision('accepted')} />
                <ActionButton label="Ask for revision" ghost onPress={() => handleEstimateDecision('revision_requested')} />
                <ActionButton label="Decline" secondary onPress={() => handleEstimateDecision('declined')} />
              </View>
            </>
          ) : (
            <EmptyState text="No estimate version has been sent for this quote yet." />
          )}
        </SectionCard>
      ) : null}
    </SectionCard>
  );

  const renderProjects = () => (
    <SectionCard title="My projects">
      {projectsResource.loading ? <EmptyState text="Loading projects..." /> : null}
      {projectsResource.error ? <Notice tone="error" text={projectsResource.error} /> : null}
      {projectsResource.value?.map((project) => (
        <ListCard
          key={project.id}
          title={project.title || 'Untitled project'}
          meta={`${labelize(project.projectStage || project.status)} • due ${project.dueDate || 'TBC'}`}
          body={project.location || 'Location pending'}
        />
      ))}
      {!projectsResource.loading && !projectsResource.value?.length ? <EmptyState text="No projects yet." /> : null}
    </SectionCard>
  );

  const renderInbox = () => (
    <SectionCard title="Inbox">
      {inboxResource.loading ? <EmptyState text="Loading inbox..." /> : null}
      {inboxResource.error ? <Notice tone="error" text={inboxResource.error} /> : null}
      {inboxResource.value?.directThreads?.map((thread) => (
        <ListCard
          key={thread.id}
          title={thread.counterparty?.name || thread.counterparty?.email || 'Direct thread'}
          meta={`Direct • ${thread.unreadCount} unread`}
          body={thread.latestMessagePreview || 'No message preview yet.'}
        />
      ))}
      {inboxResource.value?.groupThreads?.map((thread) => (
        <ListCard
          key={thread.id}
          title={thread.name || thread.subject || 'Project chat'}
          meta={`Project thread • ${thread.messageCount} messages`}
          body={thread.latestMessagePreview || 'No message preview yet.'}
        />
      ))}
      {!inboxResource.loading && !inboxResource.value?.directThreads?.length && !inboxResource.value?.groupThreads?.length ? (
        <EmptyState text="No inbox threads yet." />
      ) : null}
    </SectionCard>
  );

  const renderNotifications = () => (
    <SectionCard title="Notifications">
      {notificationsResource.loading ? <EmptyState text="Loading alerts..." /> : null}
      {notificationsResource.error ? <Notice tone="error" text={notificationsResource.error} /> : null}
      {notificationsResource.value?.map((notification) => (
        <ListCard
          key={notification.id}
          title={notification.title || 'Notification'}
          meta={`${notification.type || 'update'} • ${formatDateTime(notification.createdAt)}`}
          body={notification.body || ''}
        />
      ))}
      {!notificationsResource.loading && !notificationsResource.value?.length ? <EmptyState text="No notifications yet." /> : null}
    </SectionCard>
  );

  const renderAccount = () => (
    <SectionCard title="Account" subtitle="Profile and password management stay aligned with the v2 auth contract.">
      <Notice tone="error" text={authError} />
      <Notice tone="success" text={authMessage} />
      <InputField label="Name" value={profileForm.name} onChangeText={(value) => setProfileForm((previous) => ({ ...previous, name: value }))} />
      <InputField label="Phone" value={profileForm.phone} onChangeText={(value) => setProfileForm((previous) => ({ ...previous, phone: value }))} />
      <InputField label="Company / household label" value={profileForm.companyName} onChangeText={(value) => setProfileForm((previous) => ({ ...previous, companyName: value }))} />
      <ActionButton label="Update profile" onPress={handleProfileUpdate} />
      <InputField label="Current password" value={passwordForm.currentPassword} secureTextEntry onChangeText={(value) => setPasswordForm((previous) => ({ ...previous, currentPassword: value }))} />
      <InputField label="New password" value={passwordForm.newPassword} secureTextEntry onChangeText={(value) => setPasswordForm((previous) => ({ ...previous, newPassword: value }))} />
      <ActionButton label="Change password" ghost onPress={handlePasswordUpdate} />
      <ActionButton label="Logout" secondary onPress={logout} />
    </SectionCard>
  );

  if (!session.user) {
    return renderLoggedOut();
  }

  if (!roleAllowed) {
    return (
      <AppScreen title="Client app access" subtitle="This mobile shell is only for client accounts.">
        <SectionCard title="Role blocked">
          <Notice tone="error" text="This account belongs to the company workspace. Use the dedicated Level Lines Company app instead." />
          <ActionButton label="Logout" secondary onPress={logout} />
        </SectionCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen title="Level Lines Client" subtitle={session.user?.name || session.user?.email || 'Customer workspace'}>
      <SectionCard title="Navigation">
        <TabBar tabs={CLIENT_TABS} activeKey={activeTab} onChange={setActiveTab} />
      </SectionCard>
      <Notice tone="error" text={authError} />
      <Notice tone="success" text={authMessage} />
      {pendingClaim ? (
        <SectionCard title="Confirm quote claim" subtitle="You requested a code from the guest quote preview. Finish the claim after signing in.">
          <InputField label="6-digit claim code" value={claimForm.claimCode} keyboardType="number-pad" onChangeText={(value) => setClaimForm((previous) => ({ ...previous, claimCode: value }))} />
          <ActionButton label="Confirm claim" onPress={handleConfirmClaim} />
        </SectionCard>
      ) : null}
      {activeTab === 'overview' ? renderOverview() : null}
      {activeTab === 'quotes' ? renderQuotes() : null}
      {activeTab === 'projects' ? renderProjects() : null}
      {activeTab === 'inbox' ? renderInbox() : null}
      {activeTab === 'notifications' ? renderNotifications() : null}
      {activeTab === 'account' ? renderAccount() : null}
    </AppScreen>
  );
}

export default ClientApp;
