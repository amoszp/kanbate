import { useState } from 'react';
import { api } from '../api';
import { useToast } from '../toast';
import { useReadState, unreadCount } from '../hooks/useReadState';
import { COLUMNS, type ProjectWithTasks } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { ProjectModal } from './ProjectModal';
import { QuickAddBar } from './QuickAddBar';
import type { Route } from '../hooks/useHashRoute';

export function Dashboard({
  projects,
  loading,
  navigate,
  refresh,
}: {
  projects: ProjectWithTasks[];
  loading: boolean;
  navigate: (route: Route | string) => void;
  refresh: () => Promise<void>;
}) {
  const { push } = useToast();
  const { getLastRead } = useReadState();
  const [projectModal, setProjectModal] = useState<null | { editing?: ProjectWithTasks }>(null);
  const [deleting, setDeleting] = useState<ProjectWithTasks | null>(null);

  const saveProject = async (payload: { name: string; description: string }) => {
    if (projectModal?.editing) {
      await api.updateProject(projectModal.editing.id, payload);
      push({ kind: 'success', title: 'Project updated', message: payload.name });
    } else {
      await api.createProject(payload);
      push({ kind: 'success', title: 'Project created', message: payload.name });
    }
    await refresh();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await api.deleteProject(deleting.id);
    push({ kind: 'info', title: 'Project deleted', message: deleting.name });
    setDeleting(null);
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="glitch-title text-2xl sm:text-3xl">DASHBOARD</h1>
        <p className="text-xs text-ink-muted mt-1 uppercase tracking-[0.2em]">
          {loading ? 'loading boards…' : `${projects.length} project${projects.length === 1 ? '' : 's'} · one board per project`}
        </p>
      </div>

      <QuickAddBar projects={projects} refresh={refresh} />

      <div className="flex items-center justify-between">
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-ink-muted">Projects</h2>
        <button className="btn btn-cyan" onClick={() => setProjectModal({})}>
          + New project
        </button>
      </div>

      {loading && projects.length === 0 ? (
        <div className="panel p-10 text-center text-sm text-ink-muted">booting terminal…</div>
      ) : projects.length === 0 ? (
        <div className="panel p-10 text-center space-y-3">
          <p className="text-neon-cyan/80 text-sm uppercase tracking-[0.3em]">no projects found</p>
          <p className="text-xs text-ink-muted">Create your first project to start a kanban board.</p>
          <button className="btn btn-solid" onClick={() => setProjectModal({})}>
            + Create project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const safeTasks = Array.isArray(p.tasks) ? p.tasks : [];
            const backlogDates = safeTasks
              .filter((t) => t.status === 'backlog')
              .map((t) => t.createdAt || t.created_at || '')
              .filter(Boolean);

            return (
              <ProjectCard
                key={p.id}
                project={p}
                unread={unreadCount(backlogDates, getLastRead(p.id))}
                onOpen={() => navigate(`/board/${p.id}`)}
                onEdit={() => setProjectModal({ editing: p })}
                onDelete={() => setDeleting(p)}
              />
            );
          })}
        </div>
      )}

      {projectModal && (
        <ProjectModal
          initial={projectModal.editing}
          onSave={saveProject}
          onCancel={() => setProjectModal(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete «${deleting.name}»?`}
          message="This permanently removes the project, all of its tasks and its history archive. This cannot be undone."
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function ProjectCard({
  project,
  unread,
  onOpen,
  onEdit,
  onDelete,
}: {
  project: ProjectWithTasks;
  unread: number;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const safeTasks = Array.isArray(project.tasks) ? project.tasks : [];
  
  // Calcula dinámicamente las tareas por estado directamente desde el array safeTasks
  const countsByStatus = safeTasks.reduce((acc, task) => {
    const status = task.status || 'todo';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = safeTasks.length;
  const historyCount = project.historyCount ?? 0;

  return (
    <div className="panel p-4 flex flex-col gap-3 hover:border-neon-cyan/40 transition-colors relative">
      {unread > 0 && (
        <span
          className="absolute -top-2 -right-2 z-10 min-w-[1.6rem] h-6 px-1.5 rounded-full flex items-center justify-center text-[11px] font-bold text-white bg-neon-magenta shadow-neon-magenta animate-pulse-glow"
          title={`${unread} unread task${unread === 1 ? '' : 's'} in Backlog`}
        >
          {unread}
        </span>
      )}

      <button onClick={onOpen} className="text-left group">
        <h3 className="glitch-title text-lg truncate group-hover:text-neon-cyan transition-colors">
          {project.name}
        </h3>
        <p className="text-xs text-ink-muted mt-0.5 line-clamp-2 min-h-[2rem]">
          {project.description || '—'}
        </p>
      </button>

      <div className="grid grid-cols-4 gap-1.5 text-center">
        {COLUMNS.map((c) => (
          <div key={c.key} className="rounded border border-edge bg-backdrop px-1 py-1.5" title={c.label}>
            <div className="text-[9px] uppercase tracking-wider" style={{ color: c.color }}>
              {c.label.replace(' ', '\u00A0')}
            </div>
            <div className="text-sm font-bold text-ink-primary">
              {countsByStatus[c.key] ?? project.taskCounts?.[c.key] ?? 0}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px] text-ink-faint uppercase tracking-wider">
        <span>{total} task{total === 1 ? '' : 's'}</span>
        <span>archive: {historyCount}</span>
      </div>

      <div className="flex gap-2">
        <button className="btn btn-solid flex-1" onClick={onOpen}>
          Open board
        </button>
        <button className="btn btn-cyan" onClick={onEdit} aria-label="Edit project">
          ✎
        </button>
        <button className="btn btn-magenta" onClick={onDelete} aria-label="Delete project">
          ✕
        </button>
      </div>
    </div>
  );
}