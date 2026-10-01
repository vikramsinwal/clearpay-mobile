import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { SECURE_STORE_KEYS } from '@/constants/app';

/**
 * Persist the active deposit session public id (`deps_…`) so proof submit
 * can recover after web Fast Refresh / remount (Zustand alone is wiped).
 * Public id is not a secret — same storage split as auth tokens (SecureStore
 * native, localStorage web).
 */

async function canUseSecureStore(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

function webGet(key: string): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  return localStorage.getItem(key);
}

function webSet(key: string, value: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(key, value);
}

function webDelete(key: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.removeItem(key);
}

export async function persistDepositSessionPublicId(
  sessionPublicId: string | null,
): Promise<void> {
  const key = SECURE_STORE_KEYS.depositSessionPublicId;
  const trimmed = sessionPublicId?.trim() || null;

  if (await canUseSecureStore()) {
    if (trimmed) {
      await SecureStore.setItemAsync(key, trimmed);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
    return;
  }

  if (trimmed) {
    webSet(key, trimmed);
  } else {
    webDelete(key);
  }
}

export async function readDepositSessionPublicId(): Promise<string | null> {
  const key = SECURE_STORE_KEYS.depositSessionPublicId;

  if (await canUseSecureStore()) {
    const value = await SecureStore.getItemAsync(key);
    return value?.trim() || null;
  }

  return webGet(key)?.trim() || null;
}
