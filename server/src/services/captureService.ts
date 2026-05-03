import { CaptureModel } from '../models/Capture.js';
import type { CaptureRequestBody } from '../types.js';

export async function createCapture(payload: CaptureRequestBody, userId: string) {
  const doc = {
    ...payload,
    captureId: payload.captureId ?? '',
    userId,
    timestamp: new Date(payload.timestamp)
  };

  if (doc.captureId) {
    const existing = await CaptureModel.findOne({ userId, captureId: doc.captureId });
    if (existing) return existing;
  }

  try {
    return await CaptureModel.create(doc);
  } catch (error) {
    const maybeMongoError = error as { code?: number };
    if (doc.captureId && maybeMongoError?.code === 11000) {
      const existing = await CaptureModel.findOne({ userId, captureId: doc.captureId });
      if (existing) return existing;
    }
    throw error;
  }
}

export async function listCaptures(userId: string, limit = 20) {
  return CaptureModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
}
