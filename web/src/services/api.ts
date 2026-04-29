import { APP_CONFIG } from '../config';
import type { FetchCapturesResponse } from '../types/api';

async function httpGet<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APP_CONFIG.requestTimeoutMs);

  try {
    const response = await fetch(`${APP_CONFIG.apiBaseUrl}${path}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out while loading captures');
    }

    throw error instanceof Error ? error : new Error('Unexpected API error');
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchCaptures() {
  const data = await httpGet<FetchCapturesResponse>('/api/captures');
  return data.items;
}
