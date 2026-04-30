import type { ExtensionSettings } from '../types/messages';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  backendBaseUrl: 'http://localhost:3000',
  autoModeEnabled: false,
  autoModeIntervalMs: 15000,
  authToken: '',
  popupCaptureShortcut: 'Ctrl+Shift+Y'
};

export const STORAGE_KEY = 'captureSettings';
