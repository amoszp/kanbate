import { useState } from 'react';
import { useToast } from '../toast';
import { COLUMNS, type Project, type TagCategory, type Task, type TransferResult } from '../types';
import { formatDateTime } from '../utils';
import { CommentsPanel } from './CommentsPanel';
import { ConfirmDialog } from './ConfirmDialog';
import { TransferDialog } from './TransferDialog';
import { Modal } from './ui';

export function TaskModal({
  task,
  categories,
  projects,
  onSave,
  onDelete,
  onCancel,
  onTransferred,
  onCommentsChanged,
}: {
  task: Task;
  categories: TagCategory[];
  /** Enables the Move / Copy action when provided. */
  projects?: Project[];
  onTransferred?: (result: TransferResult) => Promise<void> | void;
  onCommentsChanged?: () => void;
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
  const [transferring, setTransferring] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { push } = useToast();
  const isNew = task.id === 0;
  const projectName = projects?.find((p) => p.id === task.projectId)?.name;

  const finishTransfer = async (result: TransferResult, targetName: string) => {
    push({
      kind: 'success',
      title: result.mode === 'move' ? 'Task moved' : 'Task copied',
      message: `«${result.task.title}» → ${targetName}`,
    });
    setTransferring(false);
    onCancel();
    await onTransferred?.(result);
  };

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
    setConfirmingDelete(false);
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
    <>
    <Modal onClose={onCancel} size="xl" onSubmit={submit}>
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow text-neon-cyan">
            {isNew ? 'New task' : 'Edit task'}
            {projectName && <span className="text-ink-muted font-normal"> · {projectName}</span>}
          </p>
          {!isNew && (
            <span className="chip chip-neutral">
              id #{task.id} · created {formatDateTime(task.createdAt)}
            </span>
          )}
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
            <select id="task-status" className="field" value={status} onChange={(e) => setStatus(e.target.value as Task['status'])}>
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
                    className="field"
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

        <div className="meta mt-4 grid grid-cols-2 gap-2">
          <span>Updated: {formatDateTime(task.updatedAt)}</span>
          <span>
            In progress since: {formatDateTime(task.movedToInProgressAt)}
          </span>
          <span>Resolved: {formatDateTime(task.movedToResolvedAt)}</span>
          <span>In backlog since: {formatDateTime(task.createdAt)}</span>
        </div>

        {error && <p className="mt-3 text-xs text-neon-magenta">{error}</p>}

        <div className="mt-5 flex flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            {!isNew && (
              <button type="button" className="btn btn-danger" onClick={() => !busy && setConfirmingDelete(true)}>
                Delete
              </button>
            )}
            {!isNew && projects && (
              <button type="button" className="btn btn-secondary" onClick={() => setTransferring(true)}>
                ⇄ Move / Copy
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save task'}
            </button>
          </div>
        </div>

        {!isNew && <CommentsPanel target={{ type: 'task', id: task.id }} onChanged={onCommentsChanged} />}
    </Modal>

    {/* Sibling of the overlay (not a child) so its backdrop clicks don't
        bubble up and close the task modal too. */}
    {transferring && projects && (
      <TransferDialog
        task={task}
        projects={projects}
        onDone={finishTransfer}
        onCancel={() => setTransferring(false)}
      />
    )}

    {confirmingDelete && (
      <ConfirmDialog
        title="Delete this task permanently?"
        message={task.title}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmingDelete(false)}
      />
    )}
    </>
  );
}
