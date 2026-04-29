import { APP_CONFIG } from '../config';
import type { AuthResponse, FetchCapturesResponse } from '../types/api';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APP_CONFIG.requestTimeoutMs);

  try {
    const response = await fetch(`${APP_CONFIG.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? `Request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error instanceof Error ? error : new Error('Unexpected API error');
  } finally {
    clearTimeout(timeout);
  }
}

export async function signup(username: string, password: string) {
  return request<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function login(username: string, password: string) {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function fetchCaptures(token: string) {
  const data = await request<FetchCapturesResponse>('/api/captures', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.items;
}
