import { CaptureModel } from '../models/Capture.js';
import type { CaptureRequestBody } from '../types.js';

export async function createCapture(payload: CaptureRequestBody, userId: string) {
  return CaptureModel.create({
    ...payload,
    userId,
    timestamp: new Date(payload.timestamp)
  });
}

export async function listCaptures(userId: string, limit = 20) {
  return CaptureModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
}
