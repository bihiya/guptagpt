import { getSettings, setSettings } from '../utils/storage';

const backendBaseUrlInput = document.getElementById('backendBaseUrl') as HTMLInputElement;
const intervalInput = document.getElementById('intervalMs') as HTMLInputElement;
const autoModeCheckbox = document.getElementById('autoModeEnabled') as HTMLInputElement;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const captureBtn = document.getElementById('captureBtn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;

function setStatus(message: string, isError = false): void {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b91c1c' : '#166534';
}

async function load(): Promise<void> {
  const settings = await getSettings();
  backendBaseUrlInput.value = settings.backendBaseUrl;
  intervalInput.value = String(settings.autoModeIntervalMs);
  autoModeCheckbox.checked = settings.autoModeEnabled;
}

saveBtn.addEventListener('click', async () => {
  try {
    const interval = Number(intervalInput.value);
    const backendBaseUrl = backendBaseUrlInput.value.trim();
    new URL(backendBaseUrl);

    await setSettings({
      backendBaseUrl,
      autoModeEnabled: autoModeCheckbox.checked,
      autoModeIntervalMs: Number.isFinite(interval) ? Math.max(interval, 5000) : 15000
    });
    setStatus('Settings saved.');
  } catch (error) {
    setStatus(`Save failed: ${String(error)}`, true);
  }
});

captureBtn.addEventListener('click', async () => {
  try {
    setStatus('Capturing...');
    const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_NOW' });
    if (!response?.ok) throw new Error(response?.error ?? 'Unknown error');
    setStatus('Capture sent successfully.');
  } catch (error) {
    setStatus(`Capture failed: ${String(error)}`, true);
  }
});

void load().catch((error: unknown) => setStatus(`Load failed: ${String(error)}`, true));
