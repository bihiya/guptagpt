import { CaptureModel } from '../models/Capture.js';
import type { CaptureRequestBody } from '../types.js';

export async function createCapture(payload: CaptureRequestBody) {
  return CaptureModel.create({
    ...payload,
    timestamp: new Date(payload.timestamp)
  });
}

export async function listCaptures(limit = 20) {
  return CaptureModel.find().sort({ createdAt: -1 }).limit(limit).lean();
}
