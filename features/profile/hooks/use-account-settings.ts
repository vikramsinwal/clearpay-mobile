import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  changePassword,
  connectTelegram,
  createEmployee,
  disconnectTelegram,
  fetchAccountApps,
  fetchAccountPerformance,
  fetchAccountProfile,
  fetchAccountStatus,
  fetchEmployees,
  fetchFeeStructure,
  fetchTelegramStatus,
  fetchTwoFactorStatus,
  fetchWorkingHours,
  updateAccountProfile,
  updateEmployee,
  updateEmployeeStatus,
  updateWorkingHours,
} from '@/features/profile/api/account-api';
import type {
  EmployeeDraft,
  EmployeeListQuery,
  EmployeeStatus,
  PerformancePeriod,
  ProfilePatch,
  WorkingShift,
} from '@/features/profile/types/account';
import { clearAuthTokens } from '@/lib/auth/secure-tokens';
import { queryClient as appQueryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { useDepositFlowStore } from '@/stores/deposit-flow-store';

export const accountQueryKeys = {
  profile: ['customer-profile'] as const,
  performance: (
    period: PerformancePeriod,
    startDate?: string,
    endDate?: string,
  ) =>
    ['customer-performance', period, startDate ?? '', endDate ?? ''] as const,
  status: ['customer-status'] as const,
  workingHours: ['customer-working-hours'] as const,
  employees: (query: EmployeeListQuery) =>
    [
      'customer-employees',
      query.page,
      query.limit,
      query.search ?? '',
      query.status ?? '',
    ] as const,
  security: ['customer-security'] as const,
  fees: ['customer-fees'] as const,
  appConfig: ['customer-app-config'] as const,
  telegram: ['customer-telegram'] as const,
};

export function useAccountProfileQuery() {
  return useQuery({
    queryKey: accountQueryKeys.profile,
    queryFn: fetchAccountProfile,
    staleTime: 30_000,
  });
}

export function useUpdateAccountProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['customer-profile', 'patch'],
    mutationFn: (input: ProfilePatch) => updateAccountProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(accountQueryKeys.profile, profile);
    },
  });
}

export function usePerformanceQuery(options: {
  period: PerformancePeriod;
  startDate?: string;
  endDate?: string;
}) {
  const ready =
    options.period !== 'custom' || Boolean(options.startDate && options.endDate);

  return useQuery({
    queryKey: accountQueryKeys.performance(
      options.period,
      options.startDate,
      options.endDate,
    ),
    queryFn: () => fetchAccountPerformance(options),
    enabled: ready,
    staleTime: 30_000,
  });
}

export function useAccountStatusQuery() {
  return useQuery({
    queryKey: accountQueryKeys.status,
    queryFn: fetchAccountStatus,
    staleTime: 30_000,
  });
}

export function useWorkingHoursQuery() {
  return useQuery({
    queryKey: accountQueryKeys.workingHours,
    queryFn: fetchWorkingHours,
    staleTime: 30_000,
  });
}

export function useUpdateWorkingHoursMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['customer-working-hours', 'patch'],
    mutationFn: (shifts: WorkingShift[]) => updateWorkingHours(shifts),
    onSuccess: (hours) => {
      queryClient.setQueryData(accountQueryKeys.workingHours, hours);
    },
  });
}

export function useEmployeesQuery(query: EmployeeListQuery) {
  return useQuery({
    queryKey: accountQueryKeys.employees(query),
    queryFn: () => fetchEmployees(query),
    staleTime: 30_000,
  });
}

export function useCreateEmployeeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['customer-employees', 'create'],
    mutationFn: (input: EmployeeDraft) => createEmployee(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customer-employees'] });
    },
  });
}

export function useUpdateEmployeeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['customer-employees', 'patch'],
    mutationFn: (input: { id: string; patch: EmployeeDraft }) =>
      updateEmployee(input.id, input.patch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customer-employees'] });
    },
  });
}

export function useUpdateEmployeeStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['customer-employees', 'status'],
    mutationFn: (input: { id: string; status: EmployeeStatus }) =>
      updateEmployeeStatus(input.id, input.status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customer-employees'] });
    },
  });
}

export function useFeeStructureQuery() {
  return useQuery({
    queryKey: accountQueryKeys.fees,
    queryFn: fetchFeeStructure,
    staleTime: 60_000,
  });
}

export function useTwoFactorQuery() {
  return useQuery({
    queryKey: accountQueryKeys.security,
    queryFn: fetchTwoFactorStatus,
    staleTime: 60_000,
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationKey: ['customer-security', 'change-password'],
    mutationFn: changePassword,
  });
}

/** Password change revokes every session, so the next step is a local sign-out. */
export function useEndLocalSession() {
  const clearSession = useAuthStore((state) => state.clearSession);
  const clearDepositFlow = useDepositFlowStore((state) => state.clearDepositFlow);

  return async () => {
    await clearAuthTokens();
    clearDepositFlow();
    clearSession();
    await appQueryClient.clear();
  };
}

export function useAccountAppsQuery() {
  return useQuery({
    queryKey: accountQueryKeys.appConfig,
    queryFn: fetchAccountApps,
    staleTime: 5 * 60_000,
  });
}

export function useTelegramStatusQuery() {
  return useQuery({
    queryKey: accountQueryKeys.telegram,
    queryFn: fetchTelegramStatus,
    staleTime: 30_000,
  });
}

export function useConnectTelegramMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['customer-telegram', 'connect'],
    mutationFn: (username: string) => connectTelegram(username),
    onSuccess: async (telegram) => {
      queryClient.setQueryData(accountQueryKeys.telegram, telegram);
      await queryClient.invalidateQueries({ queryKey: accountQueryKeys.profile });
    },
  });
}

export function useDisconnectTelegramMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['customer-telegram', 'disconnect'],
    mutationFn: disconnectTelegram,
    onSuccess: async (telegram) => {
      queryClient.setQueryData(accountQueryKeys.telegram, telegram);
      await queryClient.invalidateQueries({ queryKey: accountQueryKeys.profile });
    },
  });
}
