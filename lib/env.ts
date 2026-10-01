import Constants from 'expo-constants';

/**
 * Public client configuration only. Never place secrets in EXPO_PUBLIC_* vars.
 * Release Gradle bundles often omit .env, so the public API host is the fallback.
 */
const PUBLIC_API_BASE_URL = 'https://clearpay-iota.vercel.app';

export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv && !fromEnv.includes('example.com')) {
    return fromEnv.replace(/\/$/, '');
  }

  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  const fromExtra = extra?.apiBaseUrl?.trim();
  if (fromExtra && !fromExtra.includes('example.com')) {
    return fromExtra.replace(/\/$/, '');
  }

  return PUBLIC_API_BASE_URL;
}

export function getApiVersion(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_VERSION?.trim();
  if (fromEnv) return fromEnv;
  const extra = Constants.expoConfig?.extra as { apiVersion?: string } | undefined;
  return extra?.apiVersion?.trim() || 'v1';
}

export function getCustomerApiRoot(): string {
  return `${getApiBaseUrl()}/api/${getApiVersion()}/customer`;
}

/**
 * Public Telegram bot deep link / https URL for "Open Telegram Bot".
 * Must be set via EXPO_PUBLIC_TELEGRAM_BOT_URL — never hardcode a production bot.
 * Returns null when unset so callers can show a controlled configuration error.
 */
export function getTelegramBotUrl(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_TELEGRAM_BOT_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const extra = Constants.expoConfig?.extra as
    | { telegramBotUrl?: string }
    | undefined;
  const fromExtra = extra?.telegramBotUrl?.trim();
  return fromExtra || null;
}
