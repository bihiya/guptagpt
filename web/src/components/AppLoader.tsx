import { Backdrop, Box, CircularProgress, Typography } from '@mui/material';

interface AppLoaderProps {
  message?: string;
  overlay?: boolean;
}

export function AppLoader({ message = 'Loading...', overlay = false }: AppLoaderProps) {
  const content = (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, py: 4 }}>
      <CircularProgress size={26} thickness={5} />
      <Typography variant="body2" color="text.secondary">{message}</Typography>
    </Box>
  );

  if (overlay) {
    return <Backdrop open sx={{ color: '#fff', zIndex: 1400 }}>{content}</Backdrop>;
  }

  return content;
}
