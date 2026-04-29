import type { CaptureItem } from './index';

export interface FetchCapturesResponse {
  items: CaptureItem[];
}

export interface AuthUser {
  id: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
