const DEFAULT_API_BASE_URL = 'http://localhost:3000';

export const APP_CONFIG = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  extensionId: import.meta.env.VITE_EXTENSION_ID ?? '',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  requestTimeoutMs: 10_000,
} as const;
