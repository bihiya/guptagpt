import type { CaptureDataMessage, CapturePayload } from '../types/messages.js';
import { getSettings, setSettings } from '../utils/storage.js';

let autoCaptureTimer: number | null = null;

function isCapturableUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id || !tab.windowId) {
    throw new Error('No active tab found.');
  }
  if (!isCapturableUrl(tab.url)) {
    throw new Error('This tab cannot be captured. Open an http(s) page and try again.');
  }
  return tab;
}

async function captureAndSend(reason: 'command' | 'popup' | 'auto'): Promise<void> {
  const tab = await getActiveTab();
  const tabId = tab.id as number;

  let captureData: CaptureDataMessage;
  try {
    captureData = (await chrome.tabs.sendMessage(tabId, {
      type: 'CAPTURE_REQUEST',
      reason
    })) as CaptureDataMessage;
  } catch {
    // Some pages do not have an attached content-script receiver yet.
    // Fall back to one-off script execution in the active tab.
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
    if (!fallbackPayload) {
      throw new Error('Unable to read page HTML from active tab.');
    }
    captureData = fallbackPayload;
  }

  const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
    format: 'png'
  });

  const screenshotBase64 = screenshotDataUrl.split(',')[1] ?? '';

  const settings = await getSettings();
  const endpoint = new URL('/api/capture', settings.backendBaseUrl).toString();

  const payload: CapturePayload = {
    url: captureData.url,
    title: captureData.title,
    html: captureData.html,
    sourceCode: captureData.sourceCode,
    screenshotBase64,
    timestamp: captureData.timestamp,
    reason
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(settings.authToken ? { Authorization: `Bearer ${settings.authToken}` } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Capture API failed with status ${response.status}`);
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

  if (!settings.autoModeEnabled) {
    return;
  }

  autoCaptureTimer = self.setInterval(() => {
    captureAndSend('auto').catch((error: unknown) => {
      console.error('[auto-capture] failed', error);
    });
  }, Math.max(settings.autoModeIntervalMs, 5000));
}

chrome.runtime.onInstalled.addListener(() => {
  syncAutoMode().catch((error: unknown) => console.error(error));
});

chrome.runtime.onStartup.addListener(() => {
  syncAutoMode().catch((error: unknown) => console.error(error));
});

chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName === 'sync') {
    syncAutoMode().catch((error: unknown) => console.error(error));
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'capture-current-tab') {
    captureAndSend('command').catch((error: unknown) => console.error(error));
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'CAPTURE_NOW') {
    return;
  }

  captureAndSend('popup')
    .then(() => sendResponse({ ok: true }))
    .catch((error: unknown) => sendResponse({ ok: false, error: String(error) }));

  return true;
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'SYNC_AUTH') {
    return;
  }

  if (!sender.url) {
    sendResponse({ ok: false, error: 'Missing sender URL' });
    return;
  }

  setSettings({ authToken: String(message.token ?? '') })
    .then(() => sendResponse({ ok: true }))
    .catch((error: unknown) => sendResponse({ ok: false, error: String(error) }));

  return true;
});
