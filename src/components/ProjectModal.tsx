import { useEffect, useState } from 'react';
import type { Project } from '../types';

export function ProjectModal({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Project;
  onSave: (payload: { name: string; description: string }) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), description: description.trim() });
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <form
        onSubmit={submit}
        className="panel w-full max-w-lg p-5 animate-slide-in border-2 border-neon-cyan/40"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] uppercase tracking-[0.2em] text-neon-cyan font-bold">
          {initial ? 'EDIT PROJECT' : 'NEW PROJECT'}
        </p>
        <div className="mt-4">
          <label className="label" htmlFor="proj-name">Project name</label>
          <input
            id="proj-name"
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Homelab v3"
            autoFocus
          />
        </div>
        <div className="mt-3">
          <label className="label" htmlFor="proj-desc">Description</label>
          <textarea
            id="proj-desc"
            className="field resize-none"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
          />
        </div>
        {error && <p className="mt-3 text-xs text-neon-magenta">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-solid" disabled={busy}>
            {busy ? 'Saving…' : initial ? 'Save changes' : 'Create project'}
          </button>
        </div>
      </form>
    </div>
  );
}
