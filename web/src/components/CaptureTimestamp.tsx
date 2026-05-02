import { Chip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

export function CaptureTimestamp({ createdAt }: { createdAt: string }) {
  const date = new Date(createdAt);
  return (
    <Chip
      size="small"
      icon={<AccessTimeIcon />}
      label={`${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
      variant="outlined"
    />
  );
}
