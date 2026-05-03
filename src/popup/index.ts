import { getSettings, setSettings } from '../utils/storage.js';
import { CAPTURE_LOGS_KEY } from '../utils/constants.js';

const intervalSelect = document.getElementById('intervalMinutes') as HTMLSelectElement;
const autoModeCheckbox = document.getElementById('autoModeEnabled') as HTMLInputElement;
const metadataOnlyModeCheckbox = document.getElementById('metadataOnlyMode') as HTMLInputElement;
const maxHtmlSizeBytesInput = document.getElementById('maxHtmlSizeBytes') as HTMLInputElement;
const includeImageCheckbox = document.getElementById('includeImage') as HTMLInputElement;
const includePdfCheckbox = document.getElementById('includePdf') as HTMLInputElement;
const includeHtmlCheckbox = document.getElementById('includeHtml') as HTMLInputElement;
const includeSourceCodeCheckbox = document.getElementById('includeSourceCode') as HTMLInputElement;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const captureBtn = document.getElementById('captureBtn') as HTMLButtonElement;
const retryBtn = document.getElementById('retryBtn') as HTMLButtonElement;
const healthBtn = document.getElementById('healthBtn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;
const authGreetingEl = document.getElementById('authGreeting') as HTMLParagraphElement;
const authEmailEl = document.getElementById('authEmail') as HTMLParagraphElement;
const logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement;
const pendingUploadsEl = document.getElementById('pendingUploads') as HTMLElement;
const lastSuccessAtEl = document.getElementById('lastSuccessAt') as HTMLElement;
const lastErrorEl = document.getElementById('lastError') as HTMLElement;
const healthStatusEl = document.getElementById('healthStatus') as HTMLElement;
const logsToggleBtn = document.getElementById('logsToggleBtn') as HTMLButtonElement;
const logsPanelEl = document.getElementById('logsPanel') as HTMLElement;
const captureLogsEl = document.getElementById('captureLogs') as HTMLElement;
const queuedListEl = document.getElementById('queuedList') as HTMLElement;
const cancelAllQueuedBtn = document.getElementById('cancelAllQueuedBtn') as HTMLButtonElement;

type CaptureLogEntry = {
  id: string;
  url: string;
  title: string;
  reason: 'command' | 'popup' | 'auto';
  status: 'queued' | 'uploading' | 'success' | 'failed';
  message: string;
  createdAt: string;
};
type QueueListItem = {
  id: string;
  payload: { url: string; title: string; reason: 'command' | 'popup' | 'auto'; screenshotBase64?: string; pdfBase64?: string; html?: string; sourceCode?: string };
  attempts: number;
  nextRetryAt: number;
  lastError?: string;
};

function setStatus(message: string): void { statusEl.textContent = message; }

const MINUTE_OPTIONS = [1, 2, 5, 10, 15, 30, 60] as const;

function millisecondsToMinutes(ms: number): number {
  const rawMinutes = Math.max(1, Math.round(ms / 60000));
  const exact = MINUTE_OPTIONS.find((m) => m === rawMinutes);
  if (exact) return exact;
  return MINUTE_OPTIONS.reduce((best, cur) => (Math.abs(cur - rawMinutes) < Math.abs(best - rawMinutes) ? cur : best), MINUTE_OPTIONS[0]);
}

function updateIntervalState(): void {
  intervalSelect.disabled = !autoModeCheckbox.checked;
}

async function persistLastError(message: string): Promise<void> {
  await setSettings({ lastError: message });
}

async function refreshDiagnostics(): Promise<void> {
  const settings = await getSettings();
  pendingUploadsEl.textContent = `Pending uploads: ${settings.pendingUploads}`;
  lastSuccessAtEl.textContent = `Last success: ${settings.lastSuccessAt ? new Date(settings.lastSuccessAt).toLocaleString() : '—'}`;
  lastErrorEl.textContent = `Last error: ${settings.lastError || '—'}`;
}

async function renderCaptureLogs(): Promise<void> {
  const data = await chrome.storage.local.get(CAPTURE_LOGS_KEY);
  const logs = (data[CAPTURE_LOGS_KEY] as CaptureLogEntry[] | undefined) ?? [];
  if (!logs.length) {
    captureLogsEl.innerHTML = '<div class="log-item">No captures yet.</div>';
    return;
  }
  captureLogsEl.innerHTML = logs.map((entry) => `
    <article class="log-item">
      <strong>${entry.status.toUpperCase()}</strong><br/>
      <small>${new Date(entry.createdAt).toLocaleString()} · ${entry.reason}</small><br/>
      <small>${entry.title || entry.url}</small><br/>
      <small>${entry.message}</small>
    </article>
  `).join('');
}

async function renderQueuedCaptures(): Promise<void> {
  const response = await chrome.runtime.sendMessage({ type: 'GET_QUEUE_ITEMS' });
  const items = (response?.items as QueueListItem[] | undefined) ?? [];
  if (!items.length) {
    queuedListEl.innerHTML = '<div class="log-item">No queued captures.</div>';
    cancelAllQueuedBtn.disabled = true;
    return;
  }
  cancelAllQueuedBtn.disabled = false;
  queuedListEl.innerHTML = items.map((item) => `
    <article class="log-item">
      <strong>QUEUED</strong><br/>
      <small>${new Date(item.nextRetryAt).toLocaleString()} · attempt ${item.attempts}</small><br/>
      <small>${item.payload.title || item.payload.url}</small><br/>
      <small>${item.payload.reason} · ${item.payload.pdfBase64 ? 'pdf' : 'no-pdf'} · ${item.payload.screenshotBase64 ? 'image' : 'no-image'}</small><br/>
      <button class="save-button cancel-queue-item" data-id="${item.id}" type="button">Cancel this queued capture</button>
    </article>
  `).join('');

  queuedListEl.querySelectorAll<HTMLButtonElement>('.cancel-queue-item').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.dataset.id ?? '';
      if (!id) return;
      const cancelResponse = await chrome.runtime.sendMessage({ type: 'CANCEL_QUEUE_ITEM', id });
      setStatus(cancelResponse?.ok ? 'Queued capture canceled.' : `Cancel failed: ${cancelResponse?.error ?? 'Unknown error'}`);
      await refreshDiagnostics();
      await renderQueuedCaptures();
      await renderCaptureLogs();
    });
  });
}

async function runHealthCheck(): Promise<void> {
  healthStatusEl.textContent = 'Health: checking...';
  const response = await chrome.runtime.sendMessage({ type: 'HEALTH_CHECK' });
  healthStatusEl.textContent = response?.ok ? `Health: OK (${response?.status ?? ''})` : `Health: FAIL (${response?.error ?? response?.status ?? 'unknown'})`;
}

async function triggerCapture(): Promise<void> {
  setStatus('Capturing...');
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeUrl = activeTab?.url ?? '';
    if (!/^https?:\/\//i.test(activeUrl)) {
      const message = 'Open a regular website (http/https). chrome:// pages cannot be captured.';
      setStatus(message);
      await persistLastError(message);
      return;
    }

    const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_NOW' });
    setStatus(response?.ok ? `Capture queued. Pending: ${response.pendingUploads ?? 0}` : `Capture failed: ${response?.error ?? 'Unknown error'}`);
  } catch (error) {
    const message = `Capture failed: ${String(error)}`;
    setStatus(message);
    await persistLastError(message);
  } finally {
    await refreshDiagnostics();
  }
}

async function load(): Promise<void> {
  const settings = await getSettings();
  intervalSelect.value = String(millisecondsToMinutes(settings.autoModeIntervalMs));
  autoModeCheckbox.checked = settings.autoModeEnabled;
  updateIntervalState();
  metadataOnlyModeCheckbox.checked = settings.metadataOnlyMode;
  maxHtmlSizeBytesInput.value = String(settings.maxHtmlSizeBytes);
  includeImageCheckbox.checked = settings.includeImage;
  includePdfCheckbox.checked = settings.includePdf;
  includeHtmlCheckbox.checked = settings.includeHtml;
  includeSourceCodeCheckbox.checked = settings.includeSourceCode;
  const name = settings.authUsername || settings.authEmail || 'Guest';
  authGreetingEl.textContent = `Hello, ${name}`;
  authEmailEl.textContent = settings.authEmail || 'Not logged in';
  logoutBtn.disabled = !settings.authToken;
  await refreshDiagnostics();
  await renderCaptureLogs();
  await renderQueuedCaptures();
  await runHealthCheck();
}

saveBtn.addEventListener('click', async () => {
  try {
    const minutes = Number(intervalSelect.value);
    const maxHtmlSizeBytes = Number(maxHtmlSizeBytesInput.value);
    await setSettings({
      autoModeEnabled: autoModeCheckbox.checked,
      autoModeIntervalMs: Number.isFinite(minutes) ? minutes * 60000 : 15 * 60000,
      metadataOnlyMode: metadataOnlyModeCheckbox.checked,
      maxHtmlSizeBytes: Number.isFinite(maxHtmlSizeBytes) ? maxHtmlSizeBytes : 750000,
      includeImage: includeImageCheckbox.checked,
      includePdf: includePdfCheckbox.checked,
      includeHtml: includeHtmlCheckbox.checked,
      includeSourceCode: includeSourceCodeCheckbox.checked
    });
    setStatus('Saved.');
    await refreshDiagnostics();
  } catch (error) {
    setStatus(`Failed to save: ${String(error)}`);
  }
});

autoModeCheckbox.addEventListener('change', updateIntervalState);

captureBtn.addEventListener('click', () => { void triggerCapture(); });
retryBtn.addEventListener('click', async () => {
  const response = await chrome.runtime.sendMessage({ type: 'RETRY_PENDING_UPLOADS' });
  if (response?.ok) {
    setStatus('Retry started.');
  } else {
    const message = `Retry failed: ${response?.error ?? 'Unknown error'}`;
    setStatus(message);
    await persistLastError(message);
  }
  await refreshDiagnostics();
});

healthBtn.addEventListener('click', async () => {
  await runHealthCheck();
});

logsToggleBtn.addEventListener('click', async () => {
  logsPanelEl.classList.toggle('hidden');
  if (!logsPanelEl.classList.contains('hidden')) {
    await renderQueuedCaptures();
    await renderCaptureLogs();
  }
});

cancelAllQueuedBtn.addEventListener('click', async () => {
  const response = await chrome.runtime.sendMessage({ type: 'CANCEL_ALL_QUEUED' });
  setStatus(response?.ok ? `Canceled ${response.count ?? 0} queued captures.` : `Cancel all failed: ${response?.error ?? 'Unknown error'}`);
  await refreshDiagnostics();
  await renderQueuedCaptures();
  await renderCaptureLogs();
});

load().catch((error: unknown) => setStatus(`Failed to load settings: ${String(error)}`));

logoutBtn.addEventListener('click', async () => {
  try {
    await setSettings({ authToken: '', authEmail: '', authUsername: '' });
    await load();
    setStatus('Logged out.');
  } catch (error) {
    setStatus(`Logout failed: ${String(error)}`);
  }
});
