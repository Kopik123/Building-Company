import contractKit from '../../../../shared/contracts/v2.js';

const {
  crmClientSchema,
  crmStaffMemberSchema,
  directThreadSummarySchema,
  inventoryMaterialSchema,
  inventoryServiceSchema,
  normalizeCrmClient,
  normalizeCrmStaffMember,
  normalizeEstimateSummary,
  normalizeItemResponse,
  normalizeListResponse,
  normalizeNotification,
  normalizeProjectSummary,
  normalizeQuoteEvent,
  normalizeQuoteSummary,
  normalizeDirectThreadSummary,
  normalizeInventoryMaterial,
  normalizeInventoryService,
  normalizeThreadMessage,
  normalizeThreadSummary,
  notificationSchema,
  projectSummarySchema,
  estimateSummarySchema,
  quoteEventSchema,
  quoteSummarySchema,
  threadMessageSchema,
  threadSummarySchema
} = contractKit;

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v2';
const ACCESS_KEY = 'll_v2_access_token';
const REFRESH_KEY = 'll_v2_refresh_token';

const readToken = (key) => window.localStorage.getItem(key) || '';
const saveToken = (key, value) => window.localStorage.setItem(key, value);
const clearTokens = () => {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
};

const parseError = (payload) => {
  if (payload?.error?.message) return payload.error.message;
  return 'Request failed';
};

const toQueryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'undefined' || value === null || value === '') return;
    query.set(key, String(value));
  });
  const rendered = query.toString();
  return rendered ? `?${rendered}` : '';
};

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(parseError(payload));
    error.status = response.status;
    throw error;
  }
  return payload;
};

const withAuth = async (path, options = {}) => {
  const accessToken = readToken(ACCESS_KEY);
  if (!accessToken) throw new Error('Not authenticated');

  try {
    return await request(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`
      }
    });
  } catch (error) {
    if (error.status !== 401) throw error;

    await sessionApi.refresh();
    const retryToken = readToken(ACCESS_KEY);
    return request(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${retryToken}`
      }
    });
  }
};

export const sessionApi = {
  getAccessToken: () => readToken(ACCESS_KEY),
  clearTokens,
  async login(email, password) {
    const payload = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    saveToken(ACCESS_KEY, payload.data.accessToken);
    saveToken(REFRESH_KEY, payload.data.refreshToken);
    return payload.data.user;
  },
  async refresh() {
    const refreshToken = readToken(REFRESH_KEY);
    if (!refreshToken) throw new Error('No refresh token');
    const payload = await request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    saveToken(ACCESS_KEY, payload.data.accessToken);
    saveToken(REFRESH_KEY, payload.data.refreshToken);
    return payload.data.user;
  },
  async me() {
    const accessToken = readToken(ACCESS_KEY);
    if (!accessToken) return null;
    try {
      const payload = await request('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return payload.data.user || null;
    } catch (error) {
      if (error.status !== 401) throw error;
      const user = await sessionApi.refresh();
      return user || null;
    }
  }
};

const toJsonOptions = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

const toMessageResponse = (payload, key = 'message') => normalizeItemResponse(payload, key, normalizeThreadMessage, threadMessageSchema);

export const v2Api = {
  async getProjects(params = {}) {
    const payload = await withAuth(`/projects${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return normalizeListResponse(payload, 'projects', normalizeProjectSummary, projectSummarySchema);
  },
  async getProject(projectId) {
    const payload = await withAuth(`/projects/${projectId}`);
    return normalizeItemResponse(payload, 'project', normalizeProjectSummary, projectSummarySchema);
  },
  async createProject(input) {
    const payload = await withAuth('/projects', toJsonOptions('POST', input));
    return normalizeItemResponse(payload, 'project', normalizeProjectSummary, projectSummarySchema);
  },
  async updateProject(projectId, input) {
    const payload = await withAuth(`/projects/${projectId}`, toJsonOptions('PATCH', input));
    return normalizeItemResponse(payload, 'project', normalizeProjectSummary, projectSummarySchema);
  },
  async getQuotes(params = {}) {
    const payload = await withAuth(`/quotes${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return normalizeListResponse(payload, 'quotes', normalizeQuoteSummary, quoteSummarySchema);
  },
  async getQuote(quoteId) {
    const payload = await withAuth(`/quotes/${quoteId}`);
    return normalizeItemResponse(payload, 'quote', normalizeQuoteSummary, quoteSummarySchema);
  },
  async createQuote(input) {
    const payload = await withAuth('/quotes', toJsonOptions('POST', input));
    return normalizeItemResponse(payload, 'quote', normalizeQuoteSummary, quoteSummarySchema);
  },
  async updateQuote(quoteId, input) {
    const payload = await withAuth(`/quotes/${quoteId}`, toJsonOptions('PATCH', input));
    return normalizeItemResponse(payload, 'quote', normalizeQuoteSummary, quoteSummarySchema);
  },
  async assignQuote(quoteId, input = {}) {
    const payload = await withAuth(`/quotes/${quoteId}/assign`, toJsonOptions('POST', input));
    return {
      quote: normalizeItemResponse(payload, 'quote', normalizeQuoteSummary, quoteSummarySchema),
      thread: payload.data?.thread || null
    };
  },
  async getQuoteTimeline(quoteId) {
    const payload = await withAuth(`/quotes/${quoteId}/timeline`);
    return normalizeListResponse(payload, 'events', normalizeQuoteEvent, quoteEventSchema);
  },
  async getQuoteEstimates(quoteId) {
    const payload = await withAuth(`/quotes/${quoteId}/estimates`);
    return normalizeListResponse(payload, 'estimates', normalizeEstimateSummary, estimateSummarySchema);
  },
  async createQuoteEstimate(quoteId, input) {
    const payload = await withAuth(`/quotes/${quoteId}/estimates`, toJsonOptions('POST', input));
    return {
      estimate: normalizeItemResponse(payload, 'estimate', normalizeEstimateSummary, estimateSummarySchema),
      estimates: normalizeListResponse(payload, 'estimates', normalizeEstimateSummary, estimateSummarySchema)
    };
  },
  async sendQuoteEstimate(estimateId, input = {}) {
    const payload = await withAuth(`/quotes/estimates/${estimateId}/send`, toJsonOptions('POST', input));
    return {
      quote: normalizeItemResponse(payload, 'quote', normalizeQuoteSummary, quoteSummarySchema),
      estimate: normalizeItemResponse(payload, 'estimate', normalizeEstimateSummary, estimateSummarySchema)
    };
  },
  async respondToEstimate(estimateId, input) {
    const payload = await withAuth(`/quotes/estimates/${estimateId}/respond`, toJsonOptions('POST', input));
    return {
      quote: normalizeItemResponse(payload, 'quote', normalizeQuoteSummary, quoteSummarySchema),
      estimate: normalizeItemResponse(payload, 'estimate', normalizeEstimateSummary, estimateSummarySchema)
    };
  },
  async convertQuoteToProject(quoteId) {
    const payload = await withAuth(`/quotes/${quoteId}/convert-to-project`, {
      method: 'POST'
    });
    return {
      quote: normalizeItemResponse(payload, 'quote', normalizeQuoteSummary, quoteSummarySchema),
      project: normalizeItemResponse(payload, 'project', normalizeProjectSummary, projectSummarySchema),
      thread: payload.data?.thread || null
    };
  },
  async getThreads(params = {}) {
    const payload = await withAuth(`/messages/threads${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return normalizeListResponse(payload, 'threads', normalizeThreadSummary, threadSummarySchema);
  },
  async getDirectThreads(params = {}) {
    const payload = await withAuth(`/messages/direct-threads${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return normalizeListResponse(payload, 'threads', normalizeDirectThreadSummary, directThreadSummarySchema);
  },
  async getThreadMessages(threadId, params = {}) {
    const payload = await withAuth(`/messages/threads/${threadId}/messages${toQueryString({ page: 1, pageSize: 100, ...params })}`);
    return {
      thread: normalizeItemResponse(payload, 'thread', normalizeThreadSummary, threadSummarySchema),
      messages: normalizeListResponse(payload, 'messages', normalizeThreadMessage, threadMessageSchema),
      meta: payload.meta || {}
    };
  },
  async getDirectThreadMessages(threadId, params = {}) {
    const payload = await withAuth(`/messages/direct-threads/${threadId}/messages${toQueryString({ page: 1, pageSize: 100, ...params })}`);
    return {
      thread: normalizeItemResponse(payload, 'thread', normalizeDirectThreadSummary, directThreadSummarySchema),
      messages: normalizeListResponse(payload, 'messages', normalizeThreadMessage, threadMessageSchema),
      meta: payload.meta || {}
    };
  },
  async createDirectThread({ recipientUserId, subject, body = '', createOnly = false, quoteId = '' }) {
    const payload = await withAuth('/messages/direct-threads', toJsonOptions('POST', {
      recipientUserId,
      subject,
      body,
      createOnly,
      quoteId: quoteId || undefined
    }));
    return {
      thread: normalizeItemResponse(payload, 'thread', normalizeDirectThreadSummary, directThreadSummarySchema),
      message: toMessageResponse(payload)
    };
  },
  async sendThreadMessage(threadId, body) {
    const payload = await withAuth(`/messages/threads/${threadId}/messages`, toJsonOptions('POST', { body }));
    return toMessageResponse(payload);
  },
  async sendDirectThreadMessage(threadId, body) {
    const payload = await withAuth(`/messages/direct-threads/${threadId}/messages`, toJsonOptions('POST', { body }));
    return toMessageResponse(payload);
  },
  async uploadThreadMessage(threadId, { body = '', files = [] } = {}) {
    const formData = new FormData();
    if (body) formData.set('body', body);
    Array.from(files || []).forEach((file) => formData.append('files', file));
    const payload = await withAuth(`/messages/threads/${threadId}/messages/upload`, {
      method: 'POST',
      body: formData
    });
    return toMessageResponse(payload);
  },
  async uploadDirectThreadMessage(threadId, { body = '', files = [] } = {}) {
    const formData = new FormData();
    if (body) formData.set('body', body);
    Array.from(files || []).forEach((file) => formData.append('files', file));
    const payload = await withAuth(`/messages/direct-threads/${threadId}/messages/upload`, {
      method: 'POST',
      body: formData
    });
    return toMessageResponse(payload);
  },
  async markDirectThreadRead(threadId) {
    const payload = await withAuth(`/messages/direct-threads/${threadId}/read`, {
      method: 'PATCH'
    });
    return Number(payload.data?.markedReadCount || 0);
  },
  async getNotifications(params = {}) {
    const payload = await withAuth(`/notifications${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return normalizeListResponse(payload, 'notifications', normalizeNotification, notificationSchema);
  },
  async getNotificationsUnreadCount() {
    const payload = await withAuth('/notifications/unread-count');
    return Number(payload.data?.count || 0);
  },
  async markNotificationRead(notificationId) {
    const payload = await withAuth(`/notifications/${notificationId}/read`, {
      method: 'PATCH'
    });
    return normalizeItemResponse(payload, 'notification', normalizeNotification, notificationSchema);
  },
  async markAllNotificationsRead() {
    const payload = await withAuth('/notifications/read-all', {
      method: 'PATCH'
    });
    return Number(payload.data?.updated || 0);
  },
  async getCrmClients(params = {}) {
    const payload = await withAuth(`/crm/clients${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return normalizeListResponse(payload, 'clients', normalizeCrmClient, crmClientSchema);
  },
  async getCrmStaff(params = {}) {
    const payload = await withAuth(`/crm/staff${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return normalizeListResponse(payload, 'staff', normalizeCrmStaffMember, crmStaffMemberSchema);
  },
  async createCrmStaff(input) {
    const payload = await withAuth('/crm/staff', toJsonOptions('POST', input));
    return normalizeItemResponse(payload, 'staff', normalizeCrmStaffMember, crmStaffMemberSchema);
  },
  async updateCrmClient(clientId, input) {
    const payload = await withAuth(`/crm/clients/${clientId}`, toJsonOptions('PATCH', input));
    return normalizeItemResponse(payload, 'client', normalizeCrmClient, crmClientSchema);
  },
  async updateCrmStaff(staffId, input) {
    const payload = await withAuth(`/crm/staff/${staffId}`, toJsonOptions('PATCH', input));
    return normalizeItemResponse(payload, 'staff', normalizeCrmStaffMember, crmStaffMemberSchema);
  },
  async getInventoryServices(params = {}) {
    const payload = await withAuth(`/inventory/services${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return normalizeListResponse(payload, 'services', normalizeInventoryService, inventoryServiceSchema);
  },
  async createInventoryService(input) {
    const payload = await withAuth('/inventory/services', toJsonOptions('POST', input));
    return normalizeItemResponse(payload, 'service', normalizeInventoryService, inventoryServiceSchema);
  },
  async updateInventoryService(serviceId, input) {
    const payload = await withAuth(`/inventory/services/${serviceId}`, toJsonOptions('PATCH', input));
    return normalizeItemResponse(payload, 'service', normalizeInventoryService, inventoryServiceSchema);
  },
  async deleteInventoryService(serviceId) {
    const payload = await withAuth(`/inventory/services/${serviceId}`, {
      method: 'DELETE'
    });
    return Boolean(payload.data?.deleted);
  },
  async getInventoryMaterials(params = {}) {
    const payload = await withAuth(`/inventory/materials${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return normalizeListResponse(payload, 'materials', normalizeInventoryMaterial, inventoryMaterialSchema);
  },
  async createInventoryMaterial(input) {
    const payload = await withAuth('/inventory/materials', toJsonOptions('POST', input));
    return normalizeItemResponse(payload, 'material', normalizeInventoryMaterial, inventoryMaterialSchema);
  },
  async updateInventoryMaterial(materialId, input) {
    const payload = await withAuth(`/inventory/materials/${materialId}`, toJsonOptions('PATCH', input));
    return normalizeItemResponse(payload, 'material', normalizeInventoryMaterial, inventoryMaterialSchema);
  },
  async deleteInventoryMaterial(materialId) {
    const payload = await withAuth(`/inventory/materials/${materialId}`, {
      method: 'DELETE'
    });
    return Boolean(payload.data?.deleted);
  },
  async getPublicServices() {
    const payload = await request('/services');
    return normalizeListResponse(payload, 'services', normalizeInventoryService, inventoryServiceSchema);
  }
};
