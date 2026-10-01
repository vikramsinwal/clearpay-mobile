import type { AccountKind, AccountProviderOption } from '@/features/accounts/types';

/** Provider capabilities are fixed by the customer accounts API. */
export const ACCOUNT_PROVIDERS: readonly AccountProviderOption[] = [
  { id: 'PHONEPE', label: 'PhonePe', kind: 'upi_bank', payin: true, payout: true },
  { id: 'PAYTM', label: 'Paytm', kind: 'upi_bank', payin: true, payout: true },
  { id: 'GOOGLE_PAY', label: 'Google Pay', kind: 'upi_bank', payin: true, payout: false },
  { id: 'BHIM', label: 'BHIM', kind: 'upi_bank', payin: true, payout: false },
  { id: 'BANK_UPI', label: 'Bank UPI', kind: 'upi_bank', payin: true, payout: true },
  { id: 'RAZORPAY', label: 'Razorpay', kind: 'gateway', payin: true, payout: true },
  { id: 'CASHFREE', label: 'Cashfree', kind: 'gateway', payin: true, payout: true },
  { id: 'PAYU', label: 'PayU', kind: 'gateway', payin: true, payout: false },
];

const BY_ID = new Map(ACCOUNT_PROVIDERS.map((provider) => [provider.id, provider]));

export function accountProvidersFor(kind: AccountKind): AccountProviderOption[] {
  return ACCOUNT_PROVIDERS.filter((provider) => provider.kind === kind);
}

export function providerLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id;
}

export function providerMatchesKind(id: string, kind: AccountKind): boolean {
  return BY_ID.get(id)?.kind === kind;
}

/** Null when the provider is unknown. Catalog support is fixed per provider. */
export function providerSupports(
  id: string,
  channel: 'payin' | 'payout',
): boolean | null {
  const provider = BY_ID.get(id);
  if (!provider) return null;
  return channel === 'payin' ? provider.payin : provider.payout;
}
