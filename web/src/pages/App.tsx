import { useEffect, useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  CssBaseline,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
  Snackbar
} from '@mui/material';
import { AUTH_KEY, getSavedAuth } from '../auth';
import { APP_CONFIG } from '../config';
import { CaptureList } from '../components/CaptureList';
import { AppLoader } from '../components/AppLoader';
import { navigate } from '../router';
import { selectFilteredCaptures, useStore } from '../store';

export function App() {
  const { state, dispatch, loadCaptures } = useStore();
  const { loading, error, query } = state;
  const filteredItems = selectFilteredCaptures(state);
  const savedAuth = getSavedAuth();
  const isLoggedIn = Boolean(savedAuth?.token);

  const [syncToast, setSyncToast] = useState('');

  const syncToExtension = async (mode: 'login' | 'logout') => {
    const extensionIds = APP_CONFIG.extensionIds;
    if (!extensionIds.length) {
      setSyncToast('No extension ID configured. Set VITE_EXTENSION_ID to enable sync.');
      return;
    }

    if (!(window as Window & { chrome?: typeof chrome }).chrome?.runtime) {
      setSyncToast('Chrome runtime unavailable. Open this dashboard in Chrome to sync.');
      return;
    }

    try {
      for (const extensionId of extensionIds) {
        const payload = mode === 'login'
          ? { type: 'SYNC_AUTH', token: savedAuth?.token ?? '', email: savedAuth?.email ?? '', username: savedAuth?.username ?? '' }
          : { type: 'SYNC_AUTH', token: '', email: '', username: '' };

        try {
          const response = await chrome.runtime.sendMessage(extensionId, payload);
          if (response?.ok) {
            setSyncToast(mode === 'login' ? 'Extension synced with dashboard login.' : 'Extension synced with dashboard logout.');
            return;
          }
        } catch {
          // try next extension id
        }
      }
      setSyncToast('Sync failed for configured extension IDs.');
    } catch (err) {
      setSyncToast(`Sync error: ${String(err)}`);
    }
  };

  useEffect(() => {
    if (savedAuth?.token) void loadCaptures(savedAuth.token);
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f7fb' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: 1300,
          bgcolor: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(148, 163, 184, 0.2)'
        }}
      >
        <Toolbar sx={{ py: 0.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', mr: 1.5 }}>C</Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={700} lineHeight={1.1}>
              Capture Dashboard
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              Organize extension captures with speed
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={isLoggedIn ? 'Authenticated' : 'Guest'} color={isLoggedIn ? 'success' : 'default'} />
            <Button color="inherit" onClick={() => navigate('/settings')}>Settings</Button>
            <Button color="inherit" onClick={() => navigate('/logs')}>Logs</Button>
            {isLoggedIn && <Button color="inherit" onClick={() => void loadCaptures(savedAuth?.token ?? '')}>Refresh</Button>}
            {isLoggedIn && <Button color="inherit" onClick={() => void syncToExtension('login')}>Sync Login → Ext</Button>}
            <Button color="inherit" onClick={() => void syncToExtension('logout')}>Sync Logout → Ext</Button>
            {isLoggedIn ? <Button color="inherit" onClick={() => { localStorage.removeItem(AUTH_KEY); void syncToExtension('logout'); navigate('/login'); }}>Logout</Button> : <Button color="inherit" onClick={() => navigate('/login')}>Login</Button>}
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, mt: 8, maxWidth: 1180, mx: 'auto', width: '100%' }}>
        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 2, mb: 2 }}>
          <TextField
            fullWidth
            label="Search title or URL"
            value={query}
            onChange={(e) => dispatch({ type: 'query/set', payload: e.target.value })}
          />
        </Paper>
        {loading && <AppLoader message="Loading captures..." />}
        {error && <Typography color="error">{error}</Typography>}
        {!loading && !error && <CaptureList items={filteredItems} />}
      </Box>
      <Snackbar open={Boolean(syncToast)} autoHideDuration={2600} onClose={() => setSyncToast('')} message={syncToast} />
    </Box>
  );
}
