import { useEffect } from 'react';
import { Box, Paper, TextField, Typography } from '@mui/material';
import { getSavedAuth } from '../auth';
import { CaptureList } from '../components/CaptureList';
import { AppLoader } from '../components/AppLoader';
import { selectFilteredCaptures, useStore } from '../store';

export function App() {
  const { state, dispatch, loadCaptures } = useStore();
  const { loading, error, query } = state;
  const filteredItems = selectFilteredCaptures(state);
  const savedAuth = getSavedAuth();

  useEffect(() => {
    if (savedAuth?.token) void loadCaptures(savedAuth.token);
  }, []);

  return (
    <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, mt: 8, maxWidth: 1180, mx: 'auto', width: '100%' }}>
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 2, mb: 2 }}>
        <TextField fullWidth label="Search title or URL" value={query} onChange={(e) => dispatch({ type: 'query/set', payload: e.target.value })} />
      </Paper>
      {loading && <AppLoader message="Loading captures..." />}
      {error && <Typography color="error">{error}</Typography>}
      {!loading && !error && <CaptureList items={filteredItems} />}
    </Box>
  );
}
