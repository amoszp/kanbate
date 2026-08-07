import { useCallback, useEffect, useState } from 'react';
import { ToastProvider } from './toast';
import { api } from './api';
import type { TagCategory, ProjectWithTasks } from './types';
import { useHashRoute } from './hooks/useHashRoute';
import { useAutomation } from './hooks/useAutomation';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Board } from './components/Board';
import { SettingsView } from './components/SettingsView';
import { HistoryView } from './components/HistoryView';

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}

function AppShell() {
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
          <div className="panel border-neon-magenta/60 border p-4 text-sm text-neon-magenta mb-4">
            <p className="font-bold uppercase tracking-widest">Connection error</p>
            <p className="mt-1 text-ink-muted">
              {loadError} — is the Kanbate API reachable?{' '}
              <button className="text-neon-cyan underline" onClick={() => void refresh()}>
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

        {route.path === 'settings' && (
          <SettingsView categories={categories} refresh={refresh} />
        )}
      </main>
      <footer className="text-center text-[10px] uppercase tracking-[0.3em] text-ink-faint py-5">
        kanbate · local kanban for your lab
      </footer>
    </div>
  );
}
