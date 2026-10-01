import { splitPhone } from '@/features/profile/schemas/profile-schema';

export function statusTone(
  status: string,
): 'success' | 'warning' | 'danger' | 'neutral' {
  const key = status.trim().toUpperCase();
  if (key === 'ACTIVE') return 'success';
  if (key === 'LOCKED' || key === 'SUSPENDED' || key === 'DISABLED' || key === 'BLOCKED') {
    return 'danger';
  }
  if (key.includes('PENDING') || key.includes('REVIEW')) return 'warning';
  return 'neutral';
}

/** Display-only conversion of a backend millisecond average. */
export function formatDurationMs(ms: number | null): string {
  if (ms == null) return '—';
  const minutes = ms / 60_000;
  if (minutes >= 1) return `${minutes.toFixed(2)}m`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Basis points to a percent label. 175 → 1.75%. */
export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export function formatFeeSource(source: string): string {
  if (source === 'customer') return 'Set on your account';
  if (source === 'platform') return 'Platform schedule';
  return source;
}

export function formatPhoneDisplay(phone: string | null | undefined): string {
  const { countryCode, nationalNumber } = splitPhone(phone);
  if (!nationalNumber) return '';
  if (nationalNumber.length === 10) {
    return `${countryCode} ${nationalNumber.slice(0, 5)} ${nationalNumber.slice(5)}`;
  }
  return `${countryCode} ${nationalNumber}`;
}

export function formatUpdatedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
}

export function metricBarColor(progress: number): string {
  if (progress >= 85) return '#16A34A';
  if (progress >= 60) return '#84CC16';
  if (progress >= 40) return '#F59E0B';
  return '#F97316';
}

export function parseTimeToDate(hhmm: string): Date {
  const [hourPart, minutePart] = hhmm.split(':');
  const hours = Number(hourPart);
  const minutes = Number(minutePart);
  const date = new Date();
  date.setHours(
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0,
  );
  return date;
}

export function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
