import { useState, type FormEvent } from 'react';
import { api } from '../api';

const MESSAGES: Record<string, string> = {
  'wrong username or password': 'Wrong username or password.',
  'too many attempts': 'Too many attempts. Try again in 15 minutes.',
  'this account cannot use Kanbate': 'This account cannot use Kanbate.',
  'accounts service unavailable': 'Sign-in is unavailable right now. Try again shortly.',
};

/** Sign-in screen, shown when Kanbate is opened from outside the home network. */
export function LoginView({ onSignedIn }: { onSignedIn: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.login(username.trim(), password);
      setPassword('');
      onSignedIn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(MESSAGES[msg] ?? 'Could not sign in. Check your connection.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 safe-top pb-safe">
      <form onSubmit={(e) => void submit(e)} className="panel w-full max-w-sm p-6 space-y-5 animate-slide-in">
        <div>
          <h1 className="glitch-title text-2xl">KANBATE</h1>
          <p className="text-xs text-ink-muted mt-1 uppercase tracking-[0.2em]">sign in to continue</p>
        </div>

        <div>
          <label className="label" htmlFor="kb-user">Username</label>
          <input
            id="kb-user"
            className="field"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="label" htmlFor="kb-pass">Password</label>
          <input
            id="kb-pass"
            className="field"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-neon-magenta">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-solid w-full py-2.5" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
