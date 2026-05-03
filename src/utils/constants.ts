import type { ExtensionSettings } from '../types/messages';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  backendBaseUrl: 'https://guptagpt.vercel.app',
  autoModeEnabled: false,
  autoModeIntervalMs: 15000,
  authToken: '',
  authEmail: '',
  authUsername: '',
  metadataOnlyMode: false,
  maxHtmlSizeBytes: 750000,
  includeImage: true,
  includePdf: false,
  includeHtml: true,
  includeSourceCode: true,
  lastSuccessAt: '',
  lastError: '',
  pendingUploads: 0,
  telemetry: {
    started: 0,
    success: 0,
    failure: 0,
    totalDurationMs: 0,
    avgDurationMs: 0,
    failureCategories: {}
  }
};

export const STORAGE_KEY = 'captureSettings';
export const QUEUE_KEY = 'captureQueue';
export const CAPTURE_LOGS_KEY = 'captureLogs';
