import { useEffect, useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  CssBaseline,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import DoneAllOutlinedIcon from '@mui/icons-material/DoneAllOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined';
import IconButton from '@mui/material/IconButton';
import { AUTH_KEY, getSavedAuth } from '../auth';
import { CaptureList } from '../components/CaptureList';
import { navigate } from '../router';
import { selectFilteredCaptures, useStore } from '../store';

const drawerWidth = 280;

export function App() {
  const { state, dispatch, loadCaptures } = useStore();
  const { loading, error, query } = state;
  const filteredItems = selectFilteredCaptures(state);
  const savedAuth = getSavedAuth();
  const isLoggedIn = Boolean(savedAuth?.token);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (savedAuth?.token) void loadCaptures(savedAuth.token);
  }, []);

  const sidebarItems = [
    { label: 'Pinned favorites', icon: <PushPinOutlinedIcon fontSize="small" /> },
    { label: 'Bulk actions', icon: <DoneAllOutlinedIcon fontSize="small" /> },
    { label: 'Tags & filters', icon: <SellOutlinedIcon fontSize="small" /> },
    { label: 'Diff viewer', icon: <CompareArrowsOutlinedIcon fontSize="small" /> }
  ];

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
          <IconButton color="inherit" onClick={() => setOpen((v) => !v)} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
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
            {isLoggedIn && <Button color="inherit" onClick={() => void loadCaptures(savedAuth?.token ?? '')}>Refresh</Button>}
            {isLoggedIn ? <Button color="inherit" onClick={() => { localStorage.removeItem(AUTH_KEY); navigate('/login'); }}>Logout</Button> : <Button color="inherit" onClick={() => navigate('/login')}>Login</Button>}
          </Stack>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="persistent"
        open={open}
        sx={{
          width: drawerWidth,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            mt: 8,
            p: 2,
            border: 'none',
            bgcolor: 'transparent'
          }
        }}
      >
        <Paper elevation={0} sx={{ borderRadius: 3, p: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ px: 1, pb: 1 }}>
            Workspace
          </Typography>
          <List sx={{ p: 0 }}>
            {sidebarItems.map((item) => (
              <ListItemButton key={item.label} sx={{ borderRadius: 2, mb: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 34 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Paper>
        <Divider sx={{ my: 2 }} />
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 2, mb: 2 }}>
          <TextField
            fullWidth
            label="Search title or URL"
            value={query}
            onChange={(e) => dispatch({ type: 'query/set', payload: e.target.value })}
          />
        </Paper>
        {loading && <Typography>Loading captures...</Typography>}
        {error && <Typography color="error">{error}</Typography>}
        {!loading && !error && <CaptureList items={filteredItems} />}
      </Box>
    </Box>
  );
}
