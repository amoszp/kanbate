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
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 group"
          aria-label="Kanbate dashboard"
        >
          <img
            src="/icons/source.svg"
            alt="Kanbate"
            className="w-8 h-8 rounded-md bg-transparent opacity-95 brightness-90 contrast-90 saturate-90 drop-shadow-[0_0_4px_rgba(0,240,255,0.35)]"
          />
          <div className="text-left">
            <span className="glitch-title text-lg leading-none tracking-widest text-ink-primary">
              KANBATE
            </span>
            <span className="block text-[9px] uppercase tracking-[0.35em] text-neon-cyan/80">
              {route.path === '/' ? '// dashboard' : route.path === 'settings' ? '// settings' : route.path === 'history' ? '// history archive' : '// board'}
            </span>
          </div>
        </button>

        <nav className="flex items-center gap-2">
          {installEvt && (
            <button onClick={onInstall} className="btn btn-solid">
              <span aria-hidden>⬇</span> Install
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            className={`btn ${route.path === '/' ? 'btn-cyan' : 'btn-ghost'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate('/settings')}
            className={`btn ${route.path === 'settings' ? 'btn-cyan' : 'btn-ghost'}`}
          >
            Settings
          </button>
          <span className="hidden sm:inline-flex text-[10px] text-ink-faint uppercase tracking-widest">
            {loading ? 'syncing…' : 'online'}
          </span>
        </nav>
      </div>
    </header>
  );
}
