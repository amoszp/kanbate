import { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../toast';
import { NEON_SWATCHES, type Tag, type TagCategory } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

export function TagManager({
  category,
  onDeleteBlock,
  onRenameBlock,
  refresh,
}: {
  category: TagCategory;
  onDeleteBlock: () => void;
  onRenameBlock: () => void;
  refresh: () => Promise<void>;
}) {
  const { push } = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState(NEON_SWATCHES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [deleting, setDeleting] = useState<Tag | null>(null);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setColor(editing.color);
    }
  }, [editing]);

  const tags = category.tags;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await api.updateTag(editing.id, { name: name.trim(), color });
        push({ kind: 'success', title: 'Tag updated', message: name.trim() });
      } else {
        await api.createTag({ categoryId: category.id, name: name.trim(), color });
        push({ kind: 'success', title: 'Tag created', message: name.trim() });
      }
      setName('');
      setColor(NEON_SWATCHES[0]);
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tag.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (tag: Tag) => {
    setDeleting(null);
    await api.deleteTag(tag.id);
    push({ kind: 'info', title: 'Tag deleted', message: tag.name });
    await refresh();
  };

  return (
    <section className="panel p-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="section-title truncate">
            {category.name}
          </h2>
          <span className="chip chip-neutral shrink-0">{tags.length}</span>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button className="btn btn-secondary btn-icon" onClick={onRenameBlock} aria-label="Rename block">
            ✎
          </button>
          <button className="btn btn-danger btn-icon" onClick={onDeleteBlock} aria-label="Delete block">
            ✕
          </button>
        </div>
      </header>

      <ul className="mt-4 space-y-2">
        {tags.map((tag) => (
          <li key={tag.id} className="inset flex items-center justify-between gap-2 px-3 py-2">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: tag.color, boxShadow: `0 0 8px ${tag.color}` }} />
              <span className="text-sm text-ink-primary truncate">{tag.name}</span>
            </span>
            <span className="flex gap-1.5 shrink-0">
              <button className="btn btn-secondary btn-icon" onClick={() => setEditing(tag)} aria-label={`Edit ${tag.name}`}>
                ✎
              </button>
              <button className="btn btn-danger btn-icon" onClick={() => setDeleting(tag)} aria-label={`Delete ${tag.name}`}>
                ✕
              </button>
            </span>
          </li>
        ))}
        {tags.length === 0 && (
          <li className="empty-state text-center py-4">no tags yet</li>
        )}
      </ul>

      <form onSubmit={submit} className="mt-4 border-t border-edge pt-4">
        <p className="label">{editing ? `Edit «${editing.name}»` : 'New tag'}</p>
        <div className="flex flex-wrap gap-2">
          <input
            className="field flex-1 min-w-[140px]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={editing ? 'New tag name' : 'Tag name'}
            aria-label="Tag name"
          />
          <div className="flex items-center gap-2 flex-wrap">
            {NEON_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`swatch transition-transform duration-150 ${color === c ? 'scale-110 ring-2 ring-offset-2 ring-offset-panel ring-neon-cyan' : 'hover:scale-105'}`}
                style={{ background: c, boxShadow: color === c ? `0 0 10px ${c}` : `0 0 6px ${c}55` }}
                aria-label={`Color ${c}`}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="swatch cursor-pointer border-none bg-transparent"
              aria-label="Custom color"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? '…' : editing ? 'Save' : 'Add tag'}
          </button>
          {editing && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setEditing(null);
                setName('');
                setColor(NEON_SWATCHES[0]);
              }}
            >
              Cancel
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-neon-magenta">{error}</p>}
      </form>

      {deleting && (
        <ConfirmDialog
          title={`Delete tag «${deleting.name}»?`}
          message="Tasks using it will lose this tag."
          onConfirm={() => void remove(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </section>
  );
}
