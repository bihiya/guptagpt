export interface CaptureRequestBody {
  url: string;
  title: string;
  html: string;
  screenshotBase64: string;
  timestamp: string;
  reason: 'command' | 'popup' | 'auto';
}

export interface AuthRequestBody {
  username: string;
  password: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
}
