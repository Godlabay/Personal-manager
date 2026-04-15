import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Thin wrapper around expo-secure-store that degrades gracefully on web
 * (SecureStore is a no-op on web) by falling back to a memory map.
 *
 * iOS  : Keychain (kSecAttrAccessibleAfterFirstUnlock by default)
 * Android : Android Keystore
 * Web  : in-memory only (never persisted — user would lose session on reload)
 */

const memoryFallback = new Map<string, string>();

function useMemory(): boolean {
  return Platform.OS === 'web';
}

export async function secureGet(key: string): Promise<string | null> {
  if (useMemory()) return memoryFallback.get(key) ?? null;
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (useMemory()) {
    memoryFallback.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

export async function secureDelete(key: string): Promise<void> {
  if (useMemory()) {
    memoryFallback.delete(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore — key may not exist
  }
}

/**
 * Adapter that matches Supabase's `Storage` interface so session tokens live
 * in the Keychain rather than AsyncStorage / localStorage.
 */
export const supabaseSecureStorage = {
  async getItem(key: string): Promise<string | null> {
    return secureGet(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    return secureSet(key, value);
  },
  async removeItem(key: string): Promise<void> {
    return secureDelete(key);
  },
};
