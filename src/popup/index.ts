import { getSettings, setSettings } from '../utils/storage.js';

const intervalInput = document.getElementById('intervalMs') as HTMLInputElement;
const popupCaptureShortcutInput = document.getElementById('popupCaptureShortcut') as HTMLInputElement;
const autoModeCheckbox = document.getElementById('autoModeEnabled') as HTMLInputElement;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const captureBtn = document.getElementById('captureBtn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;
const authGreetingEl = document.getElementById('authGreeting') as HTMLParagraphElement;
const authEmailEl = document.getElementById('authEmail') as HTMLParagraphElement;
const logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement;
const loginBtn = document.getElementById('loginBtn') as HTMLButtonElement;

const LOGIN_URL = 'https://guptagpt-frontend.vercel.app/login';

function setStatus(message: string): void {
  statusEl.textContent = message;
}

function normalizeShortcut(shortcut: string): string {
  return shortcut
    .trim()
    .replace(/\s+/g, '')
    .split('+')
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === 'control') return 'ctrl';
      if (lower === 'cmd' || lower === 'command') return 'meta';
      if (lower === 'option') return 'alt';
      return lower;
    })
    .join('+');
}

function eventToShortcut(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push('ctrl');
  if (event.metaKey) parts.push('meta');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  parts.push(event.key.toLowerCase());
  return parts.join('+');
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
    setStatus(response?.ok ? 'Capture sent.' : `Capture failed: ${response?.error ?? 'Unknown error'}`);
  } catch (error) {
    setStatus(`Capture failed: ${String(error)}`);
  }
}

async function load(): Promise<void> {
  const settings = await getSettings();
  intervalInput.value = String(settings.autoModeIntervalMs);
  popupCaptureShortcutInput.value = settings.popupCaptureShortcut;
  autoModeCheckbox.checked = settings.autoModeEnabled;
  const name = settings.authUsername || settings.authEmail || 'Guest';
  authGreetingEl.textContent = `Hello, ${name}`;
  authEmailEl.textContent = settings.authEmail || 'Not logged in';
  const isLoggedIn = Boolean(settings.authToken);
  logoutBtn.disabled = !isLoggedIn;
  loginBtn.disabled = isLoggedIn;
}

saveBtn.addEventListener('click', async () => {
  try {
    const interval = Number(intervalInput.value);
    await setSettings({
      autoModeEnabled: autoModeCheckbox.checked,
      autoModeIntervalMs: Number.isFinite(interval) ? interval : 15000,
      popupCaptureShortcut: popupCaptureShortcutInput.value.trim(),
    });
    setStatus('Saved.');
  } catch (error) {
    setStatus(`Failed to save: ${String(error)}`);
  }
});

captureBtn.addEventListener('click', () => {
  void triggerCapture();
});

document.addEventListener('keydown', async (event) => {
  const target = event.target as HTMLElement | null;
  if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') {
    return;
  }

  const settings = await getSettings();
  const configured = normalizeShortcut(settings.popupCaptureShortcut);
  if (!configured) return;

  if (eventToShortcut(event) === configured) {
    event.preventDefault();
    void triggerCapture();
  }
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


loginBtn.addEventListener('click', async () => {
  const url = `${LOGIN_URL}?extensionId=${encodeURIComponent(chrome.runtime.id)}`;
  await chrome.tabs.create({ url });
  window.close();
});
