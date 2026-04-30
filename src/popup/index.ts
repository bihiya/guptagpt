import { getSettings, setSettings } from '../utils/storage.js';

const backendBaseUrlInput = document.getElementById('backendBaseUrl') as HTMLInputElement;
const intervalInput = document.getElementById('intervalMs') as HTMLInputElement;
const autoModeCheckbox = document.getElementById('autoModeEnabled') as HTMLInputElement;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const captureBtn = document.getElementById('captureBtn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;

function setStatus(message: string): void {
  statusEl.textContent = message;
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
    await setSettings({
      backendBaseUrl: backendBaseUrlInput.value.trim(),
      autoModeEnabled: autoModeCheckbox.checked,
      autoModeIntervalMs: Number.isFinite(interval) ? interval : 15000,
    });
    setStatus('Saved.');
  } catch (error) {
    setStatus(`Failed to save: ${String(error)}`);
  }
});

captureBtn.addEventListener('click', async () => {
  setStatus('Capturing...');
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeUrl = activeTab?.url ?? '';
    if (!/^https?:\/\//i.test(activeUrl)) {
      setStatus('Open a regular website (http/https). chrome:// pages cannot be captured.');
      return;
    }

    const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_NOW' });
    setStatus(response?.ok ? 'Capture sent.' : `Capture failed: ${response?.error ?? 'Unknown error'}`);
  } catch (error) {
    setStatus(`Capture failed: ${String(error)}`);
  }
});

load().catch((error: unknown) => setStatus(`Failed to load settings: ${String(error)}`));
