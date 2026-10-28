import { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../toast';
import type { HistoryEntry, ProjectWithTasks } from '../types';
import { formatDateTime } from '../utils';
import { ConfirmDialog } from './ConfirmDialog';
import { ArchivedEntryModal } from './ArchivedEntryModal';
import { TagChip } from './ui';
import type { Route } from '../hooks/useHashRoute';

export function HistoryView({
  projectId,
  projects,
  navigate,
  refresh,
}: {
  projectId: number;
  projects: ProjectWithTasks[];
  navigate: (route: Route | string) => void;
  refresh: () => Promise<void>;
}) {
  const { push } = useToast();
  const project = projects.find((p) => p.id === projectId);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<HistoryEntry | null>(null);
  const [viewing, setViewing] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getHistory(projectId)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (!project) {
    return (
      <div className="panel p-10 text-center space-y-3">
        <p className="empty-state text-neon-magenta">project not found</p>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          ← Back to dashboard
        </button>
      </div>
    );
  }

  const removeEntry = async () => {
    if (!deleting) return;
    await api.deleteHistoryEntry(deleting.id);
    push({ kind: 'info', title: 'Archive entry removed', message: deleting.title });
    setDeleting(null);
    await api.getHistory(projectId).then(setEntries);
    await refresh();
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/board/${projectId}`)} className="link crumb">
              ← {project.name}
            </button>
            <span className="crumb text-ink-faint">/</span>
            <span className="crumb text-neon-magenta">history archive</span>
          </div>
          <h1 className="page-title">HISTORY ARCHIVE</h1>
          <p className="page-subtitle">
            resolved tasks auto-archived after 48h · {entries.length} archived
          </p>
        </div>
      </div>

      {loading ? (
        <div className="panel p-10 text-center empty-state">reading archive…</div>
      ) : entries.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="empty-state">
            archive empty — resolved tasks land here automatically after 48h
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <article key={entry.id} className="panel panel-link p-4">
              <div className="flex items-start justify-between gap-3">
                <button className="tap min-w-0 text-left flex-1 rounded-control" onClick={() => setViewing(entry)}>
                  <h3 className="text-sm text-ink-primary break-words">
                    {entry.title}
                    {entry.commentCount > 0 && (
                      <span className="meta ml-2 text-neon-cyan/80">💬 {entry.commentCount}</span>
                    )}
                  </h3>
                  {entry.description && (
                    <p className="mt-1 text-xs text-ink-muted line-clamp-2 break-words">{entry.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {entry.tags.map((ref) => (
                      <TagChip key={ref.tagId} tag={ref} />
                    ))}
                    <span className="chip chip-neutral">was {entry.status}</span>
                  </div>
                  <p className="meta mt-2">
                    resolved {formatDateTime(entry.movedToResolvedAt)} · archived {formatDateTime(entry.archivedAt)}
                  </p>
                </button>
                <button
                  className="btn btn-danger btn-icon shrink-0"
                  onClick={() => setDeleting(entry)}
                  aria-label={`Remove archive entry ${entry.title}`}
                >
                  ✕
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {viewing && (
        <ArchivedEntryModal
          entry={viewing}
          onClose={() => setViewing(null)}
          onCommentsChanged={() => void api.getHistory(projectId).then(setEntries)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Remove archive entry?`}
          message={`«${deleting.title}» will be permanently removed from the history archive.`}
          onConfirm={() => void removeEntry()}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
