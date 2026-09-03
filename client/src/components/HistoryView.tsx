import { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../toast';
import type { HistoryEntry, ProjectWithTasks } from '../types';
import { formatDateTime } from '../utils';
import { ConfirmDialog } from './ConfirmDialog';
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
        <p className="text-neon-magenta text-sm uppercase tracking-[0.3em]">project not found</p>
        <button className="btn btn-cyan" onClick={() => navigate('/')}>
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
            <button onClick={() => navigate(`/board/${projectId}`)} className="text-[11px] text-neon-cyan hover:text-neon-cyan/70 uppercase tracking-widest">
              ← {project.name}
            </button>
            <span className="text-[11px] text-ink-faint">/</span>
            <span className="text-[11px] uppercase tracking-widest text-neon-magenta">history archive</span>
          </div>
          <h1 className="glitch-title text-2xl sm:text-3xl">HISTORY ARCHIVE</h1>
          <p className="text-xs text-ink-muted mt-1 uppercase tracking-[0.2em]">
            resolved tasks auto-archived after 48h · {entries.length} archived
          </p>
        </div>
      </div>

      {loading ? (
        <div className="panel p-10 text-center text-sm text-ink-muted">reading archive…</div>
      ) : entries.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-ink-faint">
            archive empty — resolved tasks land here automatically after 48h
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <article key={entry.id} className="panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm text-ink-primary break-words">{entry.title}</h3>
                  {entry.description && (
                    <p className="mt-1 text-xs text-ink-muted line-clamp-2 break-words">{entry.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
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
                    <span className="chip border border-edge text-ink-muted">was {entry.status}</span>
                  </div>
                  <p className="mt-2 text-[10px] uppercase tracking-wider text-ink-faint">
                    resolved {formatDateTime(entry.movedToResolvedAt)} · archived {formatDateTime(entry.archivedAt)}
                  </p>
                </div>
                <button
                  className="btn btn-magenta shrink-0 !px-2 !py-1"
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
