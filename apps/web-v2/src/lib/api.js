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
  async getProjects() {
    const payload = await withAuth('/projects?page=1&pageSize=50');
    return payload.data?.projects || [];
  },
  async getQuotes() {
    const payload = await withAuth('/quotes?page=1&pageSize=50');
    return payload.data?.quotes || [];
  },
  async getThreads() {
    const payload = await withAuth('/messages/threads?page=1&pageSize=50');
    return payload.data?.threads || [];
  },
  async getNotifications() {
    const payload = await withAuth('/notifications?page=1&pageSize=50');
    return payload.data?.notifications || [];
  },
  async getNotificationsUnreadCount() {
    const payload = await withAuth('/notifications/unread-count');
    return payload.data?.count || 0;
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
