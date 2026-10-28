import { useState } from 'react';
import { api } from '../api';
import type { Project, Task, TransferResult } from '../types';
import { Modal } from './ui';

const NEW_PROJECT = 'new';

/** Move or copy a task to another project — or to a brand-new one. */
export function TransferDialog({
  task,
  projects,
  onDone,
  onCancel,
}: {
  task: Task;
  projects: Project[];
  onDone: (result: TransferResult, targetName: string) => Promise<void> | void;
  onCancel: () => void;
}) {
  const others = projects.filter((p) => p.id !== task.projectId);
  const [mode, setMode] = useState<'move' | 'copy'>('move');
  const [target, setTarget] = useState<string>(others[0] ? String(others[0].id) : NEW_PROJECT);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Copying into the same project (a duplicate) is allowed; moving is not.
  const choices = mode === 'copy' ? projects : others;

  const changeMode = (next: 'move' | 'copy') => {
    setMode(next);
    if (next === 'move' && target === String(task.projectId)) {
      setTarget(others[0] ? String(others[0].id) : NEW_PROJECT);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = target === NEW_PROJECT;
    if (isNew && !newName.trim()) {
      setError('Give the new project a name.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api.transferTask(
        task.id,
        isNew ? { mode, newProject: { name: newName.trim() } } : { mode, projectId: Number(target) }
      );
      const targetName = isNew ? newName.trim() : projects.find((p) => p.id === Number(target))?.name ?? 'project';
      await onDone(result, targetName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed.');
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onCancel} layer="top" onSubmit={submit}>
        <p className="eyebrow text-neon-cyan">⇄ Move / copy task</p>
        <h2 className="mt-1 text-sm text-ink-primary break-words">
          #{task.id} · {task.title}
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Transfer mode">
          {(['move', 'copy'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              className={`btn ${mode === m ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => changeMode(m)}
            >
              {m === 'move' ? '→ Move' : '⧉ Copy'}
            </button>
          ))}
        </div>
        <p className="meta mt-2">
          {mode === 'move'
            ? 'The task leaves this project, keeping its id, tags and comments.'
            : 'A new task is created with the same tags and comments; the original stays.'}
        </p>

        <div className="mt-4">
          <label className="label" htmlFor="transfer-target">Target project</label>
          <select
            id="transfer-target"
            className="field"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            {choices.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.id === task.projectId ? ' (this project)' : ''}
              </option>
            ))}
            <option value={NEW_PROJECT}>+ New project…</option>
          </select>
        </div>

        {target === NEW_PROJECT && (
          <div className="mt-3">
            <label className="label" htmlFor="transfer-new-name">New project name</label>
            <input
              id="transfer-new-name"
              className="field"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Side quests"
              autoFocus
            />
          </div>
        )}

        {error && <p className="mt-3 text-xs text-neon-magenta">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Working…' : mode === 'move' ? 'Move task' : 'Copy task'}
          </button>
        </div>
    </Modal>
  );
}
