/**
 * Format integer minor units for display. Never use floats for money math.
 */
export function formatAmountMinor(
  amountMinor: number,
  currency = 'INR',
): string {
  const major = amountMinor / 100;
  const formatted = major.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (currency === 'INR') {
    return `${formatted} ₹`;
  }
  if (currency === 'USD' || currency === 'USDT') {
    return `${formatted} $`;
  }
  return `${formatted} ${currency}`;
}

/** `USDT 2,000.00`. The amount is already a major-unit USDT balance. */
export function formatUsdtAmount(amount: number, currency = 'USDT'): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

export function successRatePercent(
  successful: number,
  total: number,
): number {
  if (total <= 0) return 0;
  return Math.round((successful / total) * 100);
}

export function displayName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return 'Trader';
  const first = trimmed.split(/\s+/).find(Boolean);
  return first ?? trimmed;
}

/** `21.09.2026, 15:40:23` in the device local timezone. */
export function formatNotificationTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function notificationText(item: {
  title?: string | null;
  body?: string | null;
  message?: string | null;
}): string {
  const parts = [item.title, item.body ?? item.message]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.join(' — ') || 'Notification';
}
