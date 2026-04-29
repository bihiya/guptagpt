import { useEffect, useMemo, useState } from 'react';
import { CaptureList } from '../components/CaptureList';
import { fetchCaptures } from '../services/api';
import type { CaptureItem } from '../types';

export function App() {
  const [items, setItems] = useState<CaptureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [query, setQuery] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');
      setItems(await fetchCaptures());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => items.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) || item.url.toLowerCase().includes(query.toLowerCase())
  ), [items, query]);

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="container">
      <header className="topbar">
        <h1>Capture Dashboard</h1>
        <button onClick={() => void load()}>Refresh</button>
      </header>

      <section className="stats">
        <article><h3>Total</h3><p>{items.length}</p></article>
        <article><h3>Auto</h3><p>{items.filter((i) => i.reason === 'auto').length}</p></article>
        <article><h3>Manual</h3><p>{items.filter((i) => i.reason !== 'auto').length}</p></article>
      </section>

      <input
        className="search"
        placeholder="Search title or URL"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <p>Loading captures...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && <CaptureList items={filtered} />}
    </main>
  );
}
