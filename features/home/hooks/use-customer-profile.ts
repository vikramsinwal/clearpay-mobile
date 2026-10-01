import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchCustomerMe } from '@/features/home/api/me-api';
import { customerMeQueryKey } from '@/features/profile/hooks/use-profile';
import { useAuthStore } from '@/stores/auth-store';

/** Keep auth store customer in sync with GET /me when missing after restore. */
export function useCustomerProfileQuery() {
  const customer = useAuthStore((state) => state.customer);
  const setSession = useAuthStore((state) => state.setSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const query = useQuery({
    queryKey: customerMeQueryKey,
    queryFn: fetchCustomerMe,
    enabled: isAuthenticated && !customer,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data) {
      setSession(query.data);
    }
  }, [query.data, setSession]);

  return query;
}
