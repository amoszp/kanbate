import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Comment, CommentTarget } from '../types';
import { formatDateTime, relativeTime } from '../utils';

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
    if (!window.confirm('Delete this comment?')) return;
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
        <p className="text-[11px] uppercase tracking-[0.2em] text-neon-cyan font-bold">
          Activity · {userCount} comment{userCount === 1 ? '' : 's'}
        </p>
        <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-faint cursor-pointer select-none">
          <input
            type="checkbox"
            className="accent-[#00f0ff]"
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
          <button type="button" className="btn btn-cyan" onClick={() => void post()} disabled={busy || !draft.trim()}>
            {busy ? 'Posting…' : 'Post comment'}
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-neon-magenta">{error}</p>}

      <ol className="mt-3 space-y-2">
        {loading ? (
          <li className="text-[10px] uppercase tracking-widest text-ink-faint">loading activity…</li>
        ) : visible.length === 0 ? (
          <li className="text-[10px] uppercase tracking-widest text-ink-faint">no comments yet</li>
        ) : (
          visible.map((c) =>
            c.kind === 'system' ? (
              <li key={c.id} className="flex items-baseline gap-2 text-[10px] text-ink-faint pl-3 border-l border-edge">
                <span className="uppercase tracking-wider shrink-0" title={formatDateTime(c.createdAt)}>
                  {relativeTime(c.createdAt)}
                </span>
                <span className="break-words">{c.body}</span>
              </li>
            ) : (
              <li key={c.id} className="rounded border border-edge border-l-2 border-l-neon-cyan/70 bg-backdrop px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-ink-muted" title={relativeTime(c.createdAt)}>
                    {formatDateTime(c.createdAt)}
                  </span>
                  <button
                    type="button"
                    className="text-[10px] text-ink-faint hover:text-neon-magenta transition-colors"
                    onClick={() => void remove(c)}
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
    </section>
  );
}
