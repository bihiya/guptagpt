import type { CaptureDataMessage, CapturePayload } from '../types/messages';
import { getSettings } from '../utils/storage';

let autoCaptureTimer: number | null = null;

function isInjectableUrl(url?: string): boolean {
  return Boolean(url && (url.startsWith('http://') || url.startsWith('https://')));
}

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id || !tab.windowId || !isInjectableUrl(tab.url)) {
    throw new Error('No valid active http(s) tab found.');
  }
  return tab;
}

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/index.js']
    });
  }
}

async function postCapture(payload: CapturePayload): Promise<void> {
  const settings = await getSettings();
  const endpoint = new URL('/api/capture', settings.backendBaseUrl).toString();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Capture API failed (${response.status}): ${text.slice(0, 200)}`);
  }
}

async function captureAndSend(reason: 'command' | 'popup' | 'auto'): Promise<void> {
  const tab = await getActiveTab();
  const tabId = tab.id as number;

  await ensureContentScript(tabId);

  const captureData = (await chrome.tabs.sendMessage(tabId, {
    type: 'CAPTURE_REQUEST',
    reason
  })) as CaptureDataMessage;

  if (!captureData?.html || !captureData.url) {
    throw new Error('Content capture failed: empty response payload.');
  }

  const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  const screenshotBase64 = screenshotDataUrl.split(',')[1] ?? '';

  await postCapture({
    url: captureData.url,
    title: captureData.title,
    html: captureData.html,
    screenshotBase64,
    timestamp: captureData.timestamp,
    reason
  });
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

  const intervalMs = Math.max(settings.autoModeIntervalMs, 5000);
  autoCaptureTimer = self.setInterval(() => {
    captureAndSend('auto').catch((error: unknown) => console.error('[auto-capture] failed', error));
  }, intervalMs);
}

chrome.runtime.onInstalled.addListener(() => void syncAutoMode());
chrome.runtime.onStartup.addListener(() => void syncAutoMode());

chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName === 'sync') {
    void syncAutoMode();
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'capture-current-tab') {
    void captureAndSend('command');
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'CAPTURE_NOW') return;

  captureAndSend('popup')
    .then(() => sendResponse({ ok: true }))
    .catch((error: unknown) => sendResponse({ ok: false, error: String(error) }));

  return true;
});
