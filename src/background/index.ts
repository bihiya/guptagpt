import type { CaptureDataMessage, CapturePayload } from '../types/messages.js';
import { getSettings, setSettings } from '../utils/storage.js';
import { CAPTURE_LOGS_KEY, QUEUE_KEY } from '../utils/constants.js';

let autoCaptureTimer: number | null = null;
let isCapturing = false;
let queueRetryTimer: number | null = null;
let lastScreenshotCaptureAt = 0;
const MAX_CAPTURE_LOGS = 50;

type CaptureLogEntry = {
  id: string;
  url: string;
  title: string;
  reason: 'command' | 'popup' | 'auto';
  status: 'queued' | 'uploading' | 'success' | 'failed';
  message: string;
  createdAt: string;
};

async function appendCaptureLog(entry: CaptureLogEntry): Promise<void> {
  const data = await chrome.storage.local.get(CAPTURE_LOGS_KEY);
  const logs = (data[CAPTURE_LOGS_KEY] as CaptureLogEntry[] | undefined) ?? [];
  logs.unshift(entry);
  await chrome.storage.local.set({ [CAPTURE_LOGS_KEY]: logs.slice(0, MAX_CAPTURE_LOGS) });
}

const MAX_SCREENSHOT_BYTES = 1_500_000;
const MIN_SCREENSHOT_CAPTURE_INTERVAL_MS = 1200;

function estimateBase64Bytes(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

async function optimizeScreenshot(dataUrl: string): Promise<string> {
  const originalBase64 = dataUrl.split(',')[1] ?? '';
  if (estimateBase64Bytes(originalBase64) <= MAX_SCREENSHOT_BYTES) return originalBase64;

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return originalBase64;

  let scale = 1;
  let quality = 0.82;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const jpegBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    const encoded = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Failed to encode screenshot'));
      reader.readAsDataURL(jpegBlob);
    });

    const base64 = encoded.split(',')[1] ?? '';
    if (estimateBase64Bytes(base64) <= MAX_SCREENSHOT_BYTES) return base64;

    quality = Math.max(0.45, quality - 0.1);
    scale *= 0.85;
  }

  return originalBase64;
}

function isCapturableUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url) && !url.startsWith('chrome-error://');
}

function categorizeError(error: unknown): string {
  const message = String(error).toLowerCase();
  if (message.includes('status 401') || message.includes('status 403')) return 'auth';
  if (message.includes('status 5')) return 'server';
  if (message.includes('network') || message.includes('fetch')) return 'network';
  return 'other';
}

function isCapturePermissionError(error: unknown): boolean {
  const message = String(error).toLowerCase();
  return message.includes("'<all_urls>'") || message.includes('activetab') || message.includes('permission');
}

function isCaptureQuotaError(error: unknown): boolean {
  return String(error).toLowerCase().includes('max_capture_visible_tab_calls_per_second');
}

function ensureScreenshotThrottle(): Promise<void> {
  const now = Date.now();
  const waitMs = Math.max(0, MIN_SCREENSHOT_CAPTURE_INTERVAL_MS - (now - lastScreenshotCaptureAt));
  if (!waitMs) {
    lastScreenshotCaptureAt = now;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    self.setTimeout(() => {
      lastScreenshotCaptureAt = Date.now();
      resolve();
    }, waitMs);
  });
}

type QueueItem = {
  id: string;
  payload: CapturePayload;
  attempts: number;
  nextRetryAt: number;
  lastError?: string;
};

async function getQueue(): Promise<QueueItem[]> {
  const data = await chrome.storage.local.get(QUEUE_KEY);
  return (data[QUEUE_KEY] as QueueItem[] | undefined) ?? [];
}

async function setQueue(queue: QueueItem[]): Promise<void> {
  await chrome.storage.local.set({ [QUEUE_KEY]: queue });
  await setSettings({ pendingUploads: queue.length });
}

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id || !tab.windowId) throw new Error('No active tab found.');
  if (!isCapturableUrl(tab.url)) throw new Error('This tab cannot be captured. Open an http(s) page and try again.');
  return tab;
}

async function buildPayload(reason: 'command' | 'popup' | 'auto'): Promise<CapturePayload> {
  const tab = await getActiveTab();
  const tabId = tab.id as number;
  const settings = await getSettings();

  let captureData: CaptureDataMessage;
  try {
    captureData = (await chrome.tabs.sendMessage(tabId, { type: 'CAPTURE_REQUEST', reason })) as CaptureDataMessage;
  } catch {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: (nextReason: 'command' | 'popup' | 'auto') => {
        const fullHtml = document.documentElement.outerHTML;
        return {
          type: 'CAPTURE_DATA' as const,
          tabId: -1,
          url: window.location.href,
          title: document.title,
          html: fullHtml,
          sourceCode: fullHtml,
          timestamp: new Date().toISOString(),
          reason: nextReason
        };
      },
      args: [reason]
    });
    const fallbackPayload = result[0]?.result;
    if (!fallbackPayload) throw new Error('Unable to read page HTML from active tab.');
    captureData = fallbackPayload;
  }

  const fullHtml = captureData.html ?? '';
  const cappedHtml = fullHtml.slice(0, settings.maxHtmlSizeBytes);
  const truncated = cappedHtml.length < fullHtml.length;
  let screenshotBase64 = '';
  if (!settings.metadataOnlyMode && settings.includeImage) {
    try {
      await ensureScreenshotThrottle();
      const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId as number, { format: 'png' });
      screenshotBase64 = await optimizeScreenshot(screenshotDataUrl);
    } catch (error) {
      if (isCapturePermissionError(error) || isCaptureQuotaError(error)) {
        console.warn('[capture] screenshot unavailable; continuing without screenshot', error);
      } else {
        throw error;
      }
    }
  }

  let pdfBase64 = '';
  if (!settings.metadataOnlyMode && settings.includePdf) {
    pdfBase64 = await exportActiveTabPdfBase64(tabId);
  }

  const payload: CapturePayload = {
    url: captureData.url,
    title: captureData.title,
    html: settings.metadataOnlyMode || !settings.includeHtml ? '' : cappedHtml,
    sourceCode: settings.metadataOnlyMode || !settings.includeSourceCode ? '' : cappedHtml,
    screenshotBase64,
    pdfBase64,
    timestamp: captureData.timestamp,
    reason,
    metadataOnly: settings.metadataOnlyMode,
    compressed: true,
    truncated
  };

  return payload;
}

async function postPayload(payload: CapturePayload): Promise<void> {
  const settings = await getSettings();
  const endpoint = new URL('/api/capture', settings.backendBaseUrl).toString();
  const startedAt = Date.now();

  await setSettings({
    telemetry: {
      ...settings.telemetry,
      started: settings.telemetry.started + 1
    }
  });

  const sendPayload = async (nextPayload: CapturePayload): Promise<Response> => fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.authToken ? { Authorization: `Bearer ${settings.authToken}` } : {})
      },
      body: JSON.stringify(nextPayload)
    });

  let response = await sendPayload(payload);

  if (response.status === 413) {
    const retryCandidates: CapturePayload[] = [];
    if (payload.pdfBase64) retryCandidates.push({ ...payload, pdfBase64: '' });
    if (payload.screenshotBase64) retryCandidates.push({ ...payload, screenshotBase64: '' });
    if (payload.pdfBase64 || payload.screenshotBase64) retryCandidates.push({ ...payload, pdfBase64: '', screenshotBase64: '' });
    if (payload.html || payload.sourceCode) retryCandidates.push({ ...payload, html: '', sourceCode: '', pdfBase64: '', screenshotBase64: '' });

    for (const retryPayload of retryCandidates) {
      response = await sendPayload(retryPayload);
      if (response.ok) break;
      if (response.status !== 413) break;
    }
  }

  if (!response.ok) {
    throw new Error(`Capture API failed with status ${response.status}`);
  }

  const fresh = await getSettings();
  const duration = Date.now() - startedAt;
  const totalDurationMs = fresh.telemetry.totalDurationMs + duration;
  const success = fresh.telemetry.success + 1;
  await setSettings({
    lastSuccessAt: new Date().toISOString(),
    lastError: '',
    telemetry: {
      ...fresh.telemetry,
      success,
      totalDurationMs,
      avgDurationMs: Math.round(totalDurationMs / Math.max(success, 1))
    }
  });
}

function computeBackoffMs(attempts: number): number {
  return Math.min(120000, 2000 * (2 ** Math.min(attempts, 6)));
}

async function flushQueue(): Promise<void> {
  if (isCapturing) return;
  let queue = await getQueue();
  const now = Date.now();
  const remain: QueueItem[] = [];

  for (const item of queue) {
    if (item.nextRetryAt > now) {
      remain.push(item);
      continue;
    }
    try {
      isCapturing = true;
      await appendCaptureLog({
        id: item.id,
        url: item.payload.url,
        title: item.payload.title,
        reason: item.payload.reason,
        status: 'uploading',
        message: 'Uploading capture to server.',
        createdAt: new Date().toISOString()
      });
      await postPayload(item.payload);
      await appendCaptureLog({
        id: item.id,
        url: item.payload.url,
        title: item.payload.title,
        reason: item.payload.reason,
        status: 'success',
        message: 'Capture uploaded successfully.',
        createdAt: new Date().toISOString()
      });
      isCapturing = false;
    } catch (error) {
      isCapturing = false;
      const attempts = item.attempts + 1;
      const nextRetryAt = Date.now() + computeBackoffMs(attempts);
      const lastError = String(error);
      remain.push({ ...item, attempts, nextRetryAt, lastError });
      const current = await getSettings();
      const cat = categorizeError(error);
      await setSettings({
        lastError,
        telemetry: {
          ...current.telemetry,
          failure: current.telemetry.failure + 1,
          failureCategories: {
            ...current.telemetry.failureCategories,
            [cat]: (current.telemetry.failureCategories[cat] ?? 0) + 1
          }
        }
      });
      await appendCaptureLog({
        id: item.id,
        url: item.payload.url,
        title: item.payload.title,
        reason: item.payload.reason,
        status: 'failed',
        message: lastError,
        createdAt: new Date().toISOString()
      });
    }
  }

  await setQueue(remain);
}

function scheduleQueueRetry(): void {
  if (queueRetryTimer !== null) clearInterval(queueRetryTimer);
  queueRetryTimer = self.setInterval(() => {
    flushQueue().catch((error: unknown) => console.error('[queue-flush] failed', error));
  }, 5000);
}

async function captureAndQueue(reason: 'command' | 'popup' | 'auto'): Promise<void> {
  if (isCapturing) {
    const q = await getQueue();
    await setSettings({ lastError: 'Capture skipped because a capture is already in progress.', pendingUploads: q.length });
    return;
  }
  isCapturing = true;
  try {
    const payload = await buildPayload(reason);
    const queue = await getQueue();
    const id = `${Date.now()}-${Math.random()}`;
    queue.push({ id, payload, attempts: 0, nextRetryAt: Date.now() });
    await appendCaptureLog({
      id,
      url: payload.url,
      title: payload.title,
      reason: payload.reason,
      status: 'queued',
      message: 'Capture queued and waiting for upload.',
      createdAt: new Date().toISOString()
    });
    await setQueue(queue);
    await flushQueue();
  } catch (error) {
    const current = await getSettings();
    const cat = categorizeError(error);
    await setSettings({
      lastError: String(error),
      telemetry: {
        ...current.telemetry,
        failure: current.telemetry.failure + 1,
        failureCategories: {
          ...current.telemetry.failureCategories,
          [cat]: (current.telemetry.failureCategories[cat] ?? 0) + 1
        }
      }
    });
    throw error;
  } finally {
    isCapturing = false;
  }
}

function stopAutoMode(): void {
  if (autoCaptureTimer !== null) {
    clearInterval(autoCaptureTimer);
    autoCaptureTimer = null;
  }
}

async function syncAutoMode(): Promise<void> {
  const settings = await getSettings();
  stopAutoMode();
  if (!settings.autoModeEnabled) return;
  autoCaptureTimer = self.setInterval(() => {
    if (isCapturing) return;
    captureAndQueue('auto').catch((error: unknown) => console.error('[auto-capture] failed', error));
  }, Math.max(settings.autoModeIntervalMs, 5000));
}

async function healthCheck(): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const settings = await getSettings();
    const candidates = ['/health', '/api/health'];
    const failures: string[] = [];

    for (const path of candidates) {
      const endpoint = new URL(path, settings.backendBaseUrl).toString();
      try {
        const response = await fetch(endpoint, { method: 'GET', cache: 'no-store' });
        if (response.ok) return { ok: true, status: response.status };
        failures.push(`${path} -> ${response.status}`);
      } catch (error) {
        failures.push(`${path} -> ${String(error)}`);
      }
    }

    return { ok: false, error: failures.join('; ') || 'No health endpoint responded.' };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

async function printActiveTabToPdf(): Promise<void> {
  const tab = await getActiveTab();
  const tabId = tab.id as number;
  const debuggee = { tabId };

  await chrome.debugger.attach(debuggee, '1.3');
  try {
    const pdfBase64 = await exportActiveTabPdfBase64(tabId, debuggee);
    const filenameSafeTitle = (tab.title || 'tab').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 80);
    await chrome.downloads.download({
      url: `data:application/pdf;base64,${pdfBase64}`,
      filename: `${filenameSafeTitle || 'tab'}-${Date.now()}.pdf`,
      saveAs: false
    });
  } finally {
    await chrome.debugger.detach(debuggee).catch(() => undefined);
  }
}

async function exportActiveTabPdfBase64(tabId: number, existingDebuggee?: { tabId: number }): Promise<string> {
  const debuggee = existingDebuggee ?? { tabId };
  const shouldDetach = !existingDebuggee;
  if (shouldDetach) await chrome.debugger.attach(debuggee, '1.3');
  try {
    await chrome.debugger.sendCommand(debuggee, 'Page.enable');
    const result = (await chrome.debugger.sendCommand(debuggee, 'Page.printToPDF', {
      printBackground: true,
      preferCSSPageSize: true
    })) as { data?: string };
    if (!result?.data) throw new Error('PDF generation failed.');
    return result.data;
  } finally {
    if (shouldDetach) await chrome.debugger.detach(debuggee).catch(() => undefined);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error: unknown) => console.error(error));
  syncAutoMode().catch((error: unknown) => console.error(error));
  scheduleQueueRetry();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error: unknown) => console.error(error));
  syncAutoMode().catch((error: unknown) => console.error(error));
  scheduleQueueRetry();
});

chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName === 'sync') syncAutoMode().catch((error: unknown) => console.error(error));
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'capture-current-tab') captureAndQueue('command').catch((error: unknown) => console.error(error));
  if (command === 'print-current-tab-pdf') printActiveTabToPdf().catch((error: unknown) => console.error(error));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message) return;

  if (message.type === 'CAPTURE_NOW') {
    captureAndQueue('popup')
      .then(async () => {
        const settings = await getSettings();
        sendResponse({ ok: true, pendingUploads: settings.pendingUploads });
      })
      .catch((error: unknown) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === 'RETRY_PENDING_UPLOADS') {
    flushQueue().then(() => sendResponse({ ok: true })).catch((error: unknown) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === 'HEALTH_CHECK') {
    healthCheck().then((res) => sendResponse(res)).catch((error: unknown) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  return;
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!message) return;

  if (message.type === 'SYNC_AUTH') {
    if (!sender.url) {
      sendResponse({ ok: false, error: 'Missing sender URL' });
      return;
    }

    setSettings({ authToken: String(message.token ?? ''), authEmail: String(message.email ?? ''), authUsername: String(message.username ?? '') })
      .then(() => sendResponse({ ok: true }))
      .catch((error: unknown) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === 'SYNC_SETTINGS') {
    setSettings({
      autoModeEnabled: Boolean(message.autoModeEnabled),
      autoModeIntervalMs: Number(message.autoModeIntervalMs) || 15000,
      metadataOnlyMode: Boolean(message.metadataOnlyMode),
      maxHtmlSizeBytes: Number(message.maxHtmlSizeBytes) || 750000,
      includeImage: message.includeImage !== false,
      includePdf: Boolean(message.includePdf),
      includeHtml: message.includeHtml !== false,
      includeSourceCode: message.includeSourceCode !== false,
      backendBaseUrl: String(message.backendBaseUrl || '')
    })
      .then(() => sendResponse({ ok: true }))
      .catch((error: unknown) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }
});
