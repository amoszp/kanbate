import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

/**
 * Persists the set of reminder task-ids the user has dismissed.
 * When a task leaves "In Progress" its dismissal is purged, so a future
 * return to In Progress (>24h) will surface a fresh reminder.
 */
export function useDismissedReminders() {
  const [dismissed, setDismissed] = useLocalStorage<number[]>('kanbate.dismissedReminders', []);

  const dismiss = useCallback(
    (taskId: number) => {
      setDismissed((prev) => (prev.includes(taskId) ? prev : [...prev, taskId]));
    },
    [setDismissed]
  );

  /** Remove dismissal entries for tasks no longer among the active reminders. */
  const purge = useCallback(
    (activeReminderIds: number[]) => {
      setDismissed((prev) => {
        const active = new Set(activeReminderIds);
        const next = prev.filter((id) => active.has(id));
        return next.length === prev.length ? prev : next;
      });
    },
    [setDismissed]
  );

  return { dismissed, dismiss, purge };
}
