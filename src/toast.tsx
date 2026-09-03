import React, { createContext, useCallback, useContext, useState } from 'react';

export type ToastKind = 'info' | 'success' | 'reminder' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
  tone?: 'cyan' | 'magenta' | 'ghost';
}

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
  actions?: ToastAction[];
}

interface ToastContextValue {
  push: (toast: Omit<Toast, 'id'>) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      // Auto-dismiss everything except persistent reminders.
      if (toast.kind !== 'reminder') {
        window.setTimeout(() => dismiss(id), toast.kind === 'error' ? 6000 : 4500);
      }
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed right-3 top-3 sm:top-4 sm:right-4 z-50 flex flex-col gap-3 w-[calc(100vw-1.5rem)] sm:w-[380px] safe-top pointer-events-none">
      {toasts.map((t) => (
        <ToastView key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastView({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  if (toast.kind === 'reminder') {
    return <ReminderToast toast={toast} onDismiss={onDismiss} />;
  }
  return <DefaultToast toast={toast} onDismiss={onDismiss} />;
}

function DefaultToast({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const accent =
    toast.kind === 'success'
      ? 'border-neon-green/70 text-neon-green'
      : toast.kind === 'error'
        ? 'border-neon-magenta/70 text-neon-magenta'
        : 'border-neon-cyan/70 text-neon-cyan';

  return (
    <div
      className={`pointer-events-auto animate-slide-in panel border-l-2 ${accent} bg-panel/95 backdrop-blur px-4 py-3`}
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[11px] uppercase tracking-[0.18em] font-bold ${accent}`}>
            {toast.kind === 'success' ? 'SYSTEM OK' : toast.kind === 'error' ? 'ERROR' : 'NOTICE'}
          </p>
          <p className="mt-1 text-sm text-ink-primary break-words">{toast.title}</p>
          {toast.message && <p className="mt-0.5 text-xs text-ink-muted break-words">{toast.message}</p>}
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 text-ink-faint hover:text-ink-primary transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      {toast.actions && toast.actions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {toast.actions.map((a) => (
            <button key={a.label} onClick={a.onClick} className={`btn ${toneClass(a.tone)}`}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReminderToast({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      className="pointer-events-auto animate-slide-in relative overflow-hidden panel border-2 border-neon-magenta/80 shadow-neon-magenta bg-panel/95 backdrop-blur px-4 py-4"
      role="alert"
    >
      {/* animated hazard stripe */}
      <div className="absolute inset-x-0 top-0 h-1 bg-[repeating-linear-gradient(-45deg,#ff2a6d_0_8px,#0d0f18_8px_16px)]" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-lg text-neon-magenta animate-pulse-glow rounded-full border border-neon-magenta/60 w-8 h-8 flex items-center justify-center shrink-0">
            !
          </span>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-neon-magenta">
              ⚠ Work Reminder
            </p>
            <p className="mt-1 text-sm text-ink-primary break-words">{toast.title}</p>
            {toast.message && <p className="mt-0.5 text-xs text-ink-muted break-words">{toast.message}</p>}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 text-ink-faint hover:text-neon-magenta transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      {toast.actions && toast.actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {toast.actions.map((a) => (
            <button key={a.label} onClick={a.onClick} className={`btn ${toneClass(a.tone)}`}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function toneClass(tone?: string) {
  if (tone === 'magenta') return 'btn-magenta';
  if (tone === 'cyan') return 'btn-cyan';
  return 'btn-ghost';
}
