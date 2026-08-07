import { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../toast';
import { useReadState } from '../hooks/useReadState';
import { COLUMNS, type ProjectWithTasks, type TagCategory, type Task, type TaskStatus } from '../types';
import { formatDateTime } from '../utils';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { ProjectModal } from './ProjectModal';
import { ConfirmDialog } from './ConfirmDialog';
import type { Route } from '../hooks/useHashRoute';

export function Board({
  projectId,
  projects,
  categories,
  navigate,
  refresh,
}: {
  projectId: number;
  projects: ProjectWithTasks[];
  categories: TagCategory[];
  navigate: (route: Route | string) => void;
  refresh: () => Promise<void>;
}) {
  const { push } = useToast();
  const { markRead } = useReadState();
  const project = projects.find((p) => p.id === projectId);
  const [editing, setEditing] = useState<Task | null>(null);
  const [adding, setAdding] = useState(false);
  const [editProject, setEditProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  // Opening the board clears its unread badge.
  useEffect(() => {
    markRead(projectId);
  }, [markRead, projectId]);

  if (!project) {
    return (
      <div className="panel p-10 text-center space-y-3">
        <p className="text-neon-magenta text-sm uppercase tracking-[0.3em]">project not found</p>
        <button className="btn btn-cyan" onClick={() => navigate('/')}>
          ← Back to dashboard
        </button>
      </div>
    );
  }

  const tasksByStatus = (status: TaskStatus): Task[] =>
    project.tasks.filter((t) => t.status === status);

  const moveTask = async (taskId: number, status: TaskStatus) => {
    const task = project.tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;
    try {
      await api.updateTask(taskId, { status });
      await refresh();
    } catch (err) {
      push({
        kind: 'error',
        title: 'Move failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  const onDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOver(null);
    const id = Number(e.dataTransfer.getData('text/kanbate-task'));
    if (id) void moveTask(id, status);
  };

  const saveTask = async (payload: {
    title: string;
    description: string;
    status: TaskStatus;
    tags: Record<number, number | null>;
  }) => {
    if (editing) {
      await api.updateTask(editing.id, payload);
      push({ kind: 'success', title: 'Task updated', message: payload.title });
    } else if (adding) {
      await api.createTask(projectId, payload);
      push({ kind: 'success', title: 'Task added', message: payload.title });
    }
    await refresh();
  };

  const deleteTask = async () => {
    if (editing) {
      await api.deleteTask(editing.id);
      await refresh();
    }
  };

  const updateProject = async (payload: { name: string; description: string }) => {
    await api.updateProject(projectId, payload);
    push({ kind: 'success', title: 'Project updated', message: payload.name });
    await refresh();
  };

  const deleteProject = async () => {
    await api.deleteProject(projectId);
    setDeletingProject(false);
    push({ kind: 'info', title: 'Project deleted', message: project.name });
    navigate('/');
    await refresh();
  };

  return (
    <div className="space-y-4">
      {/* Board header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/')} className="text-[11px] text-neon-cyan hover:text-neon-cyan/70 uppercase tracking-widest">
              ← dashboard
            </button>
            <span className="text-[11px] text-ink-faint">/</span>
            <span className="text-[11px] uppercase tracking-widest text-neon-magenta">history archive</span>
          </div>
          <h1 className="glitch-title text-2xl sm:text-3xl truncate">{project.name}</h1>
          <p className="text-xs text-ink-muted mt-1">{project.description || '—'}</p>
          <p className="text-[10px] text-ink-faint uppercase tracking-wider mt-1">
            created {formatDateTime(project.createdAt)} · updated {formatDateTime(project.updatedAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={() => navigate(`/history/${projectId}`)}>
            🗄 History ({project.historyCount})
          </button>
          <button className="btn btn-solid" onClick={() => setAdding(true)}>
            + Add task
          </button>
          <button className="btn btn-cyan" onClick={() => setEditProject(true)} aria-label="Edit project">
            ✎
          </button>
          <button className="btn btn-magenta" onClick={() => setDeletingProject(true)} aria-label="Delete project">
            ✕
          </button>
        </div>
      </div>

      {/* Kanban columns — horizontally scrollable so all 4 fit on iPhone */}
      <div className="grid grid-cols-4 gap-3 overflow-x-auto scroll-slim pb-2 -mx-1 px-1">
        {COLUMNS.map((col) => {
          const tasks = tasksByStatus(col.key);
          return (
            <div
              key={col.key}
              className="flex flex-col min-w-[220px] max-w-[340px] w-full rounded-lg border border-edge bg-panel/60"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOver(col.key);
              }}
              onDragLeave={() => setDragOver((prev) => (prev === col.key ? null : prev))}
              onDrop={(e) => onDrop(e, col.key)}
            >
              {/* Column header */}
              <div
                className={`px-3 py-2.5 border-b border-edge flex items-center justify-between gap-2 transition-colors ${
                  dragOver === col.key ? 'bg-neon-cyan/10' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.color, boxShadow: `0 0 8px ${col.color}` }} />
                    <h2 className="text-xs uppercase tracking-[0.18em] font-bold" style={{ color: col.color }}>
                      {col.label}
                    </h2>
                  </div>
                  <p className="text-[9px] uppercase tracking-wider text-ink-faint mt-0.5">{col.hint}</p>
                </div>
                <span className="chip border border-edge text-ink-primary">{tasks.length}</span>
              </div>

              {/* Tasks */}
              <div className="flex-1 p-2 space-y-2 min-h-[120px]">
                {tasks.length === 0 ? (
                  <div className="text-center text-[10px] uppercase tracking-widest text-ink-faint py-6 border border-dashed border-edge rounded">
                    empty
                  </div>
                ) : (
                  tasks.map((t) => (
                    <TaskCard key={t.id} task={t} onOpen={() => setEditing(t)} onMove={(status) => void moveTask(t.id, status)} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-ink-faint uppercase tracking-wider">
        Tip: drag a card into another column, or use its «Move to» selector (touch friendly).
      </p>

      {(editing || adding) && (
        <TaskModal
          task={
            editing ??
            ({
              id: 0,
              projectId,
              title: '',
              description: '',
              status: 'backlog',
              createdAt: '',
              updatedAt: '',
              movedToResolvedAt: null,
              movedToInProgressAt: null,
              tags: [],
            } as Task)
          }
          categories={categories}
          onSave={saveTask}
          onDelete={deleteTask}
          onCancel={() => {
            setEditing(null);
            setAdding(false);
          }}
        />
      )}

      {editProject && (
        <ProjectModal
          initial={project}
          onSave={updateProject}
          onCancel={() => setEditProject(false)}
        />
      )}

      {deletingProject && (
        <ConfirmDialog
          title={`Delete «${project.name}»?`}
          message="This permanently removes the project, all of its tasks and its history archive. This cannot be undone."
          onConfirm={() => void deleteProject()}
          onCancel={() => setDeletingProject(false)}
        />
      )}
    </div>
  );
}
