import { useMutation } from '@tanstack/react-query';
import { Platform } from 'react-native';

import { registerCustomer } from '@/features/auth/api/register';
import type { RegisterCustomerInput } from '@/features/auth/types';

function defaultDeviceLabel(): string {
  return `Clearpay Mobile (${Platform.OS})`;
}

/**
 * Registers the customer via POST /auth/register.
 * Does not persist tokens — the customer signs in on the Sign In screen next.
 */
export function useRegisterMutation() {
  return useMutation({
    mutationKey: ['auth', 'register'],
    mutationFn: async (input: RegisterCustomerInput) => {
      return registerCustomer({
        ...input,
        deviceLabel: input.deviceLabel ?? defaultDeviceLabel(),
      });
    },
  });
}
