import { useCallback, useEffect, useRef, useState } from 'react';
import { authRequest } from './api';

export function useApiList(path, accessToken, pollMs = 0, registerPoller = null) {
  const [state, setState] = useState({ loading: true, error: '', items: [] });
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!accessToken) {
      if (mountedRef.current) {
        setState({ loading: false, error: '', items: [] });
      }
      return;
    }

    if (!silent && mountedRef.current) {
      setState((prev) => ({ ...prev, loading: true, error: '' }));
    }

    try {
      const data = await authRequest(path, accessToken);
      const key = Object.keys(data).find((item) => Array.isArray(data[item]));
      const items = key ? data[key] : [];
      if (mountedRef.current) {
        setState({ loading: false, error: '', items });
      }
    } catch (error) {
      if (mountedRef.current) {
        setState((prev) => ({
          loading: false,
          error: error.message || 'Could not load data',
          items: silent ? prev.items : []
        }));
      }
    }
  }, [accessToken, path]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!registerPoller || pollMs <= 0 || !accessToken) return undefined;

    return registerPoller(`${path}:${pollMs}`, pollMs, async () => {
      await load({ silent: true });
    });
  }, [accessToken, load, path, pollMs, registerPoller]);

  return state;
}
