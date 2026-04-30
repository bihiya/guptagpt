import { useState } from 'react';
import { Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { navigate } from '../router';

const SHORTCUT_KEY = 'capture-shortcut';

function isShortcutValid(value: string) {
  return /^((Ctrl|Alt|Shift|Meta)\+){1,3}[A-Z0-9]$/i.test(value.trim());
}

export function SettingsPage() {
  const [shortcut, setShortcut] = useState(localStorage.getItem(SHORTCUT_KEY) ?? 'Ctrl+Shift+Y');
  const [status, setStatus] = useState('');

  const saveShortcut = async () => {
    if (!isShortcutValid(shortcut)) return setStatus('Invalid format. Use Ctrl+Shift+Y');
    localStorage.setItem(SHORTCUT_KEY, shortcut);
    setStatus(`Saved: ${shortcut}`);
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Typography variant="h4">Dashboard Settings</Typography>
        <Button onClick={() => navigate('/')}>Back</Button>
      </Stack>
      <Card>
        <CardContent>
          <Typography variant="h6" mb={1}>Capture Shortcut</Typography>
          <Stack direction="row" spacing={1}>
            <TextField value={shortcut} onChange={(e) => setShortcut(e.target.value)} fullWidth />
            <Button variant="contained" onClick={() => void saveShortcut()}>Save</Button>
          </Stack>
          {status && <Typography sx={{ mt: 1 }}>{status}</Typography>}
        </CardContent>
      </Card>
    </Box>
  );
}
