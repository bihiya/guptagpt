import { Router } from 'express';
import { createCapture, listCaptures } from '../services/captureService.js';
import type { CaptureRequestBody } from '../types.js';

const router = Router();
const MAX_HTML_SIZE = 2_000_000;
const MAX_IMAGE_SIZE = 10_000_000;
const REASONS = new Set(['command', 'popup', 'auto']);

function isValidPayload(body: Partial<CaptureRequestBody>): body is CaptureRequestBody {
  if (!body.url || !body.title || !body.html || !body.screenshotBase64 || !body.timestamp || !body.reason) {
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

  if (body.html.length > MAX_HTML_SIZE || body.screenshotBase64.length > MAX_IMAGE_SIZE) {
    return false;
  }

  return !Number.isNaN(Date.parse(body.timestamp));
}

router.post('/capture', async (req, res, next) => {
  try {
    const body = req.body as Partial<CaptureRequestBody>;
    if (!isValidPayload(body)) {
      res.status(400).json({ error: 'Invalid capture payload' });
      return;
    }

    const capture = await createCapture(body);
    res.status(201).json({ id: capture.id });
  } catch (error) {
    next(error);
  }
});

router.get('/captures', async (req, res, next) => {
  try {
    const limitValue = Number(req.query.limit ?? 20);
    const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 100) : 20;
    const captures = await listCaptures(limit);
    res.json({ items: captures });
  } catch (error) {
    next(error);
  }
});

export default router;
