import { Platform } from 'react-native';

import { apiRequest } from '@/lib/api/client';
import {
  assertConfirmedLoginPayload,
  LOGIN_REQUEST_TIMEOUT_MS,
} from '@/features/auth/lib/login-session';
import type {
  CustomerAuthPayload,
  CustomerLoginInput,
} from '@/features/auth/types';

function defaultDeviceLabel(): string {
  return `Clearpay Mobile (${Platform.OS})`;
}

/**
 * POST /api/v1/customer/auth/login
 * Contract: Clearpay backend docs/API_CUSTOMER_AUTH.md
 */
export async function loginCustomer(
  input: CustomerLoginInput,
): Promise<CustomerAuthPayload> {
  const data = await apiRequest<unknown>('/auth/login', {
    method: 'POST',
    timeoutMs: LOGIN_REQUEST_TIMEOUT_MS,
    body: {
      email: input.email.trim().toLowerCase(),
      password: input.password,
      deviceLabel: input.deviceLabel ?? defaultDeviceLabel(),
    },
  });
  return assertConfirmedLoginPayload(data);
}
