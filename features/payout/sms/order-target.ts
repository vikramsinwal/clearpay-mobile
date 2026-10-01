import type { PayoutMatchTarget } from '@/features/payout/sms/match-payout';
import type { PayoutOrderDetail } from '@/features/payout/types';

/** Order amounts are already integer paise. */
export function toAmountMinor(amount: number, currency: string): number {
  if (currency.toUpperCase() !== 'INR' || !Number.isInteger(amount) || amount < 0) return -1;
  return amount;
}

function last4(account: string | null): string | null {
  if (!account) return null;
  const digits = account.replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function providerToken(bank: string | null): string | null {
  if (!bank) return null;
  const token = bank.split(/[,\s]+/).find((part) => part.length >= 3);
  return token ? token.toUpperCase() : null;
}

export function matchTargetFromDetail(order: PayoutOrderDetail): PayoutMatchTarget {
  const receiptStatus = order.receipt?.status;
  const hasReceipt = Boolean(receiptStatus && receiptStatus !== 'NONE' && receiptStatus !== 'FAILED');
  const reference = order.reference.value?.trim() ?? '';
  return {
    publicId: order.publicId,
    status: order.status,
    amountMinor: toAmountMinor(order.amount, order.currency),
    currency: order.currency,
    createdAt: order.createdAt,
    deadlineAt: order.sla.deadlineAt ?? order.deadlineAt,
    accountLast4: last4(order.beneficiary?.accountNumber ?? null),
    provider: providerToken(order.beneficiary?.bankAndBranch ?? null),
    beneficiaryName: order.beneficiary?.name ?? null,
    hasProof: hasReceipt || reference.length > 0,
    knownReferences: reference ? [reference] : [],
  };
}
