import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { fetchDepositStatus } from '@/features/deposit/api/deposit-api';

export const depositStatusQueryKey = ['customer', 'deposit', 'status'] as const;

/**
 * Server-truth deposit session status (`OPEN | FUNDS_CLAIMED |
 * PROOF_SUBMITTED | COMPLETED | REJECTED | EXPIRED | CANCELLED`).
 * Polled so the first-deposit gate can react to admin approval without
 * requiring the user to reopen the app. Refetches when the app foregrounds.
 */
export function useDepositStatusQuery() {
  const query = useQuery({
    queryKey: depositStatusQueryKey,
    queryFn: fetchDepositStatus,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnReconnect: true,
  });
  const { refetch } = query;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void refetch();
      }
    });
    return () => subscription.remove();
  }, [refetch]);

  return query;
}
