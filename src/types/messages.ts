export interface CaptureRequestMessage {
  type: 'CAPTURE_REQUEST';
  reason: 'command' | 'popup' | 'auto';
}

export interface CaptureDataMessage {
  type: 'CAPTURE_DATA';
  tabId: number;
  url: string;
  title: string;
  html: string;
  sourceCode: string;
  timestamp: string;
  reason: 'command' | 'popup' | 'auto';
}

export interface CapturePayload {
  url: string;
  title: string;
  html: string;
  sourceCode: string;
  screenshotBase64: string;
  timestamp: string;
  reason: 'command' | 'popup' | 'auto';
  metadataOnly?: boolean;
  compressed?: boolean;
  truncated?: boolean;
}

export interface TelemetryStats {
  started: number;
  success: number;
  failure: number;
  totalDurationMs: number;
  avgDurationMs: number;
  failureCategories: Record<string, number>;
}

export interface ExtensionSettings {
  backendBaseUrl: string;
  autoModeEnabled: boolean;
  autoModeIntervalMs: number;
  authToken: string;
  authEmail: string;
  authUsername: string;
  metadataOnlyMode: boolean;
  maxHtmlSizeBytes: number;
  lastSuccessAt: string;
  lastError: string;
  pendingUploads: number;
  telemetry: TelemetryStats;
}
