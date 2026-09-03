export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'resolved' | 'done';

export interface Tag {
  id: number;
  categoryId: number;
  categoryName: string | null;
  name: string;
  color: string;
  createdAt?: string;
  created_at?: string;
}

export interface TagCategory {
  id: number;
  name: string;
  createdAt?: string;
  created_at?: string;
  tags: Tag[];
}

export interface TagRef {
  tagId: number;
  tagName: string;
  categoryId: number;
  categoryName: string;
  color: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  taskCounts?: Partial<Record<TaskStatus, number>>;
  historyCount?: number;
}

export interface ProjectWithTasks extends Project {
  tasks: Task[];
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  movedToResolvedAt?: string | null;
  movedToInProgressAt?: string | null;
  tags?: TagRef[] | Record<string, any>;
}

export interface HistoryEntry {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt?: string;
  created_at?: string;
  movedToResolvedAt?: string | null;
  archivedAt?: string;
  tags?: TagRef[] | Record<string, any>;
}

export interface AutomationResult {
  archived: {
    id: number;
    projectId: number;
    title: string;
    movedToResolvedAt?: string;
    archivedAt?: string;
  }[];
  reminders: {
    id: number;
    projectId: number;
    projectName?: string;
    title: string;
    movedToInProgressAt?: string;
    hoursInProgress?: number;
  }[];
  ranAt?: string;
}

export interface AutomationConfig {
  archiveAfterHours: number;
  remindAfterHours: number;
  autoArchiveDays?: number;
  reminderDays?: number;
}

export const COLUMNS: { key: TaskStatus; label: string; hint: string; color: string }[] = [
  { key: 'backlog', label: 'Backlog', hint: 'Incoming tasks', color: '#00f0ff' },
  { key: 'todo', label: 'To Do', hint: 'Ready to be worked on', color: '#ccff00' },
  { key: 'in_progress', label: 'In Progress', hint: 'Active tasks', color: '#ff2a6d' },
  { key: 'resolved', label: 'Resolved', hint: 'Completed tasks', color: '#00ff9f' },
  { key: 'done', label: 'Done', hint: 'Finished tasks', color: '#00ff9f' },
];

export const NEON_SWATCHES = [
  '#00f0ff',
  '#ff2a6d',
  '#ccff00',
  '#ff9f1c',
  '#00ff9f',
  '#a259ff',
  '#f72585',
  '#e6ecf7',
];