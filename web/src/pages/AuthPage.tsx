import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Link,
  Stack,
  TextField,
  Typography
} from '@mui/material';
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

  const syncTokenToExtension = async (nextToken: string, user?: { email?: string; username?: string }) => {
    if (!(window as Window & { chrome?: typeof chrome }).chrome?.runtime || !APP_CONFIG.extensionId) {
      setStatus('Authenticated on web. Set VITE_EXTENSION_ID to sync token to extension.');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage(APP_CONFIG.extensionId, {
        type: 'SYNC_AUTH',
        token: nextToken,
        email: user?.email ?? '',
        username: user?.username ?? '',
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
      await syncTokenToExtension(result.token, result.user);
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
        await syncTokenToExtension(result.token, result.user);
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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 6,
        background: 'linear-gradient(135deg, #f8fbff 0%, #eef3ff 45%, #f3efff 100%)'
      }}
    >
      <Card elevation={6} sx={{ width: '100%', maxWidth: 460, borderRadius: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: 1.2 }}>
                Capture Dashboard
              </Typography>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                {isSignup ? 'Create your account' : 'Welcome back'}
              </Typography>
              <Typography color="text.secondary">
                {isSignup
                  ? 'Sign up to sync extension captures to this dashboard.'
                  : 'Log in to review photos, HTML, and source code captured by the extension.'}
              </Typography>
            </Box>

            <Box component="form" onSubmit={(event) => void handleAuth(event)}>
              <Stack spacing={2}>
                <TextField
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  inputProps={{ minLength: 6 }}
                  required
                  fullWidth
                />
                <Button type="submit" variant="contained" size="large" sx={{ py: 1.2 }}>
                  {isSignup ? 'Create account' : 'Login'}
                </Button>
              </Stack>
            </Box>

            {APP_CONFIG.googleClientId && (
              <Stack spacing={1.5} alignItems="center">
                <Divider flexItem>or continue with Google</Divider>
                <Box ref={googleButtonRef} sx={{ minHeight: 40 }} />
              </Stack>
            )}

            {status && <Alert severity="info">{status}</Alert>}

            <Typography variant="body2" color="text.secondary" textAlign="center">
              {isSignup ? 'Already have an account?' : 'Need an account?'}{' '}
              <Link
                href={isSignup ? '/login' : '/signup'}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(isSignup ? '/login' : '/signup');
                }}
                underline="hover"
              >
                {isSignup ? 'Login' : 'Sign up'}
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
