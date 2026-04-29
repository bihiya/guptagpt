import type { ExtensionSettings } from '../types/messages';
import { DEFAULT_SETTINGS, STORAGE_KEY } from './constants';

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  return {
    ...DEFAULT_SETTINGS,
    ...(stored[STORAGE_KEY] as Partial<ExtensionSettings> | undefined)
  };
}

export async function setSettings(settings: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getSettings();
  const next = { ...current, ...settings };
  await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  return next;
}
