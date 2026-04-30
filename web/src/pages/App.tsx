import { useEffect, useState } from 'react';
import { AppBar, Box, Button, CssBaseline, Divider, Drawer, List, ListItem, ListItemText, Stack, TextField, Toolbar, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import IconButton from '@mui/material/IconButton';
import { AUTH_KEY, getSavedAuth } from '../auth';
import { CaptureList } from '../components/CaptureList';
import { navigate } from '../router';
import { selectFilteredCaptures, useStore } from '../store';

const drawerWidth = 260;

export function App() {
  const { state, dispatch, loadCaptures } = useStore();
  const { items, loading, error, query } = state;
  const filteredItems = selectFilteredCaptures(state);
  const savedAuth = getSavedAuth();
  const isLoggedIn = Boolean(savedAuth?.token);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (savedAuth?.token) void loadCaptures(savedAuth.token);
  }, []);

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: 1300 }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => setOpen((v) => !v)}><MenuIcon /></IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Capture Dashboard</Typography>
          <Stack direction="row" spacing={1}>
            <Button color="inherit" onClick={() => navigate('/settings')}>Settings</Button>
            {isLoggedIn && <Button color="inherit" onClick={() => void loadCaptures(savedAuth?.token ?? '')}>Refresh</Button>}
            {isLoggedIn ? <Button color="inherit" onClick={() => { localStorage.removeItem(AUTH_KEY); navigate('/login'); }}>Logout</Button> : <Button color="inherit" onClick={() => navigate('/login')}>Login</Button>}
          </Stack>
        </Toolbar>
      </AppBar>
      <Drawer variant="persistent" open={open} sx={{ width: drawerWidth, '& .MuiDrawer-paper': { width: drawerWidth, mt: 8 } }}>
        <List>
          <ListItem><ListItemText primary="Pinned favorites" /></ListItem>
          <ListItem><ListItemText primary="Bulk actions" /></ListItem>
          <ListItem><ListItemText primary="Tags & filters" /></ListItem>
          <ListItem><ListItemText primary="Diff viewer" /></ListItem>
        </List>
        <Divider />
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <TextField fullWidth label="Search title or URL" value={query} onChange={(e) => dispatch({ type: 'query/set', payload: e.target.value })} sx={{ mb: 2 }} />
        {loading && <Typography>Loading captures...</Typography>}
        {error && <Typography color="error">{error}</Typography>}
        {!loading && !error && <CaptureList items={filteredItems} />}
      </Box>
    </Box>
  );
}
