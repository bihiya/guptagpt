import { useEffect } from 'react';
import { AUTH_KEY, getSavedAuth } from '../auth';
import { CaptureList } from '../components/CaptureList';
import { navigate } from '../router';
import { selectFilteredCaptures, useStore } from '../store';

export function App() {
  const { state, dispatch, loadCaptures } = useStore();
  const { items, loading, error, query } = state;
  const filteredItems = selectFilteredCaptures(state);
  const savedAuth = getSavedAuth();
  const isLoggedIn = Boolean(savedAuth?.token);

  useEffect(() => {
    if (savedAuth?.token) {
      void loadCaptures(savedAuth.token);
    }
  }, []);

  const autoCount = items.filter((item) => item.reason === 'auto').length;
  const manualCount = items.length - autoCount;

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    navigate('/login');
  };

  return (
    <main className="container">
      <header className="topbar">
        <div>
          <p className="eyebrow">Capture workspace</p>
          <h1>Capture Dashboard</h1>
        </div>
        <nav className="top-actions" aria-label="Account actions">
          {isLoggedIn ? (
            <>
              <span>{savedAuth?.email ?? savedAuth?.username}</span>
              <button onClick={() => void loadCaptures(savedAuth?.token ?? '')}>Refresh</button>
              <button className="secondary" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <a className="button-link" href="/login" onClick={(event) => {
                event.preventDefault();
                navigate('/login');
              }}>Login</a>
              <a className="button-link secondary" href="/signup" onClick={(event) => {
                event.preventDefault();
                navigate('/signup');
              }}>Sign up</a>
            </>
          )}
        </nav>
      </header>

      <section className="stats">
        <article><h3>Total</h3><p>{items.length}</p></article>
        <article><h3>Auto</h3><p>{autoCount}</p></article>
        <article><h3>Manual</h3><p>{manualCount}</p></article>
      </section>

      <input
        className="search"
        placeholder="Search title or URL"
        value={query}
        onChange={(event) => dispatch({ type: 'query/set', payload: event.target.value })}
      />

      {loading && <p>Loading captures...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && <CaptureList items={filteredItems} />}
    </main>
  );
}
