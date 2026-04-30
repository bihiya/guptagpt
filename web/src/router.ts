import { useSyncExternalStore } from 'react';

function normalizePathname(pathname: string): string {
  return pathname.replace(/\/$/, '') || '/';
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener('popstate', onStoreChange);
  return () => window.removeEventListener('popstate', onStoreChange);
}

function getSnapshot(): string {
  return normalizePathname(window.location.pathname);
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, getSnapshot, () => '/');
}

export function navigate(to: string): void {
  const next = normalizePathname(to);
  const current = normalizePathname(window.location.pathname);
  if (next === current) return;
  window.history.pushState({}, '', next);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
