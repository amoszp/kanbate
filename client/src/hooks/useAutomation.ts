import { useCallback, useEffect, useRef } from 'react';
import { api } from '../api';
import { useToast } from '../toast';
import { useDismissedReminders } from './useDismissedReminders';
import { hoursSince } from '../utils';
import type { Route } from './useHashRoute';

/**
 * In-App Automation Engine.
 * Runs when the app loads and whenever it regains focus (throttled), since
 * iOS heavily restricts background push/JS timers for installed PWAs.
 */
export function useAutomation(navigate: (route: Route | string) => void, refresh: () => Promise<void>) {
  const { push, dismiss } = useToast();
  const { dismissed, dismiss: dismissReminder, purge } = useDismissedReminders();

  // Keep the live "dismissed" set in a ref so `run` stays referentially
  // stable and the focus listeners are registered exactly once.
  const dismissedRef = useRef(dismissed);
  dismissedRef.current = dismissed;

  const lastRunRef = useRef(0);
  const runningRef = useRef(false);

  const run = useCallback(
    async (reason: string) => {
      const nowMs = Date.now();
      // Throttle: at most one run per 60s.
      if (nowMs - lastRunRef.current < 60_000 && reason !== 'manual') return;
      if (runningRef.current) return;
      runningRef.current = true;
      lastRunRef.current = nowMs;

      try {
        const result = await api.runAutomation();

        if (result.archived.length > 0) {
          const id = push({
            kind: 'info',
            title: `${result.archived.length} resolved task${result.archived.length > 1 ? 's' : ''} archived`,
            message: 'Moved to project History Archive (48h rule).',
            actions: [{ label: 'OK', onClick: () => dismiss(id) }],
          });
        }

        if (result.reminders.length > 0) {
          // Purge dismissals for tasks that are no longer in progress.
          purge(result.reminders.map((r) => r.id));

          for (const reminder of result.reminders) {
            if (dismissedRef.current.includes(reminder.id)) continue;
            const hours = hoursSince(reminder.movedToInProgressAt);
            push({
              kind: 'reminder',
              title: reminder.title,
              message: `${reminder.projectName} · In Progress for ${hours != null ? Math.floor(hours) : reminder.hoursInProgress}h+. Continue working or move to Resolved.`,
              actions: [
                { label: 'Open', tone: 'cyan', onClick: () => navigate(`/board/${reminder.projectId}`) },
                { label: 'Dismiss', tone: 'magenta', onClick: () => dismissReminder(reminder.id) },
              ],
            });
          }
        }

        // Re-sync board/dashboard after any archive migration.
        if (result.archived.length > 0) await refresh();
      } catch (err) {
        push({
          kind: 'error',
          title: 'Automation check failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        runningRef.current = false;
      }
    },
    [push, dismiss, dismissReminder, purge, navigate, refresh]
  );

  useEffect(() => {
    // Run on load.
    run('load');

    // Run when the app regains focus (throttled inside run()).
    const onVisibility = () => {
      if (document.visibilityState === 'visible') run('focus');
    };
    const onFocus = () => run('focus');

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [run]);

  return { runAutomation: () => run('manual') };
}
