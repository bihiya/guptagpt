export const AUTH_KEY = 'captureWebAuth';

export interface SavedAuth {
  username?: string;
  email: string;
  token: string;
}

export function getSavedAuth(): SavedAuth | null {
  const saved = localStorage.getItem(AUTH_KEY);
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved) as Partial<SavedAuth>;
    if (!parsed.token) return null;
    if (!parsed.email) return null;
    return {
      username: parsed.username ?? '',
      email: parsed.email,
      token: parsed.token,
    };
  } catch {
    localStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export function saveAuth(auth: SavedAuth): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}
