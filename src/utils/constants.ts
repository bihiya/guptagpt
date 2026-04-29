import type { ExtensionSettings } from '../types/messages';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  backendBaseUrl: 'http://localhost:3000',
  autoModeEnabled: false,
  autoModeIntervalMs: 15000
};

export const STORAGE_KEY = 'captureSettings';
