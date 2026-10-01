import { ApiClientError } from '@/lib/api/errors';

const PAYOUT_ERROR_COPY: Record<string, string> = {
  PAYOUT_EXPIRED: 'This payout has expired.',
  PAYOUT_NOT_ACTIONABLE: 'This payout can no longer be actioned.',
  BENEFICIARY_CHANGED: 'The beneficiary details changed. Review the order again.',
  PAYMENT_ALREADY_SUBMITTED: 'Payment proof was already submitted for this payout.',
  DUPLICATE_UTR: 'This UTR was already used.',
  INVALID_UTR: 'The transaction reference is not valid.',
  PROOF_REQUIRED: 'A transfer receipt is required.',
  PROOF_INVALID: 'The receipt could not be verified.',
  AMOUNT_MISMATCH: 'The payment amount does not match this payout.',
  PAYMENT_NOT_FOUND: 'The payment could not be found.',
  ACCOUNT_NOT_ELIGIBLE: 'This account cannot complete the payout.',
};

export function payoutErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiClientError)) return fallback;
  const mapped = error.apiCode ? PAYOUT_ERROR_COPY[error.apiCode] : undefined;
  if (mapped) return mapped;
  return error.message || fallback;
}
