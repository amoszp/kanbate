import { useLocalStorage } from './useLocalStorage';

export type ReadState = Record<number, string>;

/**
 * Tracks the last time each project board was opened, keyed by project id.
 * Unread badge = backlog tasks created *after* this timestamp.
 */
export function useReadState() {
  const [state, setState] = useLocalStorage<ReadState>('kanbate.readState', {});

  const markRead = (projectId: number) => {
    setState((prev) => ({ ...prev, [projectId]: new Date().toISOString() }));
  };

  const getLastRead = (projectId: number): string | null => state[projectId] ?? null;

  return { readState: state, markRead, getLastRead };
}

export function unreadCount(tasksCreatedAt: string[], lastRead: string | null): number {
  if (tasksCreatedAt.length === 0) return 0;
  if (!lastRead) return tasksCreatedAt.length;
  return tasksCreatedAt.filter((ts) => ts > lastRead).length;
}
