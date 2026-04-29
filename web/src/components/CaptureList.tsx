import type { CaptureItem } from '../types';

export function CaptureList({ items }: { items: CaptureItem[] }) {
  if (items.length === 0) {
    return <p>No captures yet.</p>;
  }

  return (
    <ul className="list">
      {items.map((item) => (
        <li key={item._id}>
          <div className="row">
            <strong>{item.title}</strong>
            <span className={`pill ${item.reason}`}>{item.reason}</span>
          </div>
          <a href={item.url} target="_blank" rel="noreferrer">{item.url}</a>
          <p>{new Date(item.createdAt).toLocaleString()}</p>
        </li>
      ))}
    </ul>
  );
}
