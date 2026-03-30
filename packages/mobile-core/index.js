const mobileContracts = require('../mobile-contracts');

const DEFAULT_PAGE_SIZE = 30;
const DEFAULT_QUOTE_LOCATION = 'Manchester and the North West';
const MAX_QUOTE_FILES = 8;

const toArray = (value) => (Array.isArray(value) ? value : []);
const toNullableString = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};
const toNormalizedToken = (value) => {
  const normalized = toNullableString(value);
  return normalized ? normalized.toLowerCase() : null;
};
const toEnumArray = (value, allowed) => {
  const input = Array.isArray(value)
    ? value
    : String(value || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  return [...new Set(input.map((entry) => toNormalizedToken(entry)).filter(Boolean))].filter((entry) => allowed.includes(entry));
};
const toQueryString = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || typeof value === 'undefined' || value === '') return;
    search.set(key, String(value));
  });
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
};

const createEmptySession = () => ({
  user: null,
  accessToken: '',
  refreshToken: '',
  legacyToken: null
});

const createDefaultQuoteForm = () => ({
  name: '',
  email: '',
  phone: '',
  projectType: 'kitchen',
  budgetRange: '',
  location: DEFAULT_QUOTE_LOCATION,
  postcode: '',
  summary: '',
  mustHaves: '',
  constraints: '',
  propertyType: null,
  roomsInvolved: [],
  occupancyStatus: null,
  planningStage: null,
  targetStartWindow: null,
  finishLevel: null,
  siteAccess: null,
  priorities: []
});

const buildDescriptionFromQuoteForm = (form) =>
  [
    form.summary ? `Summary: ${form.summary}` : null,
    form.mustHaves ? `Must have: ${form.mustHaves}` : null,
    form.constraints ? `Constraints: ${form.constraints}` : null
  ]
    .filter(Boolean)
    .join('\n');

const buildQuoteProposalDetails = (form) =>
  mobileContracts.normalizeQuoteProposalDetails({
    version: 1,
    source: 'mobile_client_app_v1',
    projectScope: {
      propertyType: toNormalizedToken(form.propertyType),
      roomsInvolved: toEnumArray(form.roomsInvolved, mobileContracts.QUOTE_PROPOSAL_ROOM_TYPES),
      occupancyStatus: toNormalizedToken(form.occupancyStatus),
      planningStage: toNormalizedToken(form.planningStage),
      targetStartWindow: toNormalizedToken(form.targetStartWindow),
      siteAccess: toNormalizedToken(form.siteAccess)
    },
    commercial: {
      budgetRange: toNullableString(form.budgetRange),
      finishLevel: toNormalizedToken(form.finishLevel)
    },
    logistics: {
      location: toNullableString(form.location) || DEFAULT_QUOTE_LOCATION,
      postcode: toNullableString(form.postcode)
    },
    priorities: toEnumArray(form.priorities, mobileContracts.QUOTE_PROPOSAL_PRIORITIES),
    brief: {
      summary: toNullableString(form.summary),
      mustHaves: toNullableString(form.mustHaves),
      constraints: toNullableString(form.constraints)
    }
  });

const buildPublicQuotePayload = (form) => ({
  guestName: toNullableString(form.name) || '',
  guestEmail: toNullableString(form.email) || '',
  guestPhone: toNullableString(form.phone) || '',
  projectType: toNormalizedToken(form.projectType) || 'other',
  budgetRange: toNullableString(form.budgetRange),
  location: toNullableString(form.location) || DEFAULT_QUOTE_LOCATION,
  postcode: toNullableString(form.postcode),
  contactMethod: 'both',
  description: buildDescriptionFromQuoteForm(form),
  proposalDetails: buildQuoteProposalDetails(form)
});

const buildPushRegistrationPayload = ({
  userRole,
  appVariant,
  platform = 'android',
  provider,
  pushToken,
  deviceId = null,
  deviceName = null,
  appVersion = null
}) => {
  const resolvedPlatform = String(platform || 'android').toLowerCase();
  const resolvedProvider = provider || (resolvedPlatform === 'web' ? 'webpush' : 'expo');
  const resolvedAppVariant = appVariant || mobileContracts.resolveAppVariantForRole(userRole);

  return mobileContracts.pushRegistrationSchema.parse({
    appVariant: resolvedAppVariant,
    platform: resolvedPlatform,
    provider: resolvedProvider,
    pushToken: String(pushToken || ''),
    deviceId: toNullableString(deviceId),
    deviceName: toNullableString(deviceName),
    appVersion: toNullableString(appVersion)
  });
};

const resolveApiBaseFromExpoConfig = (extra = {}) => {
  const explicitBase = typeof extra.apiBaseUrl === 'string' ? extra.apiBaseUrl.trim() : '';
  if (explicitBase) return explicitBase.replace(/\/+$/, '');

  const environment = typeof extra.apiEnvironment === 'string' ? extra.apiEnvironment.trim().toLowerCase() : '';
  const configuredUrls = extra.apiBaseUrls && typeof extra.apiBaseUrls === 'object' ? extra.apiBaseUrls : {};
  const environmentBase = typeof configuredUrls[environment] === 'string' ? configuredUrls[environment].trim() : '';
  if (environmentBase) return environmentBase.replace(/\/+$/, '');

  throw new Error('Missing mobile API base configuration. Set Expo extra.apiBaseUrl or extra.apiBaseUrls for the chosen apiEnvironment.');
};

const buildMultipartFormData = (payload, files = []) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || typeof value === 'undefined' || value === '') return;
    if (key === 'proposalDetails') {
      formData.append(key, JSON.stringify(value));
      return;
    }
    formData.append(key, String(value));
  });

  toArray(files).slice(0, MAX_QUOTE_FILES).forEach((file, index) => {
    if (!file || !file.uri) return;
    formData.append('files', {
      uri: file.uri,
      name: file.name || `quote-photo-${index + 1}.jpg`,
      type: file.type || 'image/jpeg'
    });
  });

  return formData;
};

const unwrapData = (payload) => (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data : payload);

const requestFactory = (apiBase) => {
  const base = String(apiBase || '').replace(/\/+$/, '');

  const requestEnvelope = async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.error?.message || payload?.error || 'Request failed');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  };

  const request = async (path, options = {}) => unwrapData(await requestEnvelope(path, options));
  const authEnvelope = async (path, accessToken, options = {}) =>
    requestEnvelope(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`
      }
    });
  const authRequest = async (path, accessToken, options = {}) => unwrapData(await authEnvelope(path, accessToken, options));

  return { requestEnvelope, request, authEnvelope, authRequest };
};

const toJsonOptions = (method, input) => ({
  method,
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(input)
});

const createApiClient = ({ apiBase }) => {
  const { requestEnvelope, request, authEnvelope, authRequest } = requestFactory(apiBase);

  return {
    request,
    authRequest,
    async login(input) {
      const data = await request('/auth/login', toJsonOptions('POST', input));
      return mobileContracts.normalizeMobileSession(data);
    },
    async registerClient(input) {
      const data = await request('/auth/register', toJsonOptions('POST', input));
      return mobileContracts.normalizeMobileSession(data);
    },
    async refreshSession(refreshToken) {
      const data = await request('/auth/refresh', toJsonOptions('POST', { refreshToken }));
      return mobileContracts.normalizeMobileSession(data);
    },
    loadCurrentUser(accessToken) {
      return authRequest('/auth/me', accessToken);
    },
    updateProfile(accessToken, input) {
      return authRequest('/auth/profile', accessToken, toJsonOptions('PATCH', input));
    },
    changePassword(accessToken, input) {
      return authRequest('/auth/password', accessToken, toJsonOptions('PATCH', input));
    },
    async loadOverview(accessToken) {
      const payload = await authEnvelope('/overview', accessToken);
      return mobileContracts.normalizeItemResponse(payload, 'overview', mobileContracts.normalizeOverviewSummary, mobileContracts.overviewSummarySchema);
    },
    async listProjects(accessToken, params = {}) {
      const payload = await authEnvelope(`/projects${toQueryString({ page: 1, pageSize: DEFAULT_PAGE_SIZE, ...params })}`, accessToken);
      return mobileContracts.normalizeListResponse(payload, 'projects', mobileContracts.normalizeProjectSummary, mobileContracts.projectSummarySchema);
    },
    async listQuotes(accessToken, params = {}) {
      const payload = await authEnvelope(`/quotes${toQueryString({ page: 1, pageSize: DEFAULT_PAGE_SIZE, ...params })}`, accessToken);
      return mobileContracts.normalizeListResponse(payload, 'quotes', mobileContracts.normalizeQuoteSummary, mobileContracts.quoteSummarySchema);
    },
    async getQuoteDetail(accessToken, quoteId) {
      const payload = await authEnvelope(`/quotes/${encodeURIComponent(quoteId)}`, accessToken);
      return mobileContracts.normalizeItemResponse(payload, 'quote', mobileContracts.normalizeQuoteSummary, mobileContracts.quoteSummarySchema);
    },
    async listNotifications(accessToken, params = {}) {
      const payload = await authEnvelope(`/notifications${toQueryString({ page: 1, pageSize: DEFAULT_PAGE_SIZE, ...params })}`, accessToken);
      return mobileContracts.normalizeListResponse(payload, 'notifications', mobileContracts.normalizeNotification, mobileContracts.notificationSchema);
    },
    async listThreads(accessToken, params = {}) {
      const payload = await authEnvelope(`/messages/threads${toQueryString({ page: 1, pageSize: DEFAULT_PAGE_SIZE, ...params })}`, accessToken);
      return mobileContracts.normalizeListResponse(payload, 'threads', mobileContracts.normalizeThreadSummary, mobileContracts.threadSummarySchema);
    },
    async listDirectThreads(accessToken, params = {}) {
      const payload = await authEnvelope(`/messages/direct-threads${toQueryString({ page: 1, pageSize: DEFAULT_PAGE_SIZE, ...params })}`, accessToken);
      return mobileContracts.normalizeListResponse(payload, 'threads', mobileContracts.normalizeDirectThreadSummary, mobileContracts.directThreadSummarySchema);
    },
    async listCrmClients(accessToken, params = {}) {
      const payload = await authEnvelope(`/crm/clients${toQueryString({ page: 1, pageSize: DEFAULT_PAGE_SIZE, ...params })}`, accessToken);
      return mobileContracts.normalizeListResponse(payload, 'clients', mobileContracts.normalizeCrmClient, mobileContracts.crmClientSchema);
    },
    async listCrmStaff(accessToken, params = {}) {
      const payload = await authEnvelope(`/crm/staff${toQueryString({ page: 1, pageSize: DEFAULT_PAGE_SIZE, ...params })}`, accessToken);
      return mobileContracts.normalizeListResponse(payload, 'staff', mobileContracts.normalizeCrmStaffMember, mobileContracts.crmStaffMemberSchema);
    },
    async listInventoryMaterials(accessToken, params = {}) {
      const payload = await authEnvelope(`/inventory/materials${toQueryString({ page: 1, pageSize: DEFAULT_PAGE_SIZE, ...params })}`, accessToken);
      return mobileContracts.normalizeListResponse(payload, 'materials', mobileContracts.normalizeInventoryMaterial, mobileContracts.inventoryMaterialSchema);
    },
    async listInventoryServices(accessToken, params = {}) {
      const payload = await authEnvelope(`/inventory/services${toQueryString({ page: 1, pageSize: DEFAULT_PAGE_SIZE, ...params })}`, accessToken);
      return mobileContracts.normalizeListResponse(payload, 'services', mobileContracts.normalizeInventoryService, mobileContracts.inventoryServiceSchema);
    },
    async listPublicServices() {
      const payload = await requestEnvelope('/services');
      return mobileContracts.normalizeListResponse(payload, 'services', mobileContracts.normalizeInventoryService, mobileContracts.inventoryServiceSchema);
    },
    async respondToEstimate(accessToken, estimateId, input) {
      const payload = await authEnvelope(`/quotes/estimates/${encodeURIComponent(estimateId)}/respond`, accessToken, toJsonOptions('POST', input));
      return {
        quote: mobileContracts.normalizeItemResponse(payload, 'quote', mobileContracts.normalizeQuoteSummary, mobileContracts.quoteSummarySchema),
        estimate: mobileContracts.normalizeItemResponse(payload, 'estimate', mobileContracts.normalizeEstimateSummary, mobileContracts.estimateSummarySchema)
      };
    },
    async assignQuote(accessToken, quoteId, input = {}) {
      const payload = await authEnvelope(`/quotes/${encodeURIComponent(quoteId)}/assign`, accessToken, toJsonOptions('POST', input));
      return mobileContracts.normalizeItemResponse(payload, 'quote', mobileContracts.normalizeQuoteSummary, mobileContracts.quoteSummarySchema);
    },
    async convertQuoteToProject(accessToken, quoteId) {
      const payload = await authEnvelope(`/quotes/${encodeURIComponent(quoteId)}/convert-to-project`, accessToken, { method: 'POST' });
      return {
        quote: mobileContracts.normalizeItemResponse(payload, 'quote', mobileContracts.normalizeQuoteSummary, mobileContracts.quoteSummarySchema),
        project: mobileContracts.normalizeItemResponse(payload, 'project', mobileContracts.normalizeProjectSummary, mobileContracts.projectSummarySchema)
      };
    },
    submitPublicQuote(form, files = []) {
      const payload = buildPublicQuotePayload(form);
      if (files.length) {
        return request('/public/quotes', {
          method: 'POST',
          body: buildMultipartFormData(payload, files)
        });
      }
      return request('/public/quotes', toJsonOptions('POST', payload));
    },
    previewPublicQuote(publicToken) {
      return request(`/public/quotes/${encodeURIComponent(publicToken)}`);
    },
    requestQuoteClaim(quoteId, input) {
      return request(`/public/quotes/${encodeURIComponent(quoteId)}/claim/request`, toJsonOptions('POST', input));
    },
    confirmQuoteClaim(quoteId, accessToken, input) {
      return authRequest(`/public/quotes/${encodeURIComponent(quoteId)}/claim/confirm`, accessToken, toJsonOptions('POST', input));
    },
    appendPublicQuoteAttachments(publicToken, files = []) {
      return request(`/public/quotes/${encodeURIComponent(publicToken)}/attachments`, {
        method: 'POST',
        body: buildMultipartFormData({}, files)
      });
    },
    async appendClaimedQuoteAttachments(accessToken, quoteId, files = []) {
      const payload = await authEnvelope(`/quotes/${encodeURIComponent(quoteId)}/attachments`, accessToken, {
        method: 'POST',
        body: buildMultipartFormData({}, files)
      });
      return {
        quote: mobileContracts.normalizeItemResponse(payload, 'quote', mobileContracts.normalizeQuoteSummary, mobileContracts.quoteSummarySchema),
        attachments: mobileContracts.normalizeListResponse(payload, 'attachments', mobileContracts.normalizeMessageAttachment, mobileContracts.messageAttachmentSchema)
      };
    },
    registerDevicePushToken(accessToken, input) {
      return authRequest('/devices/push-token', accessToken, toJsonOptions('POST', input));
    }
  };
};

const formatDateTime = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-GB');
};

module.exports = {
  DEFAULT_PAGE_SIZE,
  DEFAULT_QUOTE_LOCATION,
  MAX_QUOTE_FILES,
  createEmptySession,
  createDefaultQuoteForm,
  buildQuoteProposalDetails,
  buildPublicQuotePayload,
  buildPushRegistrationPayload,
  resolveApiBaseFromExpoConfig,
  createApiClient,
  formatDateTime,
  toQueryString
};

module.exports.default = module.exports;
