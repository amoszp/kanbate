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
  tags?: Record<string, any>;
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
  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    const parsed = JSON.parse(stored);
    return parsed !== null && parsed !== undefined ? parsed : defaultValue;
  } catch {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
};

const setStorage = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const api = {
  getDashboard: async (): Promise<ProjectWithTasks[]> => {
    const rawProjects = getStorage<Project[]>(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS as Project[]);
    const rawTasks = getStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS as Task[]);

    const projects = Array.isArray(rawProjects) ? rawProjects : (INITIAL_PROJECTS as Project[]);
    const tasks = Array.isArray(rawTasks) ? rawTasks : (INITIAL_TASKS as Task[]);

    return projects.map((p) => {
      const projectTasks: Task[] = tasks
        .filter((t) => t && t.projectId === p.id)
        .map((t) => {
          // Normalización del estado: mapea 'resolved' a 'done'
          let safeStatus: TaskStatus = t.status;
          if ((t.status as string) === 'resolved') {
            safeStatus = 'done';
          }

          return {
            ...t,
            status: safeStatus || 'todo',
            tags: t?.tags && typeof t.tags === 'object' ? t.tags : {},
          };
        });

      return {
        id: p?.id || Date.now(),
        name: p?.name || 'Proyecto Demo',
        description: p?.description || '',
        created_at: p?.created_at || new Date().toISOString(),
        createdAt: p?.createdAt || new Date().toISOString(),
        tasks: projectTasks, // Retorna un array plano (Task[]) para evitar .filter is not a function
      };
    });
  },

  createProject: async (payload: ProjectPayload): Promise<Project> => {
    const projects = getStorage<Project[]>(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS as Project[]);
    const newProject: Project = {
      id: Date.now(),
      name: payload.name,
      description: payload.description || '',
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    setStorage(STORAGE_KEYS.PROJECTS, [...(Array.isArray(projects) ? projects : []), newProject]);
    return newProject;
  },

  updateProject: async (id: number, payload: ProjectPayload): Promise<Project> => {
    const projects = getStorage<Project[]>(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS as Project[]);
    let updatedProject: Project | null = null;

    const updated = (Array.isArray(projects) ? projects : []).map((p) => {
      if (p.id === id) {
        updatedProject = { ...p, ...payload };
        return updatedProject;
      }
      return p;
    });

    setStorage(STORAGE_KEYS.PROJECTS, updated);
    if (!updatedProject) throw new Error('Project not found');
    return updatedProject;
  },

  deleteProject: async (id: number): Promise<{ ok: boolean }> => {
    const projects = getStorage<Project[]>(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS as Project[]);
    const tasks = getStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS as Task[]);

    setStorage(STORAGE_KEYS.PROJECTS, (Array.isArray(projects) ? projects : []).filter((p) => p.id !== id));
    setStorage(STORAGE_KEYS.TASKS, (Array.isArray(tasks) ? tasks : []).filter((t) => t.projectId !== id));
    return { ok: true };
  },

  createTask: async (projectId: number, payload: TaskPayload): Promise<Task> => {
    const tasks = getStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS as Task[]);
    const newTask: Task = {
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
    };

    setStorage(STORAGE_KEYS.TASKS, [...(Array.isArray(tasks) ? tasks : []), newTask]);
    return newTask;
  },

  updateTask: async (id: number, payload: TaskPayload): Promise<Task> => {
    const tasks = getStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS as Task[]);
    let updatedTask: Task | null = null;

    const updated = (Array.isArray(tasks) ? tasks : []).map((t) => {
      if (t.id === id) {
        updatedTask = { ...t, ...payload, tags: payload.tags || t.tags || {} };
        return updatedTask;
      }
      return t;
    });

    setStorage(STORAGE_KEYS.TASKS, updated);
    if (!updatedTask) throw new Error('Task not found');
    return updatedTask;
  },

  deleteTask: async (id: number): Promise<{ ok: boolean }> => {
    const tasks = getStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS as Task[]);
    setStorage(STORAGE_KEYS.TASKS, (Array.isArray(tasks) ? tasks : []).filter((t) => t.id !== id));
    return { ok: true };
  },

  getCategories: async (): Promise<TagCategory[]> => {
    const categories = getStorage<TagCategory[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_BLOCKS as TagCategory[]);
    if (!Array.isArray(categories)) return DEFAULT_BLOCKS as TagCategory[];
    return categories.map((c) => ({
      ...c,
      tags: Array.isArray(c?.tags) ? c.tags : [],
    }));
  },

  createCategory: async (name: string): Promise<TagCategory> => {
    const categories = getStorage<TagCategory[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_BLOCKS as TagCategory[]);
    const newCategory: TagCategory = {
      id: Date.now(),
      name,
      createdAt: new Date().toISOString(),
      tags: [],
    };

    setStorage(STORAGE_KEYS.CATEGORIES, [...(Array.isArray(categories) ? categories : []), newCategory]);
    return newCategory;
  },

  updateCategory: async (id: number, name: string): Promise<TagCategory> => {
    const categories = getStorage<TagCategory[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_BLOCKS as TagCategory[]);
    let updatedCat: TagCategory | null = null;

    const updated = (Array.isArray(categories) ? categories : []).map((c) => {
      if (c.id === id) {
        updatedCat = { ...c, name };
        return updatedCat;
      }
      return c;
    });

    setStorage(STORAGE_KEYS.CATEGORIES, updated);
    if (!updatedCat) throw new Error('Category not found');
    return updatedCat;
  },

  deleteCategory: async (id: number): Promise<{ ok: boolean }> => {
    const categories = getStorage<TagCategory[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_BLOCKS as TagCategory[]);
    setStorage(STORAGE_KEYS.CATEGORIES, (Array.isArray(categories) ? categories : []).filter((c) => c.id !== id));
    return { ok: true };
  },

  getTags: async (categoryId?: number): Promise<Tag[]> => {
    const categories = getStorage<TagCategory[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_BLOCKS as TagCategory[]);
    const safeCategories = Array.isArray(categories) ? categories : [];
    const allTags = safeCategories.flatMap((c) => (Array.isArray(c?.tags) ? c.tags : []));
    if (categoryId !== undefined) {
      const cat = safeCategories.find((c) => c.id === categoryId);
      return cat && Array.isArray(cat.tags) ? cat.tags : [];
    }
    return allTags;
  },

  createTag: async (payload: TagPayload): Promise<Tag> => {
    const categories = getStorage<TagCategory[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_BLOCKS as TagCategory[]);
    const safeCategories = Array.isArray(categories) ? categories : [];
    const cat = safeCategories.find((c) => c.id === payload.categoryId);
    const newTag: Tag = {
      id: Date.now(),
      categoryId: payload.categoryId,
      categoryName: cat ? cat.name : '',
      name: payload.name,
      color: payload.color,
      createdAt: new Date().toISOString(),
    };

    const updated = safeCategories.map((c) => {
      if (c.id === payload.categoryId) {
        const existingTags = Array.isArray(c.tags) ? c.tags : [];
        return { ...c, tags: [...existingTags, newTag] };
      }
      return c;
    });

    setStorage(STORAGE_KEYS.CATEGORIES, updated);
    return newTag;
  },

  updateTag: async (id: number, payload: { name?: string; color?: string }): Promise<Tag> => {
    const categories = getStorage<TagCategory[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_BLOCKS as TagCategory[]);
    let updatedTag: Tag | null = null;

    const updated = (Array.isArray(categories) ? categories : []).map((c) => ({
      ...c,
      tags: (Array.isArray(c?.tags) ? c.tags : []).map((t) => {
        if (t.id === id) {
          updatedTag = { ...t, ...payload };
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
    const categories = getStorage<TagCategory[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_BLOCKS as TagCategory[]);
    const updated = (Array.isArray(categories) ? categories : []).map((c) => ({
      ...c,
      tags: (Array.isArray(c?.tags) ? c.tags : []).filter((t) => t.id !== id),
    }));

    setStorage(STORAGE_KEYS.CATEGORIES, updated);
    return { ok: true };
  },

  getHistory: async (_projectId: number): Promise<HistoryEntry[]> => {
    const history = getStorage<HistoryEntry[]>(STORAGE_KEYS.HISTORY, []);
    return Array.isArray(history) ? history : [];
  },

  deleteHistoryEntry: async (id: number): Promise<{ ok: boolean }> => {
    const history = getStorage<HistoryEntry[]>(STORAGE_KEYS.HISTORY, []);
    setStorage(STORAGE_KEYS.HISTORY, (Array.isArray(history) ? history : []).filter((h) => h.id !== id));
    return { ok: true };
  },

  runAutomation: async (): Promise<AutomationResult> => {
    return {
      archived: [],
      reminders: [],
    } as unknown as AutomationResult;
  },

  getAutomationConfig: async (): Promise<AutomationConfig> => {
    return {
      autoArchiveDays: 30,
      reminderDays: 7,
    } as unknown as AutomationConfig;
  },
};