import { useEffect, useRef, useState } from 'react';
import { APP_CONFIG } from '../config';
import { saveAuth } from '../auth';
import { navigate } from '../router';
import { login, loginWithGoogle, signup } from '../services/api';

type AuthMode = 'login' | 'signup';

interface AuthPageProps {
  mode: AuthMode;
}

export function AuthPage({ mode }: AuthPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const isSignup = mode === 'signup';
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

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
      const result = isSignup ? await signup(email, password) : await login(email, password);
      saveAuth({ username: result.user.username, email: result.user.email, token: result.token });
      await syncTokenToExtension(result.token);
      navigate('/');
    } catch (authError) {
      setStatus(authError instanceof Error ? authError.message : 'Authentication failed');
    }
  };

  useEffect(() => {
    if (!APP_CONFIG.googleClientId || window.google?.accounts?.id) {
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!APP_CONFIG.googleClientId || !googleButtonRef.current || !window.google?.accounts?.id) {
      return;
    }

    const handleCredentialResponse = async (response: { credential?: string }) => {
      if (!response.credential) {
        setStatus('Google login failed: missing credential');
        return;
      }

      try {
        setStatus('Signing in with Google...');
        const result = await loginWithGoogle(response.credential);
        saveAuth({ username: result.user.username, email: result.user.email, token: result.token });
        await syncTokenToExtension(result.token);
        navigate('/');
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Google authentication failed');
      }
    };

    window.google.accounts.id.initialize({
      client_id: APP_CONFIG.googleClientId,
      callback: handleCredentialResponse
    });
    googleButtonRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      width: 320,
      text: isSignup ? 'signup_with' : 'signin_with'
    });
  }, [isSignup]);

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
            Email
            <input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" placeholder="Minimum 6 characters" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
          </label>
          <button type="submit">{isSignup ? 'Create account' : 'Login'}</button>
        </form>

        {APP_CONFIG.googleClientId && (
          <div className="stacked">
            <p className="muted">or continue with Google</p>
            <div ref={googleButtonRef} />
          </div>
        )}

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
