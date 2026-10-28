import { useEffect, useRef, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { TagRef } from '../types';

/** Neon chip colours derived from one accent colour (tags, status chips). */
export function chipStyle(color: string): CSSProperties {
  return { color, borderColor: `${color}55`, background: `${color}14` };
}

/** A task's tag: coloured chip with a dot, same everywhere. */
export function TagChip({ tag }: { tag: TagRef }) {
  return (
    <span className="chip" style={chipStyle(tag.color)} title={tag.categoryName}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color }} />
      {tag.tagName}
    </span>
  );
}

const MODAL_SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
} as const;

/*
 * Escape closes the topmost open modal only. Every Modal registers its close
 * handler here on mount; one window listener calls the last one registered,
 * so Escape in a dialog opened over another modal never reaches the one below.
 */
const escapeStack: { current: () => void }[] = [];

function onEscape(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.defaultPrevented) return;
  const top = escapeStack[escapeStack.length - 1];
  if (!top) return;
  e.preventDefault();
  top.current();
}

/**
 * The one modal shell: dimmed overlay (click to close, Escape to close), a
 * neon-bordered panel centred when short and scrollable when tall. Rendered
 * into <body> so a dialog opened from inside another modal stacks on top of it.
 */
export function Modal({
  onClose,
  tone = 'cyan',
  size = 'md',
  layer = 'base',
  onSubmit,
  children,
}: {
  onClose: () => void;
  tone?: 'cyan' | 'magenta';
  size?: keyof typeof MODAL_SIZES;
  /** 'top' stacks above another open modal. */
  layer?: 'base' | 'top';
  /** Renders the panel as a <form> with this submit handler. */
  onSubmit?: (e: FormEvent) => void;
  children: ReactNode;
}) {
  const className = `modal ${tone === 'magenta' ? 'modal-danger' : ''} ${MODAL_SIZES[size]}`;
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const entry = closeRef;
    escapeStack.push(entry);
    if (escapeStack.length === 1) window.addEventListener('keydown', onEscape);
    return () => {
      const i = escapeStack.indexOf(entry);
      if (i !== -1) escapeStack.splice(i, 1);
      if (escapeStack.length === 0) window.removeEventListener('keydown', onEscape);
    };
  }, []);

  return createPortal(
    <div className={`modal-overlay ${layer === 'top' ? 'z-[60]' : ''}`} onClick={onClose}>
      <div className="min-h-full flex items-center justify-center px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:py-10">
        {onSubmit ? (
          <form onSubmit={onSubmit} className={className} onClick={stop} role="dialog" aria-modal="true">
            {children}
          </form>
        ) : (
          <div className={className} onClick={stop} role="dialog" aria-modal="true">
            {children}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
