import { Schema, model } from 'mongoose';

const captureSchema = new Schema(
  {
    url: { type: String, required: true },
    title: { type: String, required: true },
    html: { type: String, required: true },
    screenshotBase64: { type: String, required: true },
    timestamp: { type: Date, required: true },
    reason: { type: String, enum: ['command', 'popup', 'auto'], required: true }
  },
  { timestamps: true }
);

captureSchema.index({ createdAt: -1 });

export const CaptureModel = model('Capture', captureSchema);
