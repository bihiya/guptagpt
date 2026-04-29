import { useState } from 'react';
import type { CaptureItem } from '../types';

type CaptureTab = 'photo' | 'html' | 'source';

function getPreviewText(value: string) {
  return value.length > 8000 ? `${value.slice(0, 8000)}\n...` : value;
}

function CaptureTabs({ item }: { item: CaptureItem }) {
  const [activeTab, setActiveTab] = useState<CaptureTab>('photo');
  const tabs: { id: CaptureTab; label: string }[] = [
    { id: 'photo', label: 'Photo' },
    { id: 'html', label: 'Full HTML' },
    { id: 'source', label: 'Source code' },
  ];

  return (
    <div className="capture-tabs">
      <div className="tab-list" role="tablist" aria-label={`Capture content for ${item.title}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-panel" role="tabpanel">
        {activeTab === 'photo' && (
          <img
            className="capture-photo"
            src={`data:image/png;base64,${item.screenshotBase64}`}
            alt={`Screenshot of ${item.title}`}
            loading="lazy"
          />
        )}
        {activeTab === 'html' && <pre>{getPreviewText(item.html)}</pre>}
        {activeTab === 'source' && <pre>{getPreviewText(item.sourceCode)}</pre>}
      </div>
    </div>
  );
}

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
          <CaptureTabs item={item} />
        </li>
      ))}
    </ul>
  );
}
