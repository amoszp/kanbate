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
        <h1 className="page-title">DASHBOARD</h1>
        <p className="page-subtitle">
          {loading ? 'loading boards…' : `${projects.length} project${projects.length === 1 ? '' : 's'} · one board per project`}
        </p>
      </div>

      <QuickAddBar projects={projects} refresh={refresh} />

      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">Projects</h2>
        <button className="btn btn-primary" onClick={() => setProjectModal({})}>
          + New project
        </button>
      </div>

      {loading && projects.length === 0 ? (
        <div className="panel p-10 text-center empty-state">booting terminal…</div>
      ) : projects.length === 0 ? (
        <div className="panel p-10 text-center space-y-3">
          <p className="empty-state">no projects found</p>
          <p className="text-xs text-ink-muted">Create your first project to start a kanban board.</p>
          <button className="btn btn-primary" onClick={() => setProjectModal({})}>
            + Create project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              unread={unreadCount(p.tasks.filter((t) => t.status === 'backlog').map((t) => t.createdAt), getLastRead(p.id))}
              onOpen={() => navigate(`/board/${p.id}`)}
              onEdit={() => setProjectModal({ editing: p })}
              onDelete={() => setDeleting(p)}
            />
          ))}
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
  const total = Object.values(project.taskCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="panel panel-link p-4 flex flex-col gap-3 relative">
      {unread > 0 && (
        <span
          className="absolute -top-2 -right-2 z-10 min-w-[1.6rem] h-6 px-1.5 rounded-full flex items-center justify-center text-eyebrow font-bold text-white bg-neon-magenta shadow-glow-magenta animate-pulse-glow"
          title={`${unread} unread task${unread === 1 ? '' : 's'} in Backlog`}
        >
          {unread}
        </span>
      )}

      <button onClick={onOpen} className="tap text-left group rounded-control">
        <h3 className="glitch-title text-lg truncate group-hover:text-neon-cyan transition-colors">
          {project.name}
        </h3>
        <p className="text-xs text-ink-muted mt-0.5 line-clamp-2 min-h-[2rem]">
          {project.description || '—'}
        </p>
      </button>

      <div className="grid grid-cols-4 gap-1.5 text-center">
        {COLUMNS.map((c) => (
          <div key={c.key} className="inset px-1 py-1.5" title={c.label}>
            <div className="text-micro uppercase tracking-meta" style={{ color: c.color }}>
              {c.label.replace(' ', '\u00A0')}
            </div>
            <div className="text-sm font-bold text-ink-primary">
              {project.taskCounts[c.key]}
            </div>
          </div>
        ))}
      </div>

      <div className="meta flex items-center justify-between gap-2">
        <span>{total} task{total === 1 ? '' : 's'}</span>
        <span>archive: {project.historyCount}</span>
      </div>

      <div className="flex gap-2">
        <button className="btn btn-primary flex-1" onClick={onOpen}>
          Open board
        </button>
        <button className="btn btn-secondary btn-icon" onClick={onEdit} aria-label="Edit project">
          ✎
        </button>
        <button className="btn btn-danger btn-icon" onClick={onDelete} aria-label="Delete project">
          ✕
        </button>
      </div>
    </div>
  );
}
