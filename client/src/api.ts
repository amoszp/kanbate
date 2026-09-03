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
import { DEFAULT_BLOCKS, INITIAL_PROJECTS, INITIAL_TASKS } from './mockData';

export interface ProjectPayload {
  name: string;
  description?: string;
}

export interface TaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  tags?: Record<number, number | null> | any;
}

export interface TagPayload {
  categoryId: number;
  name: string;
  color: string;
}

const STORAGE_KEYS = {
  CATEGORIES: 'kanbate_categories',
  PROJECTS: 'kanbate_projects',
  TASKS: 'kanbate_tasks',
  HISTORY: 'kanbate_history',
};

const getStorage = <T>(key: string, defaultValue: T): T => {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return defaultValue;
  }
};

const setStorage = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const api = {
  getDashboard: async (): Promise<ProjectWithTasks[]> => {
    const projects = getStorage<Project[]>(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS as any);
    const tasks = getStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS as any);

    return projects.map((p) => ({
      ...p,
      tasks: tasks
        .filter((t) => t.projectId === p.id)
        .map((t) => ({
          ...t,
          tags: t.tags || {},
        })),
    })) as ProjectWithTasks[];
  },

  createProject: async (payload: ProjectPayload): Promise<Project> => {
    const projects = getStorage<Project[]>(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS as any);
    const newProject = {
      id: Date.now(),
      name: payload.name,
      description: payload.description || '',
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    } as unknown as Project;

    setStorage(STORAGE_KEYS.PROJECTS, [...projects, newProject]);
    return newProject;
  },

  updateProject: async (id: number, payload: ProjectPayload): Promise<Project> => {
    const projects = getStorage<Project[]>(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS as any);
    let updatedProject: Project | null = null;

    const updated = projects.map((p) => {
      if (p.id === id) {
        updatedProject = { ...p, ...payload } as unknown as Project;
        return updatedProject;
      }
      return p;
    });

    setStorage(STORAGE_KEYS.PROJECTS, updated);
    if (!updatedProject) throw new Error('Project not found');
    return updatedProject;
  },

  deleteProject: async (id: number): Promise<{ ok: boolean }> => {
    const projects = getStorage<Project[]>(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS as any);
    const tasks = getStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS as any);

    setStorage(STORAGE_KEYS.PROJECTS, projects.filter((p) => p.id !== id));
    setStorage(STORAGE_KEYS.TASKS, tasks.filter((t) => t.projectId !== id));
    return { ok: true };
  },

  createTask: async (projectId: number, payload: TaskPayload): Promise<Task> => {
    const tasks = getStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS as any);
    const newTask = {
      id: Date.now(),
      projectId,
      title: payload.title || 'Nueva tarea',
      description: payload.description || '',
      status: payload.status || 'todo',
      tags: payload.tags || {},
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      movedToResolvedAt: null,
      movedToInProgressAt: null,
    } as unknown as Task;

    setStorage(STORAGE_KEYS.TASKS, [...tasks, newTask]);
    return newTask;
  },

  updateTask: async (id: number, payload: TaskPayload): Promise<Task> => {
    const tasks = getStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS as any);
    let updatedTask: Task | null = null;

    const updated = tasks.map((t) => {
      if (t.id === id) {
        updatedTask = { ...t, ...payload, tags: payload.tags || t.tags || {} } as unknown as Task;
        return updatedTask;
      }
      return t;
    });

    setStorage(STORAGE_KEYS.TASKS, updated);
    if (!updatedTask) throw new Error('Task not found');
    return updatedTask;
  },

  deleteTask: async (id: number): Promise<{ ok: boolean }> => {
    const tasks = getStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS as any);
    setStorage(STORAGE_KEYS.TASKS, tasks.filter((t) => t.id !== id));
    return { ok: true };
  },

  getCategories: async (): Promise<TagCategory[]> => {
    return getStorage<TagCategory[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_BLOCKS as any);
  },

  createCategory: async (name: string): Promise<TagCategory> => {
    const categories = getStorage<TagCategory[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_BLOCKS as any);
    const newCategory = {
      id: Date.now(),
      name,
      createdAt: new Date().toISOString(),
      tags: [],
    } as unknown as TagCategory;

    setStorage(STORAGE_KEYS.CATEGORIES, [...categories, newCategory]);
    return newCategory;
  },

  updateCategory: async (id: number, name: string): Promise<TagCategory> => {
    const categories = getStorage<TagCategory[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_BLOCKS as any);
    let updatedCat: TagCategory | null = null;

    const updated = categories.map((c) => {
      if (c.id === id) {
        updatedCat = { ...c, name } as unknown as TagCategory;
        return updatedCat;
      }
      return c;
    });

    setStorage(STORAGE_KEYS.CATEGORIES, updated);
    if (!updatedCat) throw new Error('Category not found');
    return updatedCat;
  },

  deleteCategory: async (id: number): Promise<{ ok: boolean }> => {
    const categories = getStorage<TagCategory[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_BLOCKS as any);
    setStorage(STORAGE_KEYS.CATEGORIES, categories.filter((c) => c.id !== id));
    return { ok: true };
  },

  getTags: async (categoryId?: number): Promise<Tag[]> => {
    const categories = getStorage<TagCategory[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_BLOCKS as any);
    const allTags = categories.flatMap((c) => c.tags || []);
    if (categoryId !== undefined) {
      const cat = categories.find((c) => c.id === categoryId);
      return (cat ? cat.tags || [] : []) as Tag[];
    }
    return allTags as Tag[];
  },

  createTag: async (payload: TagPayload): Promise<Tag> => {
    const categories = getStorage<TagCategory[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_BLOCKS as any);
    const cat = categories.find((c) => c.id === payload.categoryId);
    const newTag = {
      id: Date.now(),
      categoryId: payload.categoryId,
      categoryName: cat ? cat.name : '',
      name: payload.name,
      color: payload.color,
      createdAt: new Date().toISOString(),
    } as unknown as Tag;

    const updated = categories.map((c) => {
      if (c.id === payload.categoryId) {
        return { ...c, tags: [...(c.tags || []), newTag] };
      }
      return c;
    });

    setStorage(STORAGE_KEYS.CATEGORIES, updated);
    return newTag;
  },

  updateTag: async (id: number, payload: { name?: string; color?: string }): Promise<Tag> => {
    const categories = getStorage<TagCategory[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_BLOCKS as any);
    let updatedTag: Tag | null = null;

    const updated = categories.map((c) => ({
      ...c,
      tags: (c.tags || []).map((t) => {
        if (t.id === id) {
          updatedTag = { ...t, ...payload } as unknown as Tag;
          return updatedTag;
        }
        return t;
      }),
    }));

    setStorage(STORAGE_KEYS.CATEGORIES, updated);
    if (!updatedTag) throw new Error('Tag not found');
    return updatedTag;
  },

  deleteTag: async (id: number): Promise<{ ok: boolean }> => {
    const categories = getStorage<TagCategory[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_BLOCKS as any);
    const updated = categories.map((c) => ({
      ...c,
      tags: (c.tags || []).filter((t) => t.id !== id),
    }));

    setStorage(STORAGE_KEYS.CATEGORIES, updated);
    return { ok: true };
  },

  getHistory: async (_projectId: number): Promise<HistoryEntry[]> => {
    return getStorage<HistoryEntry[]>(STORAGE_KEYS.HISTORY, []);
  },

  deleteHistoryEntry: async (id: number): Promise<{ ok: boolean }> => {
    const history = getStorage<HistoryEntry[]>(STORAGE_KEYS.HISTORY, []);
    setStorage(STORAGE_KEYS.HISTORY, history.filter((h) => h.id !== id));
    return { ok: true };
  },

  runAutomation: async (): Promise<AutomationResult> => {
    return {} as AutomationResult;
  },

  getAutomationConfig: async (): Promise<AutomationConfig> => {
    return {} as AutomationConfig;
  },
};