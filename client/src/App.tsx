import { useCallback, useEffect, useState } from 'react';
import { ToastProvider } from './toast';
import { api, SIGNED_OUT_EVENT, type Session } from './api';
import { LoginView } from './components/LoginView';
import type { TagCategory, ProjectWithTasks } from './types';
import { useHashRoute } from './hooks/useHashRoute';
import { useAutomation } from './hooks/useAutomation';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Board } from './components/Board';
import { SettingsView } from './components/SettingsView';
import { HistoryView } from './components/HistoryView';
import { FindView } from './components/FindView';

export default function App() {
  return (
    <ToastProvider>
      <SessionGate />
    </ToastProvider>
  );
}

/**
 * From the internet Kanbate needs a signed-in admin; on the home network the
 * server lets requests through and `me` answers with no user.
 */
function SessionGate() {
  // undefined = still checking, null = needs to sign in
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [offline, setOffline] = useState(false);

  const check = useCallback(async () => {
    try {
      setSession(await api.me());
      setOffline(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'login required' || msg === 'this account cannot use Kanbate') setSession(null);
      else setOffline(true);
    }
  }, []);

  useEffect(() => {
    void check();
    const onSignedOut = () => setSession(null);
    window.addEventListener(SIGNED_OUT_EVENT, onSignedOut);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, onSignedOut);
  }, [check]);

  if (session === null) return <LoginView onSignedIn={() => void check()} />;
  if (session === undefined) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-xs uppercase tracking-label text-ink-muted">
        {offline ? (
          <span>
            Kanbate is unreachable.{' '}
            <button className="link" onClick={() => void check()}>
              Retry
            </button>
          </span>
        ) : (
          'Loading…'
        )}
      </div>
    );
  }
  return (
    <AppShell
      session={session}
      onSignOut={async () => {
        await api.logout();
        setSession(null);
      }}
    />
  );
}

function AppShell({ session, onSignOut }: { session: Session; onSignOut: () => Promise<void> }) {
  const [route, navigate] = useHashRoute();
  const [projects, setProjects] = useState<ProjectWithTasks[]>([]);
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [dash, allCategories] = await Promise.all([api.getDashboard(), api.getCategories()]);
      setProjects(dash);
      setCategories(allCategories);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // In-App Automation Engine: runs on load + focus (see hook).
  useAutomation(navigate, refresh);

  return (
    <div className="min-h-[100dvh] flex flex-col pb-safe">
      <Header route={route} navigate={navigate} loading={loading} />
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 pt-4">
        {loadError && (
          <div className="panel border-neon-magenta/60 p-4 text-sm text-neon-magenta mb-4" role="alert">
            <p className="eyebrow">Connection error</p>
            <p className="mt-1 text-ink-muted">
              {loadError} — is the Kanbate API reachable?{' '}
              <button className="link" onClick={() => void refresh()}>
                Retry
              </button>
            </p>
          </div>
        )}

        {route.path === '/' && (
          <Dashboard
            projects={projects}
            loading={loading}
            navigate={navigate}
            refresh={refresh}
          />
        )}

        {route.path === 'board' && route.projectId != null && (
          <Board
            key={route.projectId}
            projectId={route.projectId}
            projects={projects}
            categories={categories}
            navigate={navigate}
            refresh={refresh}
          />
        )}

        {route.path === 'history' && route.projectId != null && (
          <HistoryView
            key={route.projectId}
            projectId={route.projectId}
            projects={projects}
            navigate={navigate}
            refresh={refresh}
          />
        )}

        {route.path === 'find' && (
          <FindView projects={projects} categories={categories} navigate={navigate} refresh={refresh} />
        )}

        {route.path === 'settings' && (
          <SettingsView categories={categories} refresh={refresh} session={session} onSignOut={onSignOut} />
        )}
      </main>
      <footer className="text-center text-micro uppercase tracking-display text-ink-faint py-5">
        kanbate · local kanban for your lab
      </footer>
    </div>
  );
}
