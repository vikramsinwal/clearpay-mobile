import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { SECURE_STORE_KEYS } from '@/constants/app';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

/**
 * Native: expo-secure-store (Keychain / Keystore).
 * Web: localStorage fallback — SecureStore has no web implementation
 * (`ExpoSecureStore.web` is empty), so setItemAsync throws and sign-in fails
 * with a generic error after a successful API login.
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
    throw new Error('Token storage is unavailable in this browser.');
  }
  localStorage.setItem(key, value);
}

function webDelete(key: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.removeItem(key);
}

export async function saveAuthTokens(tokens: AuthTokens): Promise<void> {
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(
      SECURE_STORE_KEYS.accessToken,
      tokens.accessToken,
    );
    await SecureStore.setItemAsync(
      SECURE_STORE_KEYS.refreshToken,
      tokens.refreshToken,
    );
    return;
  }

  webSet(SECURE_STORE_KEYS.accessToken, tokens.accessToken);
  webSet(SECURE_STORE_KEYS.refreshToken, tokens.refreshToken);
}

export async function getAccessToken(): Promise<string | null> {
  if (await canUseSecureStore()) {
    return SecureStore.getItemAsync(SECURE_STORE_KEYS.accessToken);
  }
  return webGet(SECURE_STORE_KEYS.accessToken);
}

export async function getRefreshToken(): Promise<string | null> {
  if (await canUseSecureStore()) {
    return SecureStore.getItemAsync(SECURE_STORE_KEYS.refreshToken);
  }
  return webGet(SECURE_STORE_KEYS.refreshToken);
}

export async function clearAuthTokens(): Promise<void> {
  if (await canUseSecureStore()) {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.accessToken);
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.refreshToken);
    return;
  }

  webDelete(SECURE_STORE_KEYS.accessToken);
  webDelete(SECURE_STORE_KEYS.refreshToken);
}
