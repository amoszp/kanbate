import type {
  AutomationConfig,
  AutomationResult,
  HistoryEntry,
  Project,
  ProjectWithTasks,
  Tag,
  TagCategory,
  Task,
  TaskStatus,
} from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export interface ProjectPayload {
  name: string;
  description?: string;
}

export interface TaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  tags?: Record<number, number | null>;
}

export interface TagPayload {
  categoryId: number;
  name: string;
  color: string;
}

export const api = {
  getDashboard: () => request<ProjectWithTasks[]>('/api/dashboard'),

  createProject: (payload: ProjectPayload) =>
    request<Project>('/api/projects', { method: 'POST', body: JSON.stringify(payload) }),
  updateProject: (id: number, payload: ProjectPayload) =>
    request<Project>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProject: (id: number) => request<{ ok: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),

  createTask: (projectId: number, payload: TaskPayload) =>
    request<Task>(`/api/tasks/project/${projectId}`, { method: 'POST', body: JSON.stringify(payload) }),
  updateTask: (id: number, payload: TaskPayload) =>
    request<Task>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTask: (id: number) => request<{ ok: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' }),

  getCategories: () => request<TagCategory[]>('/api/categories'),
  createCategory: (name: string) =>
    request<TagCategory>('/api/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  updateCategory: (id: number, name: string) =>
    request<TagCategory>(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteCategory: (id: number) => request<{ ok: boolean }>(`/api/categories/${id}`, { method: 'DELETE' }),

  getTags: (categoryId?: number) =>
    request<Tag[]>(`/api/tags${categoryId !== undefined ? `?categoryId=${categoryId}` : ''}`),
  createTag: (payload: TagPayload) =>
    request<Tag>('/api/tags', { method: 'POST', body: JSON.stringify(payload) }),
  updateTag: (id: number, payload: { name?: string; color?: string }) =>
    request<Tag>(`/api/tags/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTag: (id: number) => request<{ ok: boolean }>(`/api/tags/${id}`, { method: 'DELETE' }),

  getHistory: (projectId: number) => request<HistoryEntry[]>(`/api/history/project/${projectId}`),
  deleteHistoryEntry: (id: number) => request<{ ok: boolean }>(`/api/history/${id}`, { method: 'DELETE' }),

  runAutomation: () => request<AutomationResult>('/api/automation/run', { method: 'POST' }),
  getAutomationConfig: () => request<AutomationConfig>('/api/automation/config'),
};
