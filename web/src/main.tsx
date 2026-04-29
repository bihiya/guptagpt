import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './pages/App';
import { AuthPage } from './pages/AuthPage';
import { StoreProvider } from './store';
import './styles.css';

const pathname = window.location.pathname.replace(/\/$/, '') || '/';
const page = pathname === '/login' ? <AuthPage mode="login" /> : pathname === '/signup' ? <AuthPage mode="signup" /> : <App />;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreProvider>
      {page}
    </StoreProvider>
  </React.StrictMode>,
);
