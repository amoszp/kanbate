import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type ReadState = Record<number, string>;

/**
 * Tracks the last time each project board was opened, keyed by project id.
 * Unread badge = backlog tasks created *after* this timestamp.
 */
export function useReadState() {
  const [state, setState] = useLocalStorage<ReadState>('kanbate.readState', {});

  // Stable callbacks so consumers (e.g. Board's useEffect deps) don't get a new
  // function identity on every render — which previously caused an infinite
  // "maximum update depth exceeded" loop.
  const markRead = useCallback(
    (projectId: number) => {
      setState((prev) => ({ ...prev, [projectId]: new Date().toISOString() }));
    },
    [setState]
  );

  const getLastRead = useCallback(
    (projectId: number): string | null => state[projectId] ?? null,
    [state]
  );

  return useMemo(() => ({ readState: state, markRead, getLastRead }), [state, markRead, getLastRead]);
}

export function unreadCount(tasksCreatedAt: string[], lastRead: string | null): number {
  if (tasksCreatedAt.length === 0) return 0;
  if (!lastRead) return tasksCreatedAt.length;
  return tasksCreatedAt.filter((ts) => ts > lastRead).length;
}
