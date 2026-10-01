import { ApiClientError } from '@/lib/api/errors';

/** Safe sign-in copy — never surface raw server payloads. */
export function getSignInErrorMessage(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    if (
      error instanceof Error &&
      /token storage|SecureStore|localStorage/i.test(error.message)
    ) {
      return 'Could not save your session on this device. Please try again.';
    }
    return 'Unable to sign in right now. Please try again.';
  }

  switch (error.code) {
    case 'VALIDATION_ERROR':
      return 'Please check your email and password and try again.';
    case 'UNAUTHORIZED':
      return 'Invalid email or password.';
    case 'FORBIDDEN':
      return 'This account is disabled and cannot sign in. Contact support if you need help.';
    case 'NOT_FOUND':
      return 'We could not find an account with those details.';
    case 'RATE_LIMITED':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'Unable to connect to the server. Please try again.';
    case 'INVALID_RESPONSE':
      return 'Unable to sign in right now. Please try again.';
    case 'SERVER_ERROR':
      return 'Something went wrong on our side. Please try again.';
    default:
      return 'Unable to sign in right now. Please try again.';
  }
}
