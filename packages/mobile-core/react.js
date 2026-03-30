const React = require('react');

const { useCallback, useEffect, useRef, useState } = React;

function usePollerScheduler(enabled) {
  const pollersRef = useRef(new Map());
  const timerRef = useRef(null);
  const [version, setVersion] = useState(0);

  const registerPoller = useCallback((baseKey, intervalMs, callback) => {
    const safeInterval = Math.max(1000, Number(intervalMs) || 1000);
    const id = `${baseKey}:${Math.random().toString(36).slice(2)}`;
    pollersRef.current.set(id, {
      intervalMs: safeInterval,
      nextRunAt: Date.now() + safeInterval,
      callback
    });
    setVersion((value) => value + 1);

    return () => {
      pollersRef.current.delete(id);
      setVersion((value) => value + 1);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const schedule = () => {
      clearTimer();
      const entries = [...pollersRef.current.values()];
      if (!entries.length) return;

      const now = Date.now();
      const nextRunAt = entries.reduce((earliest, entry) => Math.min(earliest, entry.nextRunAt || now), Number.POSITIVE_INFINITY);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const startedAt = Date.now();
        pollersRef.current.forEach((entry) => {
          if (!entry || startedAt < entry.nextRunAt) return;
          entry.nextRunAt = startedAt + entry.intervalMs;
          Promise.resolve(entry.callback()).catch(() => {});
        });
        schedule();
      }, Math.max(0, nextRunAt - now));
    };

    schedule();
    return () => {
      clearTimer();
    };
  }, [enabled, version]);

  return { registerPoller };
}

function useAsyncResource(loader, dependencies, options = {}) {
  const {
    enabled = true,
    initialValue = null,
    pollMs = 0,
    pollKey = 'resource',
    registerPoller = null
  } = options;
  const mountedRef = useRef(true);
  const [state, setState] = useState({
    loading: Boolean(enabled),
    error: '',
    value: initialValue
  });

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!enabled) {
      if (mountedRef.current) {
        setState({ loading: false, error: '', value: initialValue });
      }
      return initialValue;
    }

    if (!silent && mountedRef.current) {
      setState((previous) => ({ ...previous, loading: true, error: '' }));
    }

    try {
      const nextValue = await loader();
      if (mountedRef.current) {
        setState({ loading: false, error: '', value: nextValue });
      }
      return nextValue;
    } catch (error) {
      if (mountedRef.current) {
        setState((previous) => ({
          loading: false,
          error: error?.message || 'Request failed',
          value: silent ? previous.value : initialValue
        }));
      }
      return initialValue;
    }
  }, [enabled, initialValue, loader]);

  useEffect(() => {
    load();
  }, [load, ...dependencies]);

  useEffect(() => {
    if (!enabled || !registerPoller || pollMs <= 0) return undefined;
    return registerPoller(`${pollKey}:${pollMs}`, pollMs, async () => {
      await load({ silent: true });
    });
  }, [enabled, load, pollKey, pollMs, registerPoller]);

  return {
    ...state,
    reload: load,
    setValue(nextValue) {
      if (!mountedRef.current) return;
      setState((previous) => ({ ...previous, value: nextValue }));
    }
  };
}

module.exports = {
  usePollerScheduler,
  useAsyncResource
};

module.exports.default = module.exports;
