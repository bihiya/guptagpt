import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getSavedAuth } from '../auth';
import { useEffect, useMemo, useState } from 'react';
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

interface CaptureLogGroup {
  captureId: string;
  url?: string;
  title?: string;
  latestAt: string;
  steps: CaptureLogItem[];
}

export function LogsPage() {
  const [items, setItems] = useState<CaptureLogItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const auth = getSavedAuth();
    if (!auth?.token) return;
    fetchCaptureLogs(auth.token).then(setItems).catch((e) => setError(String(e)));
  }, []);

  const groupedLogs = useMemo<CaptureLogGroup[]>(() => {
    const grouped = new Map<string, CaptureLogGroup>();

    for (const log of items) {
      const key = log.captureId || `unassigned-${log._id}`;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          captureId: log.captureId || 'unknown',
          url: log.url,
          title: log.title,
          latestAt: log.createdAt,
          steps: [log],
        });
        continue;
      }

      existing.steps.push(log);
      if (!existing.url && log.url) existing.url = log.url;
      if (!existing.title && log.title) existing.title = log.title;
      if (+new Date(log.createdAt) > +new Date(existing.latestAt)) existing.latestAt = log.createdAt;
    }

    const groups = Array.from(grouped.values()).map((group) => ({
      ...group,
      steps: group.steps.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    }));

    return groups.sort((a, b) => +new Date(b.latestAt) - +new Date(a.latestAt));
  }, [items]);

  return <Box sx={{ p: 3 }}>
    <Typography variant='h4' mb={2}>Capture Lifecycle Logs</Typography>
    {error && <Typography color='error'>{error}</Typography>}

    <Stack spacing={1.5}>
      {groupedLogs.map((group) => <Accordion key={group.captureId} disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack spacing={0.5} sx={{ width: '100%' }}>
            <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
              <Chip label={`capture: ${group.captureId}`} size='small' color='primary' />
              <Typography variant='caption'>{new Date(group.latestAt).toLocaleString()}</Typography>
            </Stack>
            <Typography variant='body2'>{group.title || group.url || 'No title/url available'}</Typography>
            {group.url && (
              <Link
                href={group.url}
                target='_blank'
                rel='noopener noreferrer'
                underline='hover'
                variant='caption'
                onClick={(event) => event.stopPropagation()}
              >
                {group.url}
              </Link>
            )}
          </Stack>
        </AccordionSummary>

        <AccordionDetails>
          <Stack spacing={1.25}>
            {group.steps.map((log, index) => <Box key={log._id} sx={{ p: 1.25, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                <Chip label={`Step ${index + 1}`} size='small' variant='outlined' />
                <Chip label={log.status} color='primary' size='small' />
                <Chip label={log.reason} size='small' />
                <Chip label={log.hasPdf ? 'pdf' : 'no-pdf'} size='small' />
                <Chip label={log.hasScreenshot ? 'image' : 'no-image'} size='small' />
                <Typography variant='caption'>{new Date(log.createdAt).toLocaleString()}</Typography>
              </Stack>
              <Typography variant='caption' color='text.secondary'>{log.detail || 'No detail provided'}</Typography>
            </Box>)}
          </Stack>
        </AccordionDetails>
      </Accordion>)}
    </Stack>
  </Box>;
}
