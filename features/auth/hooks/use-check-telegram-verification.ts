import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { checkTelegramVerification } from '@/features/auth/api/telegram';
import {
  getSafeTelegramVerifyErrorMessage,
  messageForVerificationStatus,
} from '@/features/auth/lib/telegram-errors';
import type { TelegramVerifyResponse } from '@/features/auth/types/telegram';
import {
  getAccessToken,
  getRefreshToken,
  saveAuthTokens,
} from '@/lib/auth/secure-tokens';
import { useAuthStore } from '@/stores/auth-store';

type UseCheckTelegramVerificationOptions = {
  onStatusMessage?: (message: string) => void;
  onFormError?: (message: string) => void;
};

/**
 * Checks Telegram verification against the Clearpay API.
 * Does not fake success when the endpoint is missing or returns non-verified.
 */
export function useCheckTelegramVerification(
  options: UseCheckTelegramVerificationOptions = {},
) {
  const setSession = useAuthStore((state) => state.setSession);
  const restoreSession = useAuthStore((state) => state.restoreSession);

  return useMutation({
    mutationKey: ['auth', 'telegram', 'verify'],
    mutationFn: async (telegramUsername: string) => {
      return checkTelegramVerification({ telegramUsername });
    },
    onSuccess: async (payload: TelegramVerifyResponse) => {
      if (payload.status !== 'verified') {
        options.onStatusMessage?.(messageForVerificationStatus(payload.status));
        return;
      }

      if (payload.tokens?.accessToken && payload.tokens.refreshToken) {
        await saveAuthTokens({
          accessToken: payload.tokens.accessToken,
          refreshToken: payload.tokens.refreshToken,
        });
      }

      if (payload.customer) {
        setSession(payload.customer);
      } else {
        const [accessToken, refreshToken] = await Promise.all([
          getAccessToken(),
          getRefreshToken(),
        ]);
        if (accessToken && refreshToken) {
          restoreSession();
        }
      }

      options.onStatusMessage?.(messageForVerificationStatus('verified'));

      // Only continue when the backend confirmed verification.
      // Session may already exist from Step 1 register — do not invent tokens.
      const [accessToken, refreshToken] = await Promise.all([
        getAccessToken(),
        getRefreshToken(),
      ]);
      if (accessToken && refreshToken) {
        router.replace('/');
        return;
      }

      router.replace('/sign-in');
    },
    onError: (error) => {
      options.onFormError?.(getSafeTelegramVerifyErrorMessage(error));
    },
  });
}
