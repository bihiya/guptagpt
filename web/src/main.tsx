import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { usePathname } from './router';
import { StoreProvider } from './store';
import './styles.css';

const App = lazy(() => import('./pages/App').then((module) => ({ default: module.App })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));

function RootPage() {
  const pathname = usePathname();

  if (pathname === '/login') return <AuthPage mode="login" />;
  if (pathname === '/signup') return <AuthPage mode="signup" />;
  if (pathname === '/settings') return <SettingsPage />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreProvider>
      <Suspense fallback={<div style={{ padding: '2rem', fontFamily: 'system-ui' }}>Loading page…</div>}>
        <RootPage />
      </Suspense>
    </StoreProvider>
  </React.StrictMode>
);
