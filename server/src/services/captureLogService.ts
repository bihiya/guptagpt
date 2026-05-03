import { CaptureLogModel } from '../models/CaptureLog.js';

export interface CaptureLogPayload {
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
}

export async function createCaptureLog(payload: CaptureLogPayload, userId: string) {
  return CaptureLogModel.create({ ...payload, userId });
}

export async function listCaptureLogs(userId: string, limit = 100) {
  return CaptureLogModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
}
