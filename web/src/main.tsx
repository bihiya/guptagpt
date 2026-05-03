import React, { Suspense, lazy } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AppLoader } from './components/AppLoader';
import ReactDOM from 'react-dom/client';
import { usePathname } from './router';
import { StoreProvider } from './store';
import './styles.css';

const App = lazy(() => import('./pages/App').then((module) => ({ default: module.App })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const LogsPage = lazy(() => import('./pages/LogsPage').then((module) => ({ default: module.LogsPage })));

function RootPage() {
  const pathname = usePathname();

  if (pathname === '/login') return <AuthPage mode="login" />;
  if (pathname === '/signup') return <AuthPage mode="signup" />;
  if (pathname === '/settings') return <SettingsPage />;
  if (pathname === '/logs') return <LogsPage />;
  return <App />;
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
