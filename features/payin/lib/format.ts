/** Integer minor-unit display. No float money math. */

export function formatMoneyMinor(amountMinor: number, currency: string): string {
  const negative = amountMinor < 0;
  const abs = Math.abs(amountMinor);
  const major = Math.trunc(abs / 100);
  const fraction = String(abs % 100).padStart(2, '0');
  const grouped = major.toLocaleString('en-IN');
  const body = `${grouped}.${fraction}`;
  const sign = negative ? '-' : '';
  if (currency === 'INR') return `${sign}₹${body}`;
  return `${sign}${body} ${currency}`;
}

export function formatCommission(percentage: number): string {
  return `${percentage.toFixed(2)}%`;
}

export function maskPhone(phone: string): string {
  if (/[•*]/.test(phone)) return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return phone;
  const last4 = digits.slice(-4);
  const country = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)} ` : '';
  return `${country}••••• ${last4}`;
}

export function formatOrderTimestamp(iso: string, timeZone?: string | null): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const zone = timeZone?.trim();
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  };
  try {
    return new Intl.DateTimeFormat('en-GB', {
      ...options,
      timeZone: zone || undefined,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-GB', options).format(date);
  }
}

export function isHttpsUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}
