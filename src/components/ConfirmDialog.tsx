import { useEffect } from 'react';

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  tone = 'magenta',
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: 'magenta' | 'cyan';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="panel w-full max-w-md p-5 animate-slide-in border-2 border-neon-magenta/50"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <p className="text-[11px] uppercase tracking-[0.2em] text-neon-magenta font-bold">⚠ Confirm</p>
        <h2 className="mt-1 text-lg text-ink-primary font-bold">{title}</h2>
        <p className="mt-2 text-sm text-ink-muted">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className={`btn ${tone === 'magenta' ? 'btn-magenta' : 'btn-solid'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
