import { secureDelete, secureGet, secureSet } from '../storage/secureStore';

/**
 * BYOK — each provider's API key is stored under its own Keychain entry.
 * Nothing is ever persisted to AsyncStorage, analytics, or logs.
 */

export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'groq';

export const PROVIDERS: { id: ProviderId; label: string; keyPattern: RegExp; docsUrl: string }[] = [
  { id: 'openai',    label: 'OpenAI',    keyPattern: /^sk-[A-Za-z0-9_\-]{20,}$/,         docsUrl: 'https://platform.openai.com/api-keys' },
  { id: 'anthropic', label: 'Anthropic', keyPattern: /^sk-ant-[A-Za-z0-9_\-]{20,}$/,     docsUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'gemini',    label: 'Gemini',    keyPattern: /^[A-Za-z0-9_\-]{20,}$/,            docsUrl: 'https://aistudio.google.com/app/apikey' },
  { id: 'groq',      label: 'Groq',      keyPattern: /^gsk_[A-Za-z0-9]{20,}$/,           docsUrl: 'https://console.groq.com/keys' },
];

function storageKey(provider: ProviderId): string {
  return `app.ai.key.${provider}`;
}

const SELECTED_KEY = 'app.ai.selectedProvider';

export async function getApiKey(provider: ProviderId): Promise<string | null> {
  return secureGet(storageKey(provider));
}

export async function setApiKey(provider: ProviderId, key: string): Promise<void> {
  await secureSet(storageKey(provider), key.trim());
}

export async function clearApiKey(provider: ProviderId): Promise<void> {
  await secureDelete(storageKey(provider));
}

export async function clearAllKeys(): Promise<void> {
  await Promise.all(PROVIDERS.map((p) => clearApiKey(p.id)));
  await secureDelete(SELECTED_KEY);
}

export async function getSelectedProvider(): Promise<ProviderId> {
  const stored = await secureGet(SELECTED_KEY);
  if (stored === 'openai' || stored === 'anthropic' || stored === 'gemini' || stored === 'groq') return stored;
  return 'openai';
}

export async function setSelectedProvider(provider: ProviderId): Promise<void> {
  await secureSet(SELECTED_KEY, provider);
}

/**
 * Cheap sanity check before we let the user save. We do NOT hit the network
 * here — that's done by the provider's `ping()` method in Settings.
 */
export function validateKeyShape(provider: ProviderId, key: string): boolean {
  const p = PROVIDERS.find((x) => x.id === provider);
  return !!p && p.keyPattern.test(key.trim());
}
