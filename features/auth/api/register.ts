import { Platform } from 'react-native';

import { apiRequest } from '@/lib/api/client';
import type {
  CustomerAuthPayload,
  RegisterCustomerInput,
} from '@/features/auth/types';

function defaultDeviceLabel(): string {
  return `Clearpay Mobile (${Platform.OS})`;
}

/**
 * POST /api/v1/customer/auth/register
 * Contract: Clearpay backend docs/API_CUSTOMER_AUTH.md
 *
 * Required body: name, email, password (min 8 + uppercase + number/symbol).
 * Optional: phone, deviceLabel.
 */
export async function registerCustomer(
  input: RegisterCustomerInput,
): Promise<CustomerAuthPayload> {
  return apiRequest<CustomerAuthPayload>('/auth/register', {
    method: 'POST',
    body: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      ...(input.phone ? { phone: input.phone } : {}),
      deviceLabel: input.deviceLabel ?? defaultDeviceLabel(),
    },
  });
}
