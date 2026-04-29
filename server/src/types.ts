export interface CaptureRequestBody {
  url: string;
  title: string;
  html: string;
  screenshotBase64: string;
  timestamp: string;
  reason: 'command' | 'popup' | 'auto';
}
