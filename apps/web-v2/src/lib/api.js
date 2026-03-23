import contractKit from '../../../../shared/contracts/v2.js';

const {
  normalizeCrmClient,
  normalizeCrmStaffMember,
  normalizeDirectThreadSummary,
  normalizeInventoryMaterial,
  normalizeInventoryService,
  normalizeItemResponse,
  normalizeListResponse,
  normalizeNotification,
  normalizeProjectSummary,
  normalizeQuoteSummary,
  normalizeThreadMessage,
  normalizeThreadSummary
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

const toMessageResponse = (payload, key = 'message') => normalizeItemResponse(payload, key, normalizeThreadMessage);

export const v2Api = {
  async getProjects(params = {}) {
    const payload = await withAuth(`/projects${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return normalizeListResponse(payload, 'projects', normalizeProjectSummary);
  },
  async getProject(projectId) {
    const payload = await withAuth(`/projects/${projectId}`);
    return normalizeItemResponse(payload, 'project', normalizeProjectSummary);
  },
  async createProject(input) {
    const payload = await withAuth('/projects', toJsonOptions('POST', input));
    return normalizeItemResponse(payload, 'project', normalizeProjectSummary);
  },
  async updateProject(projectId, input) {
    const payload = await withAuth(`/projects/${projectId}`, toJsonOptions('PATCH', input));
    return normalizeItemResponse(payload, 'project', normalizeProjectSummary);
  },
  async getQuotes(params = {}) {
    const payload = await withAuth(`/quotes${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return normalizeListResponse(payload, 'quotes', normalizeQuoteSummary);
  },
  async updateQuote(quoteId, input) {
    const payload = await withAuth(`/quotes/${quoteId}`, toJsonOptions('PATCH', input));
    return normalizeItemResponse(payload, 'quote', normalizeQuoteSummary);
  },
  async getThreads(params = {}) {
    const payload = await withAuth(`/messages/threads${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return normalizeListResponse(payload, 'threads', normalizeThreadSummary);
  },
  async getDirectThreads(params = {}) {
    const payload = await withAuth(`/messages/direct-threads${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return normalizeListResponse(payload, 'threads', normalizeDirectThreadSummary);
  },
  async getThreadMessages(threadId, params = {}) {
    const payload = await withAuth(`/messages/threads/${threadId}/messages${toQueryString({ page: 1, pageSize: 100, ...params })}`);
    return {
      thread: normalizeItemResponse(payload, 'thread', normalizeThreadSummary),
      messages: normalizeListResponse(payload, 'messages', normalizeThreadMessage),
      meta: payload.meta || {}
    };
  },
  async getDirectThreadMessages(threadId, params = {}) {
    const payload = await withAuth(`/messages/direct-threads/${threadId}/messages${toQueryString({ page: 1, pageSize: 100, ...params })}`);
    return {
      thread: normalizeItemResponse(payload, 'thread', normalizeDirectThreadSummary),
      messages: normalizeListResponse(payload, 'messages', normalizeThreadMessage),
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
      thread: normalizeItemResponse(payload, 'thread', normalizeDirectThreadSummary),
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
    return normalizeListResponse(payload, 'notifications', normalizeNotification);
  },
  async getNotificationsUnreadCount() {
    const payload = await withAuth('/notifications/unread-count');
    return Number(payload.data?.count || 0);
  },
  async markNotificationRead(notificationId) {
    const payload = await withAuth(`/notifications/${notificationId}/read`, {
      method: 'PATCH'
    });
    return normalizeItemResponse(payload, 'notification', normalizeNotification);
  },
  async markAllNotificationsRead() {
    const payload = await withAuth('/notifications/read-all', {
      method: 'PATCH'
    });
    return Number(payload.data?.updated || 0);
  },
  async getCrmClients(params = {}) {
    const payload = await withAuth(`/crm/clients${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return normalizeListResponse(payload, 'clients', normalizeCrmClient);
  },
  async getCrmStaff(params = {}) {
    const payload = await withAuth(`/crm/staff${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return normalizeListResponse(payload, 'staff', normalizeCrmStaffMember);
  },
  async createCrmStaff(input) {
    const payload = await withAuth('/crm/staff', toJsonOptions('POST', input));
    return normalizeItemResponse(payload, 'staff', normalizeCrmStaffMember);
  },
  async getInventoryServices(params = {}) {
    const payload = await withAuth(`/inventory/services${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return normalizeListResponse(payload, 'services', normalizeInventoryService);
  },
  async createInventoryService(input) {
    const payload = await withAuth('/inventory/services', toJsonOptions('POST', input));
    return normalizeItemResponse(payload, 'service', normalizeInventoryService);
  },
  async updateInventoryService(serviceId, input) {
    const payload = await withAuth(`/inventory/services/${serviceId}`, toJsonOptions('PATCH', input));
    return normalizeItemResponse(payload, 'service', normalizeInventoryService);
  },
  async deleteInventoryService(serviceId) {
    const payload = await withAuth(`/inventory/services/${serviceId}`, {
      method: 'DELETE'
    });
    return Boolean(payload.data?.deleted);
  },
  async getInventoryMaterials(params = {}) {
    const payload = await withAuth(`/inventory/materials${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return normalizeListResponse(payload, 'materials', normalizeInventoryMaterial);
  },
  async createInventoryMaterial(input) {
    const payload = await withAuth('/inventory/materials', toJsonOptions('POST', input));
    return normalizeItemResponse(payload, 'material', normalizeInventoryMaterial);
  },
  async updateInventoryMaterial(materialId, input) {
    const payload = await withAuth(`/inventory/materials/${materialId}`, toJsonOptions('PATCH', input));
    return normalizeItemResponse(payload, 'material', normalizeInventoryMaterial);
  },
  async deleteInventoryMaterial(materialId) {
    const payload = await withAuth(`/inventory/materials/${materialId}`, {
      method: 'DELETE'
    });
    return Boolean(payload.data?.deleted);
  },
  async getPublicServices() {
    const payload = await request('/services');
    return normalizeListResponse(payload, 'services', normalizeInventoryService);
  }
};
