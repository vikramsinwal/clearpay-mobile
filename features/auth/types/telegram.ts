/**
 * Telegram verification DTOs.
 *
 * BACKEND DEPENDENCY (missing):
 * Clearpay `docs/API_CUSTOMER_AUTH.md` does not yet document a Telegram
 * verification route. This client targets a provisional contract so the mobile
 * screen can call a real endpoint without inventing a successful response.
 *
 * Provisional endpoint:
 *   POST /api/v1/customer/auth/telegram/verify
 * Auth: Bearer customer access token (issued after Step 1 register/login)
 * Body: { telegramUsername: string }
 *
 * Do not treat HTTP success without an explicit verified status as login.
 */

import type {
  CustomerAuthTokens,
  PublicCustomer,
} from '@/features/auth/types';

export type TelegramVerificationStatus =
  | 'verified'
  | 'pending'
  | 'not_started'
  | 'failed'
  | 'expired';

export type TelegramVerifyRequest = {
  telegramUsername: string;
};

export type TelegramVerifyResponse = {
  status: TelegramVerificationStatus;
  telegramUsername?: string;
  customer?: PublicCustomer;
  tokens?: CustomerAuthTokens;
  message?: string;
};
