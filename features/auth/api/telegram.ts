import { apiRequest } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/errors';
import { getAccessToken } from '@/lib/auth/secure-tokens';

import type {
  TelegramVerifyRequest,
  TelegramVerifyResponse,
} from '@/features/auth/types/telegram';

/**
 * POST /api/v1/customer/auth/telegram/verify
 *
 * Not documented in Clearpay backend API_CUSTOMER_AUTH.md yet.
 * Calls the provisional path; callers must handle NOT_FOUND / network failure
 * without faking a verified outcome.
 */
export async function checkTelegramVerification(
  input: TelegramVerifyRequest,
): Promise<TelegramVerifyResponse> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new ApiClientError({
      code: 'UNAUTHORIZED',
      message: 'Your session expired. Go back and continue registration, or sign in again.',
      status: 401,
    });
  }

  return apiRequest<TelegramVerifyResponse>('/auth/telegram/verify', {
    method: 'POST',
    accessToken,
    body: {
      telegramUsername: input.telegramUsername,
    },
  });
}
