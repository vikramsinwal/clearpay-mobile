import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import {
  activateAccountChannel,
  createCustomerAccount,
  deactivateAccountChannel,
  deleteCustomerAccount,
  fetchAccountDetails,
  fetchCustomerAccounts,
  reconnectAccount,
} from '@/features/accounts/api/accounts-api';
import type {
  AccountChannel,
  AccountKind,
  AccountListQuery,
  AccountsPage,
  AccountsSummary,
} from '@/features/accounts/types';

type AccountsPageParam = undefined | { cursor: string } | { page: number };

export const accountsKeys = {
  all: ['customer-accounts'] as const,
  list: (query: Omit<AccountListQuery, 'page' | 'cursor'>) =>
    ['customer-accounts', query] as const,
  detail: (publicId: string) => ['customer-account-detail', publicId] as const,
  summary: (query: Omit<AccountListQuery, 'page' | 'cursor'>) =>
    ['customer-account-summary', query] as const,
};

async function refreshAccounts(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: accountsKeys.all }),
    queryClient.invalidateQueries({ queryKey: ['customer-account-summary'] }),
    queryClient.invalidateQueries({ queryKey: ['customer-account-detail'] }),
  ]);
}

export function useAccountsInfiniteQuery(query: Omit<AccountListQuery, 'page' | 'cursor'>) {
  const queryClient = useQueryClient();
  return useInfiniteQuery<
    AccountsPage,
    Error,
    InfiniteData<AccountsPage>,
    ReturnType<typeof accountsKeys.list>,
    AccountsPageParam
  >({
    queryKey: accountsKeys.list(query),
    initialPageParam: undefined,
    queryFn: async ({ pageParam }) => {
      const page = await fetchCustomerAccounts({
        ...query,
        page: pageParam && 'page' in pageParam ? pageParam.page : pageParam ? undefined : 1,
        cursor: pageParam && 'cursor' in pageParam ? pageParam.cursor : undefined,
      });
      queryClient.setQueryData<AccountsSummary | null>(
        accountsKeys.summary(query),
        page.summary,
      );
      return page;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.nextCursor) return { cursor: lastPage.nextCursor };
      if (lastPage.page < lastPage.totalPages) return { page: lastPage.page + 1 };
      return undefined;
    },
    staleTime: 15_000,
  });
}

export function useAccountDetailsQuery(publicId: string | null) {
  return useQuery({
    queryKey: accountsKeys.detail(publicId ?? ''),
    queryFn: () => fetchAccountDetails(publicId ?? ''),
    enabled: Boolean(publicId),
    staleTime: 15_000,
  });
}

export function useActivateAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { publicId: string; channel: AccountChannel }) =>
      activateAccountChannel(input.publicId, input.channel),
    onSuccess: () => refreshAccounts(queryClient),
  });
}

export function useDeactivateAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { publicId: string; channel: AccountChannel }) =>
      deactivateAccountChannel(input.publicId, input.channel),
    onSuccess: () => refreshAccounts(queryClient),
  });
}

export function useReconnectAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (publicId: string) => reconnectAccount(publicId),
    onSettled: () => refreshAccounts(queryClient),
  });
}

export function useCreateAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { kind: AccountKind; fields: Record<string, string> }) =>
      createCustomerAccount(input),
    onSuccess: () => refreshAccounts(queryClient),
  });
}

export function useDeleteAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (publicId: string) => deleteCustomerAccount(publicId),
    onSuccess: () => refreshAccounts(queryClient),
  });
}
