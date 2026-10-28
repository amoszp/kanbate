import { useEffect, useState } from 'react';
import type { Route } from '../hooks/useHashRoute';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function Header({
  route,
  navigate,
  loading,
}: {
  route: Route;
  navigate: (route: Route | string) => void;
  loading: boolean;
}) {
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const onInstall = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    setInstallEvt(null);
  };

  return (
    <header className="sticky top-0 z-40 safe-top border-b border-edge bg-backdrop/90 backdrop-blur-md">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 min-w-0 min-h-11 rounded-control"
          aria-label="Kanbate dashboard"
        >
          <img
            src="/icons/source.svg"
            alt="Kanbate"
            className="w-8 h-8 shrink-0 rounded-control bg-transparent opacity-95 brightness-90 contrast-90 saturate-90 drop-shadow-[0_0_4px_rgba(0,240,255,0.35)]"
          />
          <div className="text-left min-w-0">
            <span className="glitch-title block text-lg leading-none tracking-widest text-ink-primary">
              KANBATE
            </span>
            <span className="block truncate text-micro uppercase tracking-display text-neon-cyan/80">
              {route.path === '/' ? '// dashboard' : route.path === 'settings' ? '// settings' : route.path === 'find' ? '// find' : route.path === 'history' ? '// history archive' : '// board'}
            </span>
          </div>
        </button>

        {/* Icon-only below `sm` so the whole nav fits a phone screen. */}
        <nav className="flex shrink-0 items-center gap-2">
          {installEvt && (
            <button onClick={onInstall} className="btn btn-primary max-sm:btn-icon" aria-label="Install app">
              <span aria-hidden>⬇</span>
              <span className="hidden sm:inline">Install</span>
            </button>
          )}
          <NavButton active={route.path === '/'} onClick={() => navigate('/')} icon="▦" label="Dashboard" />
          <NavButton active={route.path === 'find'} onClick={() => navigate('/find')} icon="⌕" label="Find" />
          <NavButton active={route.path === 'settings'} onClick={() => navigate('/settings')} icon={'⚙︎'} label="Settings" />
          <span className="hidden sm:inline-flex meta">
            {loading ? 'syncing…' : 'online'}
          </span>
        </nav>
      </div>
    </header>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`btn ${active ? 'btn-secondary' : 'btn-ghost'} max-sm:btn-icon`}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      <span aria-hidden className="text-sm leading-none">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
