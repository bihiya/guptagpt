import { useEffect, useState } from 'react';
import { CaptureList } from '../components/CaptureList';
import { APP_CONFIG } from '../config';
import { login, signup } from '../services/api';
import { selectFilteredCaptures, useStore } from '../store';

const AUTH_KEY = 'captureWebAuth';

type AuthMode = 'login' | 'signup';

export function App() {
  const { state, dispatch, loadCaptures } = useStore();
  const { items, loading, error, query } = state;
  const filteredItems = selectFilteredCaptures(state);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authStatus, setAuthStatus] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  useEffect(() => {
    const saved = localStorage.getItem(AUTH_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { username?: string; token?: string };
      setUsername(parsed.username ?? '');
      setToken(parsed.token ?? '');
      setIsLoggedIn(Boolean(parsed.token));
      if (parsed.token) {
        void loadCaptures(parsed.token);
      }
    } catch {
      localStorage.removeItem(AUTH_KEY);
    }
  }, []);

  const autoCount = items.filter((item) => item.reason === 'auto').length;
  const manualCount = items.length - autoCount;

  const syncTokenToExtension = async (nextToken: string) => {
    if (!(window as Window & { chrome?: typeof chrome }).chrome?.runtime || !APP_CONFIG.extensionId) {
      setAuthStatus('Authenticated on web. Set VITE_EXTENSION_ID to sync token to extension.');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage(APP_CONFIG.extensionId, {
        type: 'SYNC_AUTH',
        token: nextToken,
      });
      setAuthStatus(response?.ok ? 'Authenticated and synced to extension.' : `Sync failed: ${response?.error ?? 'Unknown error'}`);
    } catch (syncError) {
      setAuthStatus(`Sync failed: ${String(syncError)}`);
    }
  };

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthStatus('Authenticating...');

    try {
      const result = authMode === 'signup' ? await signup(username, password) : await login(username, password);
      setToken(result.token);
      setIsLoggedIn(true);
      localStorage.setItem(AUTH_KEY, JSON.stringify({ username: result.user.username, token: result.token }));
      await syncTokenToExtension(result.token);
      await loadCaptures(result.token);
    } catch (authError) {
      setAuthStatus(authError instanceof Error ? authError.message : 'Authentication failed');
    }
  };

  return (
    <main className="container">
      <header className="topbar">
        <h1>Capture Dashboard</h1>
        <button onClick={() => void loadCaptures(token)} disabled={!isLoggedIn}>Refresh</button>
      </header>

      <section className="card auth-card">
        <h2>{authMode === 'signup' ? 'Sign up' : 'Login'}</h2>
        <div className="mode-switch">
          <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')} type="button">Login</button>
          <button className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')} type="button">Sign up</button>
        </div>

        <form className="auth-form" onSubmit={(event) => void handleAuth(event)}>
          <input placeholder="Username" value={username} onChange={(event) => setUsername(event.target.value)} required />
          <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
          <button type="submit">{authMode === 'signup' ? 'Create Account' : isLoggedIn ? 'Re-Login' : 'Login'}</button>
        </form>
        {authStatus && <p>{authStatus}</p>}
      </section>

      <section className="stats">
        <article><h3>Total</h3><p>{items.length}</p></article>
        <article><h3>Auto</h3><p>{autoCount}</p></article>
        <article><h3>Manual</h3><p>{manualCount}</p></article>
      </section>

      <input
        className="search"
        placeholder="Search title or URL"
        value={query}
        onChange={(event) => dispatch({ type: 'query/set', payload: event.target.value })}
      />

      {loading && <p>Loading captures...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && <CaptureList items={filteredItems} />}
    </main>
  );
}
