import { ApiClientError } from '@/lib/api/errors';

/** Safe registration copy — never surface raw server payloads or passwords. */
export function getRegisterErrorMessage(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return 'Unable to create your account right now. Please try again.';
  }

  switch (error.code) {
    case 'CONFLICT':
      return 'An account with this email already exists. Try signing in instead.';
    case 'VALIDATION_ERROR':
      return 'Please check your details and try again.';
    case 'RATE_LIMITED':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'NETWORK_ERROR':
      return 'Unable to reach Clearpay. Check your connection and try again.';
    case 'SERVER_ERROR':
      return 'Something went wrong on our side. Please try again shortly.';
    case 'FORBIDDEN':
      return 'You cannot create an account right now.';
    default:
      return 'Unable to create your account right now. Please try again.';
  }
}
