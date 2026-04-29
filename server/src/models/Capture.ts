import { Schema, model } from 'mongoose';

const captureSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    url: { type: String, required: true },
    title: { type: String, required: true },
    html: { type: String, required: true },
    screenshotBase64: { type: String, required: true },
    timestamp: { type: Date, required: true },
    reason: { type: String, enum: ['command', 'popup', 'auto'], required: true }
  },
  { timestamps: true }
);

captureSchema.index({ userId: 1, createdAt: -1 });

export const CaptureModel = model('Capture', captureSchema);
