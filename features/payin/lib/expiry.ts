import { PAYIN_EXPIRING_SOON_SECONDS } from '@/constants/payin';
import type { ExpiryPhase } from '@/features/payin/types';

export function serverSkewMs(serverTime: string, observedAtMs: number): number {
  const serverMs = Date.parse(serverTime);
  if (!Number.isFinite(serverMs)) return 0;
  return serverMs - observedAtMs;
}

export function remainingSeconds(
  expiresAt: string,
  deviceNowMs: number,
  skewMs: number,
): number {
  const expiresMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresMs)) return 0;
  const serverNow = deviceNowMs + skewMs;
  return Math.max(0, Math.floor((expiresMs - serverNow) / 1000));
}

export function expiryPhase(seconds: number, statusExpired: boolean): ExpiryPhase {
  if (statusExpired || seconds <= 0) return 'EXPIRED';
  if (seconds <= PAYIN_EXPIRING_SOON_SECONDS) return 'EXPIRING_SOON';
  return 'ACTIVE';
}

export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
