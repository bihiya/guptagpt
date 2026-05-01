import { getSettings, setSettings } from '../utils/storage.js';

const intervalInput = document.getElementById('intervalMs') as HTMLInputElement;
const autoModeCheckbox = document.getElementById('autoModeEnabled') as HTMLInputElement;
const metadataOnlyModeCheckbox = document.getElementById('metadataOnlyMode') as HTMLInputElement;
const maxHtmlSizeBytesInput = document.getElementById('maxHtmlSizeBytes') as HTMLInputElement;
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

function setStatus(message: string): void { statusEl.textContent = message; }

async function refreshDiagnostics(): Promise<void> {
  const settings = await getSettings();
  pendingUploadsEl.textContent = `Pending uploads: ${settings.pendingUploads}`;
  lastSuccessAtEl.textContent = `Last success: ${settings.lastSuccessAt || '—'}`;
  lastErrorEl.textContent = `Last error: ${settings.lastError || '—'}`;
}

async function triggerCapture(): Promise<void> {
  setStatus('Capturing...');
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeUrl = activeTab?.url ?? '';
    if (!/^https?:\/\//i.test(activeUrl)) {
      setStatus('Open a regular website (http/https). chrome:// pages cannot be captured.');
      return;
    }

    const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_NOW' });
    setStatus(response?.ok ? `Capture queued. Pending: ${response.pendingUploads ?? 0}` : `Capture failed: ${response?.error ?? 'Unknown error'}`);
    await refreshDiagnostics();
  } catch (error) {
    setStatus(`Capture failed: ${String(error)}`);
  }
}

async function load(): Promise<void> {
  const settings = await getSettings();
  intervalInput.value = String(settings.autoModeIntervalMs);
  autoModeCheckbox.checked = settings.autoModeEnabled;
  metadataOnlyModeCheckbox.checked = settings.metadataOnlyMode;
  maxHtmlSizeBytesInput.value = String(settings.maxHtmlSizeBytes);
  const name = settings.authUsername || settings.authEmail || 'Guest';
  authGreetingEl.textContent = `Hello, ${name}`;
  authEmailEl.textContent = settings.authEmail || 'Not logged in';
  logoutBtn.disabled = !settings.authToken;
  await refreshDiagnostics();
}

saveBtn.addEventListener('click', async () => {
  try {
    const interval = Number(intervalInput.value);
    const maxHtmlSizeBytes = Number(maxHtmlSizeBytesInput.value);
    await setSettings({
      autoModeEnabled: autoModeCheckbox.checked,
      autoModeIntervalMs: Number.isFinite(interval) ? interval : 15000,
      metadataOnlyMode: metadataOnlyModeCheckbox.checked,
      maxHtmlSizeBytes: Number.isFinite(maxHtmlSizeBytes) ? maxHtmlSizeBytes : 750000
    });
    setStatus('Saved.');
    await refreshDiagnostics();
  } catch (error) {
    setStatus(`Failed to save: ${String(error)}`);
  }
});

captureBtn.addEventListener('click', () => { void triggerCapture(); });
retryBtn.addEventListener('click', async () => {
  const response = await chrome.runtime.sendMessage({ type: 'RETRY_PENDING_UPLOADS' });
  setStatus(response?.ok ? 'Retry started.' : `Retry failed: ${response?.error ?? 'Unknown error'}`);
  await refreshDiagnostics();
});

healthBtn.addEventListener('click', async () => {
  const response = await chrome.runtime.sendMessage({ type: 'HEALTH_CHECK' });
  healthStatusEl.textContent = response?.ok ? `Health: OK (${response?.status ?? ''})` : `Health: FAIL (${response?.error ?? response?.status ?? 'unknown'})`;
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
