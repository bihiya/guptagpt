import type { CaptureItem } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export async function fetchCaptures(): Promise<CaptureItem[]> {
  const response = await fetch(`${API_BASE}/api/captures`);
  if (!response.ok) {
    throw new Error('Failed to load captures');
  }
  const json = (await response.json()) as { items: CaptureItem[] };
  return json.items;
}
