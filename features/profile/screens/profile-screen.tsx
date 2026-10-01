import { useIsFocused } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, RefreshControl, ScrollView, Text } from 'react-native';
import { ChevronUp } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ACCOUNT_SETTINGS_COPY, PROFILE_COPY } from '@/constants/profile';
import { useNotificationCountQuery } from '@/features/home/hooks/use-home-queries';
import { AccountStatusCard } from '@/features/profile/components/account-status-card';
import { AccountSettingsHeader } from '@/features/profile/components/account-settings-header';
import { EmployeesCard } from '@/features/profile/components/employees-card';
import { DangerZoneCard, FeeStructureCard } from '@/features/profile/components/fee-apps-danger';
import { PaymentReceivingCard } from '@/features/profile/components/payment-receiving-card';
import { PerformanceCard } from '@/features/profile/components/performance-card';
import { ProfileInformationCard } from '@/features/profile/components/profile-information-card';
import { SecurityCard } from '@/features/profile/components/security-card';
import { AutomaticPaymentProofCard } from '@/features/payout/components/automatic-payment-proof-card';
import { WorkingHoursCard } from '@/features/profile/components/working-hours-card';
import {
  useAccountProfileQuery,
  useAccountStatusQuery,
  useConnectTelegramMutation,
  useCreateEmployeeMutation,
  useDisconnectTelegramMutation,
  useEmployeesQuery,
  useFeeStructureQuery,
  usePerformanceQuery,
  useTelegramStatusQuery,
  useTwoFactorQuery,
  useUpdateAccountProfileMutation,
  useUpdateEmployeeMutation,
  useUpdateEmployeeStatusMutation,
  useUpdateWorkingHoursMutation,
  useWorkingHoursQuery,
} from '@/features/profile/hooks/use-account-settings';
import { useLogoutMutation } from '@/features/profile/hooks/use-profile';
import { formatPhoneDisplay } from '@/features/profile/lib/format-account';
import type {
  EmployeeDraft,
  EmployeeStatus,
  PerformancePeriod,
  WorkingShift,
} from '@/features/profile/types/account';
import { ApiClientError } from '@/lib/api/errors';
import { getTelegramBotUrl } from '@/lib/env';
import { showAlert } from '@/lib/ui/alert';

function failureMessage(error: unknown, fallback: string): string {
  return error instanceof ApiClientError ? error.message : fallback;
}

export function ProfileScreen() {
  const isFocused = useIsFocused();
  const scrollRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [period, setPeriod] = useState<PerformancePeriod>('30d');
  const [customRange, setCustomRange] = useState<{ startDate?: string; endDate?: string }>({});
  const [employeePage, setEmployeePage] = useState(1);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeStatus, setEmployeeStatus] = useState<EmployeeStatus | undefined>();

  const profileQuery = useAccountProfileQuery();
  const performanceQuery = usePerformanceQuery({
    period,
    startDate: customRange.startDate,
    endDate: customRange.endDate,
  });
  const statusQuery = useAccountStatusQuery();
  const hoursQuery = useWorkingHoursQuery();
  const employeesQuery = useEmployeesQuery({
    page: employeePage,
    limit: 20,
    search: employeeSearch,
    status: employeeStatus,
  });
  const feesQuery = useFeeStructureQuery();
  const securityQuery = useTwoFactorQuery();
  const telegramQuery = useTelegramStatusQuery();
  const notificationCountQuery = useNotificationCountQuery({ enabled: isFocused });

  const updateProfile = useUpdateAccountProfileMutation();
  const updateHours = useUpdateWorkingHoursMutation();
  const createEmployee = useCreateEmployeeMutation();
  const updateEmployee = useUpdateEmployeeMutation();
  const updateEmployeeStatus = useUpdateEmployeeStatusMutation();
  const connectTelegram = useConnectTelegramMutation();
  const disconnectTelegram = useDisconnectTelegramMutation();
  const logoutMutation = useLogoutMutation();

  const profile = profileQuery.data;

  const refresh = () => {
    void Promise.all([
      profileQuery.refetch(),
      performanceQuery.refetch(),
      statusQuery.refetch(),
      hoursQuery.refetch(),
      employeesQuery.refetch(),
      feesQuery.refetch(),
      securityQuery.refetch(),
      telegramQuery.refetch(),
      notificationCountQuery.refetch(),
    ]);
  };

  const saveProfile = async (input: Parameters<typeof updateProfile.mutateAsync>[0]) => {
    try {
      await updateProfile.mutateAsync(input);
    } catch (error) {
      showAlert('Update failed', failureMessage(error, 'Unable to save your profile. Please try again.'));
      throw error;
    }
  };

  const onOpenTelegramBot = async () => {
    const botUrl = getTelegramBotUrl();
    if (!botUrl) {
      showAlert('Telegram not configured', 'Set EXPO_PUBLIC_TELEGRAM_BOT_URL to open the bot.');
      return;
    }
    try {
      await Linking.openURL(botUrl);
    } catch {
      showAlert('Unable to open Telegram', 'Please try again.');
    }
  };

  const onLogout = () => {
    const run = () => logoutMutation.mutate();
    if (Platform.OS === 'web') {
      if (window.confirm(PROFILE_COPY.logoutConfirmBody)) run();
      return;
    }
    Alert.alert(PROFILE_COPY.logoutConfirmTitle, PROFILE_COPY.logoutConfirmBody, [
      { text: PROFILE_COPY.logoutCancel, style: 'cancel' },
      { text: PROFILE_COPY.logoutConfirmAction, style: 'destructive', onPress: run },
    ]);
  };

  const saveEmployee = async (draft: EmployeeDraft, id?: string) => {
    const payload: EmployeeDraft = {
      name: draft.name,
      email: draft.email || null,
      mobile: draft.mobile || null,
      ...(draft.role?.trim() ? { role: draft.role.trim() } : {}),
    };
    try {
      if (id) await updateEmployee.mutateAsync({ id, patch: payload });
      else await createEmployee.mutateAsync(payload);
    } catch (error) {
      showAlert('Employee update failed', failureMessage(error, 'Please try again.'));
      throw error;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7FB]" edges={['top']}>
      <AccountSettingsHeader />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={profileQuery.isRefetching || performanceQuery.isRefetching}
            tintColor="#1B6CA8"
            onRefresh={refresh}
          />
        }
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => setShowScrollTop(event.nativeEvent.contentOffset.y > 280)}
      >
        <Text className="mb-1 text-[22px] text-slate-900" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
          {ACCOUNT_SETTINGS_COPY.pageTitle}
        </Text>

        <PerformanceCard
          data={performanceQuery.data}
          error={performanceQuery.isError}
          loading={performanceQuery.isLoading}
          period={period}
          onCustomRange={(startDate, endDate) => {
            setCustomRange({ startDate, endDate });
            setPeriod('custom');
          }}
          onPeriodChange={(next) => {
            setCustomRange({});
            setPeriod(next);
          }}
          onRetry={() => void performanceQuery.refetch()}
        />

        <AccountStatusCard
          error={statusQuery.isError}
          loading={statusQuery.isLoading}
          status={statusQuery.data}
          onRetry={() => void statusQuery.refetch()}
        />

        <ProfileInformationCard
          error={profileQuery.isError}
          loading={profileQuery.isLoading}
          profile={profile}
          saving={updateProfile.isPending || connectTelegram.isPending || disconnectTelegram.isPending}
          telegram={telegramQuery.data}
          telegramError={telegramQuery.isError}
          onConnectTelegram={async (username) => {
            try {
              await connectTelegram.mutateAsync(username);
            } catch (error) {
              showAlert('Telegram', failureMessage(error, 'Unable to connect Telegram.'));
              throw error;
            }
          }}
          onDisconnectTelegram={() => {
            const run = async () => {
              try {
                await disconnectTelegram.mutateAsync();
              } catch (error) {
                showAlert('Telegram', failureMessage(error, 'Unable to disconnect Telegram.'));
              }
            };
            if (Platform.OS === 'web') {
              if (window.confirm('Disconnect Telegram from this account?')) void run();
              return Promise.resolve();
            }
            Alert.alert('Disconnect Telegram?', 'You can reconnect later.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Disconnect', style: 'destructive', onPress: () => void run() },
            ]);
            return Promise.resolve();
          }}
          onOpenTelegramBot={() => void onOpenTelegramBot()}
          onRetry={() => void profileQuery.refetch()}
          onRetryTelegram={() => void telegramQuery.refetch()}
          onSaveMobile={(mobile) => saveProfile({ mobile })}
          onSaveName={(name) => saveProfile({ name })}
        />

        <PaymentReceivingCard
          phone={formatPhoneDisplay(profile?.mobile)}
          saving={updateProfile.isPending}
          upiId={profile?.upiId ?? ''}
          onSave={(upiId) => saveProfile({ upiId })}
        />

        <WorkingHoursCard
          error={hoursQuery.isError}
          hours={hoursQuery.data}
          loading={hoursQuery.isLoading}
          saving={updateHours.isPending}
          onRetry={() => void hoursQuery.refetch()}
          onSave={async (shifts: WorkingShift[]) => {
            try {
              await updateHours.mutateAsync(shifts);
            } catch (error) {
              showAlert('Update failed', failureMessage(error, 'Unable to save working hours.'));
              throw error;
            }
          }}
        />

        <EmployeesCard
          error={employeesQuery.isError}
          list={employeesQuery.data}
          loading={employeesQuery.isLoading}
          saving={createEmployee.isPending || updateEmployee.isPending || updateEmployeeStatus.isPending}
          search={employeeSearch}
          status={employeeStatus}
          onCreate={(draft) => saveEmployee(draft)}
          onPage={setEmployeePage}
          onRetry={() => void employeesQuery.refetch()}
          onSearch={(value) => {
            setEmployeePage(1);
            setEmployeeSearch(value);
          }}
          onStatus={(value) => {
            setEmployeePage(1);
            setEmployeeStatus(value);
          }}
          onToggleStatus={async (employee) => {
            try {
              await updateEmployeeStatus.mutateAsync({
                id: employee.id,
                status: employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
              });
            } catch (error) {
              showAlert('Update failed', failureMessage(error, 'Unable to update this employee.'));
            }
          }}
          onUpdate={(id, draft) => saveEmployee(draft, id)}
        />

        <SecurityCard
          error={securityQuery.isError}
          loading={securityQuery.isLoading}
          twoFactor={securityQuery.data}
          onRetry={() => void securityQuery.refetch()}
        />

        <AutomaticPaymentProofCard />

        <FeeStructureCard
          error={feesQuery.isError}
          fees={feesQuery.data}
          loading={feesQuery.isLoading}
          onRetry={() => void feesQuery.refetch()}
        />

        <DangerZoneCard pending={logoutMutation.isPending} onLogout={onLogout} />
      </ScrollView>

      {showScrollTop ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)} className="absolute bottom-5 right-4">
          <Pressable
            accessibilityLabel="Scroll to top"
            className="h-12 w-12 items-center justify-center rounded-full bg-[#2563EB]"
            onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          >
            <ChevronUp color="#FFFFFF" size={24} />
          </Pressable>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}
