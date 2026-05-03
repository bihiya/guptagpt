import { AppBar, Avatar, Box, Button, Chip, IconButton, Stack, Toolbar, Tooltip, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { AUTH_KEY, getSavedAuth } from '../auth';
import { APP_CONFIG } from '../config';
import { navigate } from '../router';
import { useState } from 'react';

interface TopHeaderProps {
  onRefresh?: () => void;
}

export function TopHeader({ onRefresh }: TopHeaderProps) {
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
  };

  return (
    <>
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
            <Typography variant="h6" fontWeight={700} lineHeight={1.1}>Capture Dashboard</Typography>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>Organize extension captures with speed</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={isLoggedIn ? 'Authenticated' : 'Guest'} color={isLoggedIn ? 'success' : 'default'} />
            <Button color="inherit" onClick={() => navigate('/')}>Home</Button>
            <Button color="inherit" onClick={() => navigate('/settings')}>Settings</Button>
            <Button color="inherit" onClick={() => navigate('/logs')}>Logs</Button>
            {onRefresh && (
              <Tooltip title="Refresh data">
                <IconButton color="inherit" onClick={onRefresh} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}
            {isLoggedIn && <Button color="inherit" onClick={() => void syncToExtension('login')}>Sync Login → Ext</Button>}
            <Button color="inherit" onClick={() => void syncToExtension('logout')}>Sync Logout → Ext</Button>
            {isLoggedIn
              ? <Button color="inherit" onClick={() => { localStorage.removeItem(AUTH_KEY); void syncToExtension('logout'); navigate('/login'); }}>Logout</Button>
              : <Button color="inherit" onClick={() => navigate('/login')}>Login</Button>}
          </Stack>
        </Toolbar>
      </AppBar>
      {Boolean(syncToast) && (
        <Box sx={{ position: 'fixed', right: 16, bottom: 16, bgcolor: 'grey.900', color: 'white', px: 2, py: 1, borderRadius: 1, zIndex: 1400 }}>
          <Typography variant="caption">{syncToast}</Typography>
        </Box>
      )}
    </>
  );
}
