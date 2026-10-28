import { Modal } from './ui';

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
  return (
    <Modal onClose={onCancel} tone="magenta" layer="top">
        <p className="eyebrow text-neon-magenta">⚠ Confirm</p>
        <h2 className="mt-1 text-lg text-ink-primary font-bold">{title}</h2>
        <p className="mt-2 text-sm text-ink-muted break-words">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={`btn ${tone === 'magenta' ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
    </Modal>
  );
}
