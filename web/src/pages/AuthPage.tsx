import { useState } from 'react';
import { APP_CONFIG } from '../config';
import { saveAuth } from '../auth';
import { navigate } from '../router';
import { login, signup } from '../services/api';

type AuthMode = 'login' | 'signup';

interface AuthPageProps {
  mode: AuthMode;
}

export function AuthPage({ mode }: AuthPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const isSignup = mode === 'signup';

  const syncTokenToExtension = async (nextToken: string) => {
    if (!(window as Window & { chrome?: typeof chrome }).chrome?.runtime || !APP_CONFIG.extensionId) {
      setStatus('Authenticated on web. Set VITE_EXTENSION_ID to sync token to extension.');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage(APP_CONFIG.extensionId, {
        type: 'SYNC_AUTH',
        token: nextToken,
      });
      setStatus(response?.ok ? 'Authenticated and synced to extension.' : `Sync failed: ${response?.error ?? 'Unknown error'}`);
    } catch (syncError) {
      setStatus(`Sync failed: ${String(syncError)}`);
    }
  };

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(isSignup ? 'Creating account...' : 'Signing in...');

    try {
      const result = isSignup ? await signup(username, password) : await login(username, password);
      saveAuth({ username: result.user.username, token: result.token });
      await syncTokenToExtension(result.token);
      navigate('/');
    } catch (authError) {
      setStatus(authError instanceof Error ? authError.message : 'Authentication failed');
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">Capture Dashboard</p>
        <h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted">
          {isSignup ? 'Sign up to sync extension captures to this dashboard.' : 'Log in to review photos, HTML, and source code captured by the extension.'}
        </p>

        <form className="auth-form stacked" onSubmit={(event) => void handleAuth(event)}>
          <label>
            Username
            <input placeholder="alex" value={username} onChange={(event) => setUsername(event.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" placeholder="Minimum 6 characters" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
          </label>
          <button type="submit">{isSignup ? 'Create account' : 'Login'}</button>
        </form>

        {status && <p className="status">{status}</p>}
        <p className="auth-link">
          {isSignup ? 'Already have an account?' : 'Need an account?'}{' '}
          <a
            href={isSignup ? '/login' : '/signup'}
            onClick={(event) => {
              event.preventDefault();
              navigate(isSignup ? '/login' : '/signup');
            }}
          >
            {isSignup ? 'Login' : 'Sign up'}
          </a>
        </p>
      </section>
    </main>
  );
}
