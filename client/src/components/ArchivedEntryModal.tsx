import { useEffect } from 'react';
import type { HistoryEntry } from '../types';
import { formatDateTime } from '../utils';
import { CommentsPanel } from './CommentsPanel';

/** Read-only view of an archived task, with its comment / activity stream. */
export function ArchivedEntryModal({
  entry,
  onClose,
  onOpenArchive,
  onCommentsChanged,
}: {
  entry: HistoryEntry;
  onClose: () => void;
  /** Shown as a "go to project archive" link when provided. */
  onOpenArchive?: () => void;
  onCommentsChanged?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="panel w-full max-w-xl my-6 p-5 animate-slide-in border-2 border-neon-magenta/40"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-neon-magenta font-bold">
            🗄 Archived task
            {entry.projectName && <span className="text-ink-muted font-normal"> · {entry.projectName}</span>}
          </p>
          <span className="chip border border-edge text-ink-muted">archive #{entry.id}</span>
        </div>

        <h2 className="mt-3 text-lg text-ink-primary break-words">{entry.title}</h2>
        {entry.description && (
          <p className="mt-2 text-sm text-ink-muted whitespace-pre-wrap break-words">{entry.description}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {entry.tags.map((ref) => (
            <span
              key={ref.tagId}
              className="chip"
              style={{ color: ref.color, border: `1px solid ${ref.color}55`, background: `${ref.color}14` }}
              title={ref.categoryName}
            >
              {ref.tagName}
            </span>
          ))}
        </div>

        <div className="mt-4 text-[10px] uppercase tracking-wider text-ink-faint grid grid-cols-2 gap-2">
          <span>Created: {formatDateTime(entry.createdAt)}</span>
          <span>Resolved: {formatDateTime(entry.movedToResolvedAt)}</span>
          <span>Archived: {formatDateTime(entry.archivedAt)}</span>
        </div>

        <div className="mt-5 flex flex-wrap justify-between gap-2">
          {onOpenArchive ? (
            <button type="button" className="btn btn-ghost" onClick={onOpenArchive}>
              Open project archive
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="btn btn-cyan" onClick={onClose}>
            Close
          </button>
        </div>

        <CommentsPanel target={{ type: 'history', id: entry.id }} onChanged={onCommentsChanged} />
      </div>
    </div>
  );
}
