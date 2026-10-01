import type {
  ConnectivityStatus,
  ReceivingAccount,
} from '@/features/accounts/types';

const CONNECTIVITY_LABEL: Record<ConnectivityStatus, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  connecting: 'Connecting',
  error: 'Error',
};

export function connectivityLabel(status: ConnectivityStatus): string {
  return CONNECTIVITY_LABEL[status];
}

/** Display-only conversion of integer minor units. */
export function formatInrMinor(amountMinor: number | null, currency = 'INR'): string {
  if (amountMinor == null) return '—';
  const major = amountMinor / 100;
  const formatted = major.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (currency === 'INR') return `₹ ${formatted}`;
  return `${formatted} ${currency}`;
}

export function formatTransactionUsage(account: ReceivingAccount): string {
  const used =
    account.acceptedTransactionCount == null
      ? '—'
      : String(account.acceptedTransactionCount);
  if (account.transactionLimit == null) return used;
  return `${used} · ${formatInrMinor(account.transactionLimit, account.currency)} limit`;
}

/**
 * Shows the backend percent. The ratio is displayed only when both counts
 * are present. The client never divides those counts.
 */
export function formatConversion(account: ReceivingAccount): string {
  const percent = account.conversionPercent;
  if (percent == null || !Number.isFinite(percent)) return '—';
  const shown = percent;
  const text = Number.isInteger(shown) ? `${shown}%` : `${shown.toFixed(2)}%`;
  const successful = account.conversionSuccessful;
  const eligible = account.conversionEligible;
  if (typeof successful === 'number' && typeof eligible === 'number') {
    return `${text} (${successful} / ${eligible})`;
  }
  return text;
}

export function providerInitials(account: ReceivingAccount): string {
  const code = account.providerCode.trim();
  if (code.length > 0) return code.slice(0, 3).toUpperCase();
  const words = account.provider.trim().split(/\s+/).filter(Boolean);
  const letters = words.map((word) => word[0] ?? '').join('');
  return (letters || account.name.slice(0, 2) || 'AC').slice(0, 3).toUpperCase();
}

export function clampPercent(value: number | null): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}
