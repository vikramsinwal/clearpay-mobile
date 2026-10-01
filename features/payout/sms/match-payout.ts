import type { PaymentCandidate } from '@/features/payout/types';

export const SMS_MATCH_STATUSES = ['ACTION_REQUIRED', 'PAYMENT_IN_PROGRESS'] as const;

const TIME_SKEW_MS = 2 * 60 * 1000;

export type PayoutMatchTarget = {
  publicId: string;
  status: string;
  amountMinor: number;
  currency: string;
  createdAt: string;
  deadlineAt: string | null;
  accountLast4: string | null;
  provider: string | null;
  beneficiaryName: string | null;
  hasProof: boolean;
  knownReferences: string[];
};

export type LocalPayoutMatch = {
  kind: 'none' | 'ambiguous' | 'unique';
  order: PayoutMatchTarget | null;
  /** True only when every auto-submit condition that the device can check has passed. */
  localAutoEligible: boolean;
  reason: string;
};

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

function namesAgree(left: string, right: string): boolean {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (a.length < 3 || b.length < 3) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function normalizeProvider(value: string): string {
  return value.toUpperCase().replace(/BANK|LIMITED|LTD/g, '').replace(/[^A-Z]/g, '');
}

function providersAgree(left: string, right: string): boolean {
  const a = normalizeProvider(left);
  const b = normalizeProvider(right);
  if (a.length < 3 || b.length < 3) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function validReference(value: string | null): value is string {
  return Boolean(value && /^[A-Z0-9]{10,22}$/i.test(value));
}

function inWindow(candidate: PaymentCandidate, order: PayoutMatchTarget, nowMs: number): boolean {
  const smsMs = Date.parse(candidate.timestamp);
  const createdMs = Date.parse(order.createdAt);
  if (!Number.isFinite(smsMs) || !Number.isFinite(createdMs)) return false;
  if (smsMs < createdMs - TIME_SKEW_MS) return false;
  if (smsMs > nowMs + TIME_SKEW_MS) return false;
  if (!order.deadlineAt) return true;
  const deadlineMs = Date.parse(order.deadlineAt);
  if (!Number.isFinite(deadlineMs)) return false;
  return smsMs <= deadlineMs + TIME_SKEW_MS;
}

function orderExpired(order: PayoutMatchTarget, nowMs: number): boolean {
  if (order.status === 'EXPIRED') return true;
  if (!order.deadlineAt) return false;
  const deadlineMs = Date.parse(order.deadlineAt);
  return Number.isFinite(deadlineMs) && nowMs > deadlineMs;
}

type Compared = {
  order: PayoutMatchTarget;
  disqualify: string | null;
  corroborated: boolean;
  autoReady: boolean;
};

function compare(candidate: PaymentCandidate, order: PayoutMatchTarget, nowMs: number): Compared {
  if (orderExpired(order, nowMs)) {
    return { order, disqualify: 'expired_order', corroborated: false, autoReady: false };
  }
  if (!SMS_MATCH_STATUSES.includes(order.status as (typeof SMS_MATCH_STATUSES)[number])) {
    return { order, disqualify: 'inactive_order', corroborated: false, autoReady: false };
  }
  if (candidate.amountMinor !== order.amountMinor) {
    return { order, disqualify: 'amount_mismatch', corroborated: false, autoReady: false };
  }
  if (candidate.currency.toUpperCase() !== order.currency.toUpperCase()) {
    return { order, disqualify: 'currency_mismatch', corroborated: false, autoReady: false };
  }
  if (!inWindow(candidate, order, nowMs)) {
    return { order, disqualify: 'outside_time_window', corroborated: false, autoReady: false };
  }
  if (
    candidate.accountLast4 &&
    order.accountLast4 &&
    candidate.accountLast4 !== order.accountLast4
  ) {
    return { order, disqualify: 'account_mismatch', corroborated: false, autoReady: false };
  }
  if (
    candidate.beneficiaryName &&
    order.beneficiaryName &&
    !namesAgree(candidate.beneficiaryName, order.beneficiaryName)
  ) {
    return { order, disqualify: 'beneficiary_mismatch', corroborated: false, autoReady: false };
  }
  if (candidate.provider && order.provider && !providersAgree(candidate.provider, order.provider)) {
    return { order, disqualify: 'provider_mismatch', corroborated: false, autoReady: false };
  }

  const referenceOk = validReference(candidate.transactionReference);
  const duplicate = Boolean(
    referenceOk &&
      order.knownReferences.some(
        (item) => item.toUpperCase() === candidate.transactionReference?.toUpperCase(),
      ),
  );
  const accountOk = Boolean(candidate.accountLast4 && candidate.accountLast4 === order.accountLast4);
  const beneficiaryOk = Boolean(
    candidate.beneficiaryName &&
      order.beneficiaryName &&
      namesAgree(candidate.beneficiaryName, order.beneficiaryName),
  );
  const corroborated = referenceOk || accountOk || beneficiaryOk;
  if (!corroborated) {
    return { order, disqualify: 'amount_only', corroborated: false, autoReady: false };
  }
  if (duplicate) {
    return { order, disqualify: null, corroborated: true, autoReady: false };
  }

  const autoReady =
    candidate.verdict === 'MATCH_CANDIDATE' &&
    candidate.direction === 'DEBIT' &&
    candidate.transactionStatus === 'SUCCESS' &&
    candidate.confidence >= 0.75 &&
    referenceOk &&
    accountOk &&
    !order.hasProof;

  return { order, disqualify: null, corroborated: true, autoReady };
}

/**
 * Amount is never sufficient. Ambiguous overlaps stay manual.
 */
export function matchCandidateToPayouts(
  candidate: PaymentCandidate,
  orders: readonly PayoutMatchTarget[],
  nowMs: number,
): LocalPayoutMatch {
  const compared = orders.map((order) => compare(candidate, order, nowMs));
  const hits = compared.filter((item) => item.corroborated && !item.disqualify);
  if (hits.length === 0) {
    const reason = compared.find((item) => item.disqualify)?.disqualify ?? 'no_match';
    return { kind: 'none', order: null, localAutoEligible: false, reason };
  }
  if (hits.length > 1) {
    return { kind: 'ambiguous', order: null, localAutoEligible: false, reason: 'ambiguous_orders' };
  }
  const only = hits[0];
  if (!only) return { kind: 'none', order: null, localAutoEligible: false, reason: 'no_match' };
  return {
    kind: 'unique',
    order: only.order,
    localAutoEligible: only.autoReady,
    reason: only.autoReady ? 'local_auto_eligible' : 'needs_review',
  };
}
