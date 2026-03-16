import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export function usePollerScheduler(enabled) {
  const [appState, setAppState] = useState(AppState.currentState);
  const pollersRef = useRef(new Map());
  const schedulerTimerRef = useRef(null);
  const [pollerVersion, setPollerVersion] = useState(0);

  const registerPoller = useCallback((baseKey, intervalMs, callback) => {
    const id = `${baseKey}:${Math.random().toString(36).slice(2)}`;
    const safeInterval = Math.max(1000, Number(intervalMs) || 1000);
    pollersRef.current.set(id, {
      intervalMs: safeInterval,
      nextRunAt: Date.now() + safeInterval,
      callback
    });
    setPollerVersion((value) => value + 1);

    return () => {
      pollersRef.current.delete(id);
      setPollerVersion((value) => value + 1);
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppState(nextState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!enabled || appState !== 'active') return undefined;

    const clearScheduledPoll = () => {
      if (schedulerTimerRef.current) {
        clearTimeout(schedulerTimerRef.current);
        schedulerTimerRef.current = null;
      }
    };

    const scheduleNextPoll = () => {
      clearScheduledPoll();

      const entries = Array.from(pollersRef.current.values()).filter(Boolean);
      if (!entries.length) return;

      const now = Date.now();
      const nextRunAt = entries.reduce((soonest, entry) => {
        const dueAt = Number(entry.nextRunAt) || now;
        return Math.min(soonest, dueAt);
      }, Number.POSITIVE_INFINITY);
      const delay = Math.max(0, nextRunAt - now);

      schedulerTimerRef.current = setTimeout(() => {
        schedulerTimerRef.current = null;
        const runStartedAt = Date.now();

        pollersRef.current.forEach((entry) => {
          if (!entry || runStartedAt < entry.nextRunAt) return;
          entry.nextRunAt = runStartedAt + entry.intervalMs;
          Promise.resolve(entry.callback()).catch(() => {});
        });

        scheduleNextPoll();
      }, delay);
    };

    scheduleNextPoll();

    return () => {
      clearScheduledPoll();
    };
  }, [appState, enabled, pollerVersion]);

  useEffect(() => {
    if (!enabled || appState !== 'active') return;
    const now = Date.now();
    pollersRef.current.forEach((entry) => {
      if (!entry) return;
      entry.nextRunAt = now;
    });
    setPollerVersion((value) => value + 1);
  }, [appState, enabled]);

  return { registerPoller };
}
