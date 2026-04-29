import { useEffect } from 'react';
import { CaptureList } from '../components/CaptureList';
import { selectFilteredCaptures, useStore } from '../store';

export function App() {
  const { state, dispatch, loadCaptures } = useStore();
  const { items, loading, error, query } = state;
  const filteredItems = selectFilteredCaptures(state);

  useEffect(() => {
    void loadCaptures();
  }, []);

  const autoCount = items.filter((item) => item.reason === 'auto').length;
  const manualCount = items.length - autoCount;

  return (
    <main className="container">
      <header className="topbar">
        <h1>Capture Dashboard</h1>
        <button onClick={() => void loadCaptures()}>Refresh</button>
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
