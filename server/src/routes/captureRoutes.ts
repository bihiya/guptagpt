import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createCapture, listCaptures } from '../services/captureService.js';
import type { CaptureRequestBody } from '../types.js';

const router = Router();
const MAX_HTML_SIZE = 2_000_000;
const MAX_SOURCE_SIZE = 2_000_000;
const MAX_IMAGE_SIZE = 10_000_000;
const MAX_PDF_SIZE = 20_000_000;
const REASONS = new Set(['command', 'popup', 'auto']);

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

  if (
    body.html.length > MAX_HTML_SIZE
    || body.sourceCode.length > MAX_SOURCE_SIZE
    || body.screenshotBase64.length > MAX_IMAGE_SIZE
    || (body.pdfBase64?.length ?? 0) > MAX_PDF_SIZE
  ) {
    return false;
  }

  return !Number.isNaN(Date.parse(body.timestamp));
}

router.post('/capture', requireAuth, async (req, res, next) => {
  try {
    const body = req.body as Partial<CaptureRequestBody>;
    if (!isValidPayload(body)) {
      res.status(400).json({ error: 'Invalid capture payload' });
      return;
    }

    const capture = await createCapture(body, req.authUser!.id);
    res.status(201).json({ id: capture.id });
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
