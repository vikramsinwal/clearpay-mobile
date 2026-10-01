import { ApiClientError } from '@/lib/api/errors';

import type { TelegramVerificationStatus } from '@/features/auth/types/telegram';

/** Safe, human-readable copy for Telegram verification failures. */
export function getSafeTelegramVerifyErrorMessage(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return 'Something went wrong. Please try again.';
  }

  const detailCode = extractDetailCode(error.details);
  const message = error.message;

  if (
    detailCode === 'TELEGRAM_NOT_STARTED' ||
    detailCode === 'VERIFICATION_NOT_STARTED' ||
    /not started|press start/i.test(message)
  ) {
    return 'Verification has not started. Open the Telegram bot and press Start, then try again.';
  }

  if (
    detailCode === 'TELEGRAM_PENDING' ||
    detailCode === 'VERIFICATION_PENDING' ||
    /pending/i.test(message)
  ) {
    return 'Telegram is still verifying. Wait a moment, then check again.';
  }

  if (
    detailCode === 'TELEGRAM_EXPIRED' ||
    detailCode === 'VERIFICATION_EXPIRED' ||
    /expired/i.test(message)
  ) {
    return 'This verification attempt expired. Open the bot again and press Start.';
  }

  if (
    detailCode === 'TELEGRAM_FAILED' ||
    detailCode === 'VERIFICATION_FAILED' ||
    /failed|rejected/i.test(message)
  ) {
    return 'Telegram verification failed. Open the bot, press Start, and try again.';
  }

  switch (error.code) {
    case 'VALIDATION_ERROR':
      return 'Enter a valid Telegram username and try again.';
    case 'UNAUTHORIZED':
      return 'Your session expired. Go back and continue registration, or sign in again.';
    case 'FORBIDDEN':
      return 'You cannot verify Telegram for this account right now.';
    case 'NOT_FOUND':
      return 'Telegram verification is not available yet. Please try again later.';
    case 'RATE_LIMITED':
      return 'Too many checks. Please wait a few minutes and try again.';
    case 'NETWORK_ERROR':
      return 'Unable to reach Clearpay. Check your connection and try again.';
    case 'SERVER_ERROR':
      return 'Something went wrong on our side. Please try again shortly.';
    default:
      return 'Unable to check Telegram verification right now. Please try again.';
  }
}

export function messageForVerificationStatus(
  status: TelegramVerificationStatus,
): string {
  switch (status) {
    case 'pending':
      return 'Telegram is still verifying. Wait a moment, then check again.';
    case 'not_started':
      return 'Verification has not started. Open the Telegram bot and press Start, then try again.';
    case 'failed':
      return 'Telegram verification failed. Open the bot, press Start, and try again.';
    case 'expired':
      return 'This verification attempt expired. Open the bot again and press Start.';
    case 'verified':
      return 'Telegram verified successfully.';
    default:
      return 'Unable to confirm Telegram verification yet.';
  }
}

function extractDetailCode(details: unknown): string | null {
  if (!details || typeof details !== 'object') {
    return null;
  }
  const record = details as Record<string, unknown>;
  if (typeof record.code === 'string') {
    return record.code;
  }
  if (typeof record.reason === 'string') {
    return record.reason;
  }
  return null;
}
