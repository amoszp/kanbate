import { useState } from 'react';

export function BlockModal({
  title,
  initial,
  submitLabel,
  onSave,
  onCancel,
}: {
  title: string;
  initial: string;
  submitLabel: string;
  onSave: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Block name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(name.trim());
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save block.');
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
        className="panel w-full max-w-sm p-5 animate-slide-in border-2 border-neon-cyan/40"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] uppercase tracking-[0.2em] text-neon-cyan font-bold">{title}</p>
        <div className="mt-4">
          <label className="label" htmlFor="block-name">Block name</label>
          <input
            id="block-name"
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priority, Effort, Tool…"
            autoFocus
          />
          <p className="mt-2 text-[10px] uppercase tracking-wider text-ink-faint">
            A block is a group of tags. Every task can pick one tag per block.
          </p>
        </div>
        {error && <p className="mt-3 text-xs text-neon-magenta">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-solid" disabled={busy}>
            {busy ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
