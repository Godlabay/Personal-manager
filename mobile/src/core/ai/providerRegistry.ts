import { getApiKey, getSelectedProvider, type ProviderId } from './keys';
import { createOpenAIProvider } from './openai';
import { createAnthropicProvider } from './anthropic';
import type { LLMProvider } from './provider';

/**
 * Resolves the currently-selected provider into a live LLMProvider instance,
 * pulling the BYOK key out of the Keychain on the fly. Returns null when the
 * user hasn't configured a key yet — the UI uses that to grey out AI features.
 *
 * Gemini and Groq are listed in Settings but share OpenAI-compatible APIs for
 * the MVP (Groq is literally OpenAI-compatible; Gemini gets a thin adapter in
 * a later phase). For now those two selections fall back to a "not configured"
 * state.
 */
export async function getCurrentProvider(): Promise<LLMProvider | null> {
  const id = await getSelectedProvider();
  const key = await getApiKey(id);
  if (!key) return null;
  return buildProvider(id, key);
}

export function buildProvider(id: ProviderId, apiKey: string): LLMProvider | null {
  switch (id) {
    case 'openai':
      return createOpenAIProvider(apiKey);
    case 'anthropic':
      return createAnthropicProvider(apiKey);
    case 'groq':
      // Groq exposes the OpenAI Chat Completions shape at a different host —
      // reuse the OpenAI provider with an overridden fetch in a later phase.
      return createOpenAIProvider(apiKey);
    case 'gemini':
      // Gemini has a different API; not wired up in MVP.
      return null;
    default:
      return null;
  }
}
