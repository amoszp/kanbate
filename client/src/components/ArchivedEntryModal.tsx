import type { HistoryEntry } from '../types';
import { formatDateTime } from '../utils';
import { CommentsPanel } from './CommentsPanel';
import { Modal, TagChip } from './ui';

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
  return (
    <Modal onClose={onClose} tone="magenta" size="xl">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow text-neon-magenta">
            🗄 Archived task
            {entry.projectName && <span className="text-ink-muted font-normal"> · {entry.projectName}</span>}
          </p>
          <span className="chip chip-neutral">archive #{entry.id}</span>
        </div>

        <h2 className="mt-3 text-lg text-ink-primary break-words">{entry.title}</h2>
        {entry.description && (
          <p className="mt-2 text-sm text-ink-muted whitespace-pre-wrap break-words">{entry.description}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {entry.tags.map((ref) => (
            <TagChip key={ref.tagId} tag={ref} />
          ))}
        </div>

        <div className="meta mt-4 grid grid-cols-2 gap-2">
          <span>Created: {formatDateTime(entry.createdAt)}</span>
          <span>Resolved: {formatDateTime(entry.movedToResolvedAt)}</span>
          <span>Archived: {formatDateTime(entry.archivedAt)}</span>
        </div>

        <div className="mt-5 flex flex-wrap justify-between gap-2">
          {onOpenArchive ? (
            <button type="button" className="btn btn-secondary" onClick={onOpenArchive}>
              Open project archive
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <CommentsPanel target={{ type: 'history', id: entry.id }} onChanged={onCommentsChanged} />
    </Modal>
  );
}
