import { unregisterCurrentPushDevice } from '@/features/payout/api/payout-orders-api';
import { apiRequest } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/errors';
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
} from '@/lib/auth/secure-tokens';
import type {
  PublicCustomer,
  UpdateCustomerProfileInput,
} from '@/features/auth/types';

type MeResponse = {
  customer: PublicCustomer;
};

type LogoutResponse = {
  revoked: boolean;
};

async function requireAccessToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new ApiClientError({
      code: 'UNAUTHORIZED',
      message: 'Your session expired. Please sign in again.',
      status: 401,
    });
  }
  return token;
}

/** GET /api/v1/customer/me */
export async function fetchCustomerMe(): Promise<PublicCustomer> {
  const accessToken = await requireAccessToken();
  const data = await apiRequest<MeResponse>('/me', {
    method: 'GET',
    accessToken,
  });
  return data.customer;
}

/**
 * PATCH /api/v1/customer/me
 * Identity from Bearer only — never send customerId.
 */
export async function updateCustomerProfile(
  input: UpdateCustomerProfileInput,
): Promise<PublicCustomer> {
  const accessToken = await requireAccessToken();
  const body: Record<string, unknown> = {};

  if (input.name !== undefined) {
    body.name = input.name;
  }
  if (input.phone !== undefined) {
    body.phone = input.phone;
  }
  if (input.profile !== undefined) {
    body.profile = input.profile;
  }
  if (input.preferences !== undefined) {
    body.preferences = input.preferences;
  }

  const data = await apiRequest<MeResponse>('/me', {
    method: 'PATCH',
    accessToken,
    body,
  });
  return data.customer;
}

/** POST /api/v1/customer/auth/logout */
export async function logoutCustomer(): Promise<void> {
  const [accessToken, refreshToken] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
  ]);

  try {
    await unregisterCurrentPushDevice();
  } catch {
    // Device unregister is best-effort. Logout still clears the session.
  }

  try {
    if (accessToken) {
      await apiRequest<LogoutResponse>('/auth/logout', {
        method: 'POST',
        accessToken,
        body: {},
      });
    } else if (refreshToken) {
      await apiRequest<LogoutResponse>('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
      });
    }
  } finally {
    await clearAuthTokens();
  }
}
