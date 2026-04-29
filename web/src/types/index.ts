export interface CaptureItem {
  _id: string;
  url: string;
  title: string;
  reason: 'command' | 'popup' | 'auto';
  timestamp: string;
  createdAt: string;
}
