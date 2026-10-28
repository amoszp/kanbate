import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Comment, CommentTarget } from '../types';
import { formatDateTime, relativeTime } from '../utils';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * ServiceNow-style activity stream: user comments (work notes) interleaved
 * with auto-logged activity (status changes, moves, copies), newest first.
 */
export function CommentsPanel({
  target,
  onChanged,
}: {
  target: CommentTarget;
  onChanged?: () => void;
}) {
  const { type, id } = target;
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showActivity, setShowActivity] = useState(true);
  const [deleting, setDeleting] = useState<Comment | null>(null);

  const load = useCallback(async () => {
    try {
      setComments(await api.getComments({ type, id }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments.');
    } finally {
      setLoading(false);
    }
  }, [type, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const post = async () => {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.addComment({ type, id }, body);
      setDraft('');
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: Comment) => {
    setDeleting(null);
    try {
      await api.deleteComment(c.id);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment.');
    }
  };

  const userCount = comments.filter((c) => c.kind === 'comment').length;
  const visible = comments.filter((c) => showActivity || c.kind === 'comment').reverse();

  return (
    <section className="mt-5 border-t border-edge pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow text-neon-cyan">
          Activity · {userCount} comment{userCount === 1 ? '' : 's'}
        </p>
        <label className="tap meta flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            className="accent-neon-cyan"
            checked={showActivity}
            onChange={(e) => setShowActivity(e.target.checked)}
          />
          activity log
        </label>
      </div>

      <div className="mt-3">
        <textarea
          className="field resize-none"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void post();
            }
          }}
          placeholder="Add a comment / work note… (Ctrl+Enter to post)"
          aria-label="New comment"
        />
        <div className="mt-2 flex justify-end">
          <button type="button" className="btn btn-secondary" onClick={() => void post()} disabled={busy || !draft.trim()}>
            {busy ? 'Posting…' : 'Post comment'}
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-neon-magenta">{error}</p>}

      <ol className="mt-3 space-y-2">
        {loading ? (
          <li className="meta">loading activity…</li>
        ) : visible.length === 0 ? (
          <li className="meta">no comments yet</li>
        ) : (
          visible.map((c) =>
            c.kind === 'system' ? (
              <li key={c.id} className="flex items-baseline gap-2 text-micro text-ink-faint pl-3 border-l border-edge">
                <span className="uppercase tracking-meta shrink-0" title={formatDateTime(c.createdAt)}>
                  {relativeTime(c.createdAt)}
                </span>
                <span className="break-words">{c.body}</span>
              </li>
            ) : (
              <li key={c.id} className="inset border-l-2 border-l-neon-cyan/70 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="meta text-ink-muted" title={relativeTime(c.createdAt)}>
                    {formatDateTime(c.createdAt)}
                  </span>
                  <button
                    type="button"
                    className="btn btn-plain danger btn-icon btn-sm -my-1 -mr-2"
                    onClick={() => setDeleting(c)}
                    aria-label="Delete comment"
                  >
                    ✕
                  </button>
                </div>
                <p className="mt-1 text-sm text-ink-primary whitespace-pre-wrap break-words">{c.body}</p>
              </li>
            )
          )
        )}
      </ol>

      {deleting && (
        <ConfirmDialog
          title="Delete this comment?"
          message={deleting.body.length > 140 ? `${deleting.body.slice(0, 140)}…` : deleting.body}
          onConfirm={() => void remove(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </section>
  );
}
