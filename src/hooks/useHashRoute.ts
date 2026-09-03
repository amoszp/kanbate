import { useCallback, useEffect, useState } from 'react';

export interface Route {
  path: string; // '/' | '/board/:id' | '/history/:id' | '/settings'
  projectId: number | null;
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, id] = raw.split('/').filter(Boolean);
  if (path === 'board' && id) return { path: 'board', projectId: Number(id) };
  if (path === 'history' && id) return { path: 'history', projectId: Number(id) };
  if (path === 'settings') return { path: 'settings', projectId: null };
  return { path: '/', projectId: null };
}

export function useHashRoute(): [Route, (route: Route | string) => void] {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: Route | string) => {
    if (typeof next === 'string') {
      window.location.hash = next;
    } else if (next.path === '/') {
      window.location.hash = '/';
    } else if (next.path === 'settings') {
      window.location.hash = '/settings';
    } else if (next.projectId != null) {
      window.location.hash = `/${next.path}/${next.projectId}`;
    }
  }, []);

  return [route, navigate];
}
