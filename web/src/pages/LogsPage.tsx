import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { getSavedAuth } from '../auth';
import { useEffect, useState } from 'react';
import { fetchCaptureLogs } from '../services/api';

interface CaptureLogItem {
  _id: string;
  captureId?: string;
  url?: string;
  title?: string;
  reason: 'command' | 'popup' | 'auto';
  status: string;
  detail?: string;
  hasHtml?: boolean;
  hasSourceCode?: boolean;
  hasScreenshot?: boolean;
  hasPdf?: boolean;
  createdAt: string;
}

export function LogsPage() {
  const [items, setItems] = useState<CaptureLogItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const auth = getSavedAuth();
    if (!auth?.token) return;
    fetchCaptureLogs(auth.token).then(setItems).catch((e) => setError(String(e)));
  }, []);

  return <Box sx={{ p: 3 }}>
    <Typography variant='h4' mb={2}>Capture Lifecycle Logs</Typography>
    {error && <Typography color='error'>{error}</Typography>}
    <Stack spacing={1.5}>
      {items.map((log) => <Paper key={log._id} sx={{ p: 1.5 }}>
        <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
          <Chip label={log.status} color='primary' size='small' />
          <Chip label={log.reason} size='small' />
          <Chip label={log.hasPdf ? 'pdf' : 'no-pdf'} size='small' />
          <Chip label={log.hasScreenshot ? 'image' : 'no-image'} size='small' />
          <Typography variant='caption'>{new Date(log.createdAt).toLocaleString()}</Typography>
        </Stack>
        <Typography variant='body2'>{log.title || log.url}</Typography>
        <Typography variant='caption'>{log.detail}</Typography>
      </Paper>)}
    </Stack>
  </Box>;
}
