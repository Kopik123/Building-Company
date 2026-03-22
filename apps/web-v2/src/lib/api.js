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

export const v2Api = {
  async getProjects(params = {}) {
    const payload = await withAuth(`/projects${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return payload.data?.projects || [];
  },
  async getQuotes(params = {}) {
    const payload = await withAuth(`/quotes${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return payload.data?.quotes || [];
  },
  async getThreads(params = {}) {
    const payload = await withAuth(`/messages/threads${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return payload.data?.threads || [];
  },
  async getThreadMessages(threadId, params = {}) {
    const payload = await withAuth(`/messages/threads/${threadId}/messages${toQueryString({ page: 1, pageSize: 100, ...params })}`);
    return {
      thread: payload.data?.thread || null,
      messages: payload.data?.messages || [],
      meta: payload.meta || {}
    };
  },
  async sendThreadMessage(threadId, body) {
    const payload = await withAuth(`/messages/threads/${threadId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body })
    });
    return payload.data?.message || null;
  },
  async uploadThreadMessage(threadId, { body = '', files = [] } = {}) {
    const formData = new FormData();
    if (body) formData.set('body', body);
    Array.from(files || []).forEach((file) => formData.append('files', file));
    const payload = await withAuth(`/messages/threads/${threadId}/messages/upload`, {
      method: 'POST',
      body: formData
    });
    return payload.data?.message || null;
  },
  async getNotifications(params = {}) {
    const payload = await withAuth(`/notifications${toQueryString({ page: 1, pageSize: 50, ...params })}`);
    return payload.data?.notifications || [];
  },
  async getNotificationsUnreadCount() {
    const payload = await withAuth('/notifications/unread-count');
    return payload.data?.count || 0;
  },
  async markNotificationRead(notificationId) {
    const payload = await withAuth(`/notifications/${notificationId}/read`, {
      method: 'PATCH'
    });
    return payload.data?.notification || null;
  },
  async markAllNotificationsRead() {
    const payload = await withAuth('/notifications/read-all', {
      method: 'PATCH'
    });
    return payload.data?.updated || 0;
  },
  async getCrmClients() {
    const payload = await withAuth('/crm/clients?page=1&pageSize=50');
    return payload.data?.clients || [];
  },
  async getCrmStaff() {
    const payload = await withAuth('/crm/staff?page=1&pageSize=50');
    return payload.data?.staff || [];
  },
  async getInventoryServices() {
    const payload = await withAuth('/inventory/services?page=1&pageSize=50');
    return payload.data?.services || [];
  },
  async getInventoryMaterials() {
    const payload = await withAuth('/inventory/materials?page=1&pageSize=50');
    return payload.data?.materials || [];
  },
  async getPublicServices() {
    const payload = await request('/services');
    return payload.data?.services || [];
  }
};
