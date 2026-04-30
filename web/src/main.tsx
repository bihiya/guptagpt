import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './pages/App';
import { AuthPage } from './pages/AuthPage';
import { usePathname } from './router';
import { StoreProvider } from './store';
import './styles.css';

function RootPage() {
  const pathname = usePathname();
  if (pathname === '/login') return <AuthPage mode="login" />;
  if (pathname === '/signup') return <AuthPage mode="signup" />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreProvider>
      <RootPage />
    </StoreProvider>
  </React.StrictMode>,
);
