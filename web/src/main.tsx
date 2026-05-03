import React, { Suspense, lazy } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box, CssBaseline } from '@mui/material';
import { AppLoader } from './components/AppLoader';
import ReactDOM from 'react-dom/client';
import { usePathname } from './router';
import { StoreProvider, useStore } from './store';
import { TopHeader } from './components/TopHeader';
import { getSavedAuth } from './auth';
import './styles.css';

const App = lazy(() => import('./pages/App').then((module) => ({ default: module.App })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const LogsPage = lazy(() => import('./pages/LogsPage').then((module) => ({ default: module.LogsPage })));

function RootPage() {
  const pathname = usePathname();
  const { loadCaptures } = useStore();

  const handleRefresh = () => {
    const auth = getSavedAuth();
    if (pathname === '/' && auth?.token) {
      void loadCaptures(auth.token);
    }
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fb' }}>
      <TopHeader onRefresh={handleRefresh} />
      {pathname === '/login' && <AuthPage mode="login" />}
      {pathname === '/signup' && <AuthPage mode="signup" />}
      {pathname === '/settings' && <SettingsPage />}
      {pathname === '/logs' && <LogsPage />}
      {!['/login', '/signup', '/settings', '/logs'].includes(pathname) && <App />}
    </Box>
  );
}

const theme = createTheme({ palette: { mode: 'light', primary: { main: '#5b5bd6' }, secondary: { main: '#0ea5e9' }, background: { default: '#f3f6ff' } }, shape: { borderRadius: 14 } });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <StoreProvider>
        <Suspense fallback={<AppLoader message="Loading page..." />}>
          <RootPage />
        </Suspense>
      </StoreProvider>
    </ThemeProvider>
  </React.StrictMode>
);
