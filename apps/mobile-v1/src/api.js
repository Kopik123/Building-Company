import Constants from 'expo-constants';

const resolveApiBase = () => {
  const extra = Constants?.expoConfig?.extra || {};
  const explicitBase = typeof extra.apiBaseUrl === 'string' ? extra.apiBaseUrl.trim() : '';
  if (explicitBase) return explicitBase;

  const environment = typeof extra.apiEnvironment === 'string' ? extra.apiEnvironment.trim().toLowerCase() : '';
  const configuredUrls = extra.apiBaseUrls && typeof extra.apiBaseUrls === 'object' ? extra.apiBaseUrls : {};
  const environmentBase = typeof configuredUrls[environment] === 'string' ? configuredUrls[environment].trim() : '';
  if (environmentBase) return environmentBase;

  throw new Error('Missing mobile API base configuration. Set Expo extra.apiBaseUrl or extra.apiBaseUrls for the chosen apiEnvironment.');
};

export const API_BASE = resolveApiBase();

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
