export function serverSkewMs(serverTime: string, observedAtMs: number): number {
  const serverMs = Date.parse(serverTime);
  if (!Number.isFinite(serverMs)) return 0;
  return serverMs - observedAtMs;
}

export function remainingSeconds(
  deadlineAt: string | null,
  deviceNowMs: number,
  skewMs: number,
): number | null {
  if (!deadlineAt) return null;
  const deadlineMs = Date.parse(deadlineAt);
  if (!Number.isFinite(deadlineMs)) return null;
  const serverNow = deviceNowMs + skewMs;
  return Math.max(0, Math.floor((deadlineMs - serverNow) / 1000));
}

export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatFileSize(bytes: number | null): string {
  if (bytes == null || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export function formatCreated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase());
  return letters.join('') || '•';
}

const SAFE_PATTERN = /^\^?[A-Za-z0-9[\](){}+*?.\\|,_-]{1,80}\$?$/;

export function referenceIsValid(value: string, rule: {
  required: boolean;
  pattern: string | null;
  length: number | null;
}): boolean {
  const trimmed = value.trim();
  if (!rule.required && trimmed.length === 0) return true;
  if (trimmed.length === 0) return false;
  if (rule.pattern && SAFE_PATTERN.test(rule.pattern)) {
    try {
      return new RegExp(rule.pattern).test(trimmed);
    } catch {
      return trimmed.length > 0;
    }
  }
  if (rule.length != null && rule.length > 0) return trimmed.length === rule.length;
  return true;
}

/** `amountMinor` is paise for INR. `150000` renders as ₹1,500.00. */
export function formatPayoutAmount(amountMinor: number, currency: string): string {
  if (!Number.isSafeInteger(amountMinor)) return '—';
  const sign = amountMinor < 0 ? '-' : '';
  const abs = Math.abs(amountMinor);
  const major = Math.trunc(abs / 100).toLocaleString('en-IN');
  const fraction = String(abs % 100).padStart(2, '0');
  if (currency === 'INR') return `${sign}₹${major}.${fraction}`;
  return `${sign}${major}.${fraction} ${currency}`;
}

export function parseAmountInput(input: string): number | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  if (!/^\d{1,12}$/.test(trimmed)) return undefined;
  const whole = Number(trimmed);
  if (!Number.isSafeInteger(whole)) return undefined;
  return whole;
}
