import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchCustomerMe,
  logoutCustomer,
  updateCustomerProfile,
} from '@/features/home/api/me-api';
import type { UpdateCustomerProfileInput } from '@/features/auth/types';
import { useAuthStore } from '@/stores/auth-store';
import { useDepositFlowStore } from '@/stores/deposit-flow-store';
import { queryClient as appQueryClient } from '@/lib/query-client';

export const customerMeQueryKey = ['customer', 'me'] as const;

/** Always load GET /me when authenticated (profile screen + store sync). */
export function useCustomerMeQuery(options?: { enabled?: boolean }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setSession = useAuthStore((state) => state.setSession);

  return useQuery({
    queryKey: customerMeQueryKey,
    queryFn: async () => {
      const customer = await fetchCustomerMe();
      setSession(customer);
      return customer;
    },
    enabled: options?.enabled ?? isAuthenticated,
    staleTime: 30_000,
  });
}

export function useUpdateCustomerProfileMutation() {
  const setSession = useAuthStore((state) => state.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['customer', 'me', 'patch'],
    mutationFn: (input: UpdateCustomerProfileInput) =>
      updateCustomerProfile(input),
    onSuccess: (customer) => {
      setSession(customer);
      queryClient.setQueryData(customerMeQueryKey, customer);
    },
  });
}

export function useLogoutMutation() {
  const clearSession = useAuthStore((state) => state.clearSession);
  const clearDepositFlow = useDepositFlowStore((state) => state.clearDepositFlow);

  return useMutation({
    mutationKey: ['auth', 'logout'],
    mutationFn: logoutCustomer,
    onSettled: async () => {
      clearDepositFlow();
      clearSession();
      await appQueryClient.clear();
    },
  });
}
