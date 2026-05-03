import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createCapture, listCaptures } from '../services/captureService.js';
import { createCaptureLog, listCaptureLogs } from '../services/captureLogService.js';
import type { CaptureRequestBody } from '../types.js';

const router = Router();
const REASONS = new Set(['command', 'popup', 'auto']);
const MAX_HTML_BYTES = 8 * 1024 * 1024;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

function estimateUtf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

function estimateBase64Bytes(value: string): number {
  const normalized = value.trim();
  if (!normalized) return 0;
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

function isValidPayload(body: Partial<CaptureRequestBody>): body is CaptureRequestBody {
  if (!body.url || !body.title || typeof body.html !== 'string' || typeof body.sourceCode !== 'string' || typeof body.screenshotBase64 !== 'string' || !body.timestamp || !body.reason) {
    return false;
  }

  if (body.pdfBase64 !== undefined && typeof body.pdfBase64 !== 'string') {
    return false;
  }

  if (!REASONS.has(body.reason)) {
    return false;
  }

  try {
    new URL(body.url);
  } catch {
    return false;
  }

  return !Number.isNaN(Date.parse(body.timestamp));
}

function validatePayloadSize(body: CaptureRequestBody): string | null {
  const htmlBytes = estimateUtf8Bytes(body.html);
  const sourceBytes = estimateUtf8Bytes(body.sourceCode);
  const screenshotBytes = estimateBase64Bytes(body.screenshotBase64);
  const pdfBytes = estimateBase64Bytes(body.pdfBase64 ?? '');
  const totalBytes = htmlBytes + sourceBytes + screenshotBytes + pdfBytes;

  if (htmlBytes > MAX_HTML_BYTES) return `html exceeds ${MAX_HTML_BYTES} bytes`;
  if (sourceBytes > MAX_SOURCE_BYTES) return `sourceCode exceeds ${MAX_SOURCE_BYTES} bytes`;
  if (screenshotBytes > MAX_SCREENSHOT_BYTES) return `screenshotBase64 exceeds ${MAX_SCREENSHOT_BYTES} bytes`;
  if (totalBytes > MAX_TOTAL_BYTES) return `total payload exceeds ${MAX_TOTAL_BYTES} bytes`;
  return null;
}

router.post('/capture', requireAuth, async (req, res, next) => {
  try {
    const body = req.body as Partial<CaptureRequestBody>;
    if (!isValidPayload(body)) {
      res.status(400).json({ error: 'Invalid capture payload' });
      return;
    }

    const sizeError = validatePayloadSize(body);
    if (sizeError) {
      res.status(413).json({ error: `Capture payload too large: ${sizeError}` });
      return;
    }

    const capture = await createCapture(body, req.authUser!.id);
    res.status(201).json({ id: capture.id });
  } catch (error) {
    next(error);
  }
});

router.post('/capture-logs', requireAuth, async (req, res, next) => {
  try {
    const body = req.body as { captureId?: string; url?: string; title?: string; reason?: 'command' | 'popup' | 'auto'; status?: string; detail?: string; hasHtml?: boolean; hasSourceCode?: boolean; hasScreenshot?: boolean; hasPdf?: boolean };
    if (!body?.reason || !REASONS.has(body.reason) || !body?.status) {
      res.status(400).json({ error: 'Invalid capture log payload' });
      return;
    }

    const log = await createCaptureLog({
      captureId: body.captureId ?? '',
      url: body.url ?? '',
      title: body.title ?? '',
      reason: body.reason,
      status: body.status,
      detail: body.detail ?? '',
      hasHtml: Boolean(body.hasHtml),
      hasSourceCode: Boolean(body.hasSourceCode),
      hasScreenshot: Boolean(body.hasScreenshot),
      hasPdf: Boolean(body.hasPdf)
    }, req.authUser!.id);

    res.status(201).json({ id: log.id });
  } catch (error) {
    next(error);
  }
});

router.get('/capture-logs', requireAuth, async (req, res, next) => {
  try {
    const limitValue = Number(req.query.limit ?? 100);
    const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 500) : 100;
    const items = await listCaptureLogs(req.authUser!.id, limit);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.get('/captures', requireAuth, async (req, res, next) => {
  try {
    const limitValue = Number(req.query.limit ?? 20);
    const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 100) : 20;
    const captures = await listCaptures(req.authUser!.id, limit);
    res.json({ items: captures });
  } catch (error) {
    next(error);
  }
});

export default router;
