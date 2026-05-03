import { Schema, model } from 'mongoose';

const captureLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    captureId: { type: String, default: '', index: true },
    url: { type: String, default: '' },
    title: { type: String, default: '' },
    reason: { type: String, enum: ['command', 'popup', 'auto'], required: true },
    status: { type: String, required: true },
    detail: { type: String, default: '' },
    hasHtml: { type: Boolean, default: false },
    hasSourceCode: { type: Boolean, default: false },
    hasScreenshot: { type: Boolean, default: false },
    hasPdf: { type: Boolean, default: false }
  },
  { timestamps: true }
);

captureLogSchema.index({ userId: 1, createdAt: -1 });

export const CaptureLogModel = model('CaptureLog', captureLogSchema);
