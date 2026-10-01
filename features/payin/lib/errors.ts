import { ApiClientError } from '@/lib/api/errors';

const PAYIN_ERROR_MESSAGES: Record<string, string> = {
  ORDER_EXPIRED: 'This payment order has expired.',
  VERIFICATION_PENDING: 'Payment verification is still in progress.',
  AMOUNT_MISMATCH: 'The detected payment amount does not match the order.',
  UTR_MISMATCH: 'The payment reference could not be matched.',
  RELEASE_NOT_ALLOWED: 'This payment cannot be released yet.',
  ALREADY_RELEASED: 'This payment has already been released.',
  DUPLICATE_RELEASE: 'This payment release request has already been processed.',
  DISPUTE_EXISTS: 'This order is currently under dispute.',
};

export function payinErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    const mapped = error.apiCode ? PAYIN_ERROR_MESSAGES[error.apiCode] : undefined;
    if (mapped) return mapped;
    return error.message || fallback;
  }
  return fallback;
}
