import type { CaptureItem } from './index';

export interface FetchCapturesResponse {
  items: CaptureItem[];
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}


export interface CaptureLogItem {
  _id: string;
  captureId?: string;
  url?: string;
  title?: string;
  reason: 'command' | 'popup' | 'auto';
  status: string;
  detail?: string;
  hasHtml?: boolean;
  hasSourceCode?: boolean;
  hasScreenshot?: boolean;
  hasPdf?: boolean;
  createdAt: string;
}

export interface FetchCaptureLogsResponse {
  items: CaptureLogItem[];
}
