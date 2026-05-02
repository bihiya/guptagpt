import { getSettings, setSettings } from '../utils/storage.js';

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

async function refreshDiagnostics(): Promise<void> {
  const settings = await getSettings();
  pendingUploadsEl.textContent = `Pending uploads: ${settings.pendingUploads}`;
  lastSuccessAtEl.textContent = `Last success: ${settings.lastSuccessAt ? new Date(settings.lastSuccessAt).toLocaleString() : '—'}`;
  lastErrorEl.textContent = `Last error: ${settings.lastError || '—'}`;
}

async function runHealthCheck(): Promise<void> {
  const response = await chrome.runtime.sendMessage({ type: 'HEALTH_CHECK' });
  healthStatusEl.textContent = response?.ok ? `Health: OK (${response?.status ?? ''})` : `Health: FAIL (${response?.error ?? response?.status ?? 'unknown'})`;
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
  } catch (error) {
    setStatus(`Capture failed: ${String(error)}`);
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
  setStatus(response?.ok ? 'Retry started.' : `Retry failed: ${response?.error ?? 'Unknown error'}`);
  await refreshDiagnostics();
});

healthBtn.addEventListener('click', async () => {
  await runHealthCheck();
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
