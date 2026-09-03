import { useEffect, useState } from 'react';
import { useToast } from '../toast';
import { COLUMNS, type TagCategory, type Task } from '../types';
import { formatDateTime } from '../utils';

export function TaskModal({
  task,
  categories,
  onSave,
  onDelete,
  onCancel,
}: {
  task: Task;
  categories: TagCategory[];
  onSave: (payload: {
    title: string;
    description: string;
    status: Task['status'];
    tags: Record<number, number | null>;
  }) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState<Task['status']>(task.status);
  // One selected tag per block: categoryId -> tagId ('' = none)
  const [tagValues, setTagValues] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    for (const t of task.tags) init[t.categoryId] = String(t.tagId);
    return init;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const tags: Record<number, number | null> = {};
      for (const c of categories) {
        const v = tagValues[c.id];
        tags[c.id] = v && v !== '' ? Number(v) : null;
      }
      await onSave({ title: title.trim(), description: description.trim(), status, tags });
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    if (!window.confirm('Delete this task permanently?')) return;
    setBusy(true);
    try {
      await onDelete();
      push({ kind: 'info', title: 'Task deleted', message: task.title });
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task.');
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onCancel}
    >
      <form
        onSubmit={submit}
        className="panel w-full max-w-xl my-6 p-5 animate-slide-in border-2 border-neon-cyan/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-neon-cyan font-bold">Edit task</p>
          <span className="chip border border-edge text-ink-muted">
            id #{task.id} · created {formatDateTime(task.createdAt)}
          </span>
        </div>

        <div className="mt-4">
          <label className="label" htmlFor="task-title">Title</label>
          <input id="task-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>

        <div className="mt-3">
          <label className="label" htmlFor="task-desc">Description</label>
          <textarea
            id="task-desc"
            className="field resize-none"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes, context, acceptance criteria…"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="task-status">Status</label>
            <select id="task-status" className="field cursor-pointer" value={status} onChange={(e) => setStatus(e.target.value as Task['status'])}>
              {COLUMNS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic tag blocks — one select per category */}
        {categories.length > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.map((c) => {
              const value = tagValues[c.id] ?? '';
              return (
                <div key={c.id}>
                  <label className="label" htmlFor={`task-tag-${c.id}`}>{c.name}</label>
                  <select
                    id={`task-tag-${c.id}`}
                    className="field cursor-pointer"
                    value={value}
                    onChange={(e) => setTagValues((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  >
                    <option value="">— none —</option>
                    {c.tags.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 text-[10px] uppercase tracking-wider text-ink-faint grid grid-cols-2 gap-2">
          <span>Updated: {formatDateTime(task.updatedAt)}</span>
          <span>
            In progress since: {formatDateTime(task.movedToInProgressAt)}
          </span>
          <span>Resolved: {formatDateTime(task.movedToResolvedAt)}</span>
          <span>In backlog since: {formatDateTime(task.createdAt)}</span>
        </div>

        {error && <p className="mt-3 text-xs text-neon-magenta">{error}</p>}

        <div className="mt-5 flex flex-wrap justify-between gap-2">
          <button type="button" className="btn btn-magenta" onClick={() => void remove()}>
            Delete
          </button>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-solid" disabled={busy}>
              {busy ? 'Saving…' : 'Save task'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
