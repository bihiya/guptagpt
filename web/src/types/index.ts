export interface CaptureItem {
  _id: string;
  url: string;
  title: string;
  html: string;
  sourceCode: string;
  screenshotBase64: string;
  reason: 'command' | 'popup' | 'auto';
  timestamp: string;
  createdAt: string;
}
