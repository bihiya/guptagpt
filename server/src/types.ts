export interface CaptureRequestBody {
  url: string;
  title: string;
  html: string;
  sourceCode: string;
  screenshotBase64: string;
  pdfBase64?: string;
  timestamp: string;
  reason: 'command' | 'popup' | 'auto';
}

export interface AuthRequestBody {
  email: string;
  password: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface GoogleAuthRequestBody {
  idToken: string;
}
