import Constants from 'expo-constants';

export const API_BASE = Constants?.expoConfig?.extra?.apiBaseUrl || 'https://levellines.co.uk/api/v2';

export async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Request failed');
  }
  return payload?.data || {};
}

export async function authRequest(path, accessToken, options = {}) {
  return request(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`
    }
  });
}
