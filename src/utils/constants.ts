import type { ExtensionSettings } from '../types/messages';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  backendBaseUrl: 'https://guptagpt.vercel.app',
  autoModeEnabled: false,
  autoModeIntervalMs: 15000,
  authToken: '',
  authEmail: '',
  authUsername: '',
  popupCaptureShortcut: 'Ctrl+Shift+Y'
};

export const STORAGE_KEY = 'captureSettings';
