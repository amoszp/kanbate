import { useState } from 'react';
import { api } from '../api';
import { useToast } from '../toast';
import type { ProjectWithTasks } from '../types';

export function QuickAddBar({
  projects,
  refresh,
}: {
  projects: ProjectWithTasks[];
  refresh: () => Promise<void>;
}) {
  const { push } = useToast();
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = title.trim();
    if (!text) return;

    // Auto-split on the first "/": everything before it is the title,
    // everything after it is the description. No "/" -> title only.
    const slashIndex = text.indexOf('/');
    const taskTitle = (slashIndex === -1 ? text : text.slice(0, slashIndex)).trim();
    const description = slashIndex === -1 ? '' : text.slice(slashIndex + 1).trim();
    if (!taskTitle) {
      push({ kind: 'error', title: 'Missing title', message: 'Add a task title before the "/".' });
      return;
    }

    const targetId = projectId === '' ? projects[0]?.id : projectId;
    if (targetId == null) {
      push({ kind: 'error', title: 'No project available', message: 'Create a project first.' });
      return;
    }
    setBusy(true);
    try {
      const task = await api.createTask(targetId, {
        title: taskTitle,
        description,
        status: 'backlog',
      });
      await refresh();
      const project = projects.find((p) => p.id === targetId);
      push({
        kind: 'success',
        title: 'Task added to Backlog',
        message: `«${task.title}» → ${project?.name ?? 'project'} / Backlog`,
      });
      setTitle('');
    } catch (err) {
      push({
        kind: 'error',
        title: 'Failed to add task',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="panel p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:items-center">
      <div className="flex-1 relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neon-cyan/70" aria-hidden>
          ▸
        </span>
        <input
          className="field pl-8"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Type a task title / description… dispatch to Backlog"
          aria-label="Quick add task"
        />
      </div>
      <div className="flex gap-2">
        <select
          className="field flex-1 sm:flex-none sm:w-48 cursor-pointer"
          value={projectId === '' ? '' : String(projectId)}
          onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : '')}
          aria-label="Target project"
        >
          {projects.length > 0 && <option value="">{projects.length} project{projects.length > 1 ? 's' : ''}…</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-solid" disabled={busy || projects.length === 0}>
          {busy ? 'Dispatching…' : 'Add +'}
        </button>
      </div>
    </form>
  );
}
