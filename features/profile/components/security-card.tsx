import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { ACCOUNT_SETTINGS_COPY } from '@/constants/profile';
import type { TwoFactorStatus } from '@/features/profile/types/account';

import { SettingsCard, SettingsHeading } from './settings-card';

export function SecurityCard({
  twoFactor,
  loading,
  error,
  onRetry,
}: {
  twoFactor?: TwoFactorStatus;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const router = useRouter();

  return (
    <SettingsCard>
      <SettingsHeading title={ACCOUNT_SETTINGS_COPY.security} />
      <Pressable
        accessibilityRole="button"
        className="min-h-[44px] flex-row items-center justify-between"
        onPress={() => router.push('/change-password')}
      >
        <Text className="text-[14px] text-slate-800" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
          {ACCOUNT_SETTINGS_COPY.changePassword}
        </Text>
        <ChevronRight color="#94A3B8" size={18} />
      </Pressable>
      <View className="my-2 h-px bg-slate-100" />
      {loading && !twoFactor ? (
        <View className="h-10 rounded-xl bg-slate-100" />
      ) : error && !twoFactor ? (
        <Pressable accessibilityRole="button" onPress={onRetry}>
          <Text className="text-[13px] text-blue" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
            {ACCOUNT_SETTINGS_COPY.cardError} {ACCOUNT_SETTINGS_COPY.retry}
          </Text>
        </Pressable>
      ) : (
        <View className="min-h-[44px]">
          <Text className="text-[14px] text-slate-800" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
            {ACCOUNT_SETTINGS_COPY.twoFactor}
          </Text>
          <Text
            className={`mt-0.5 text-[12px] ${twoFactor?.enabled ? 'text-emerald-600' : 'text-slate-400'}`}
            style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
          >
            {twoFactor?.enabled ? ACCOUNT_SETTINGS_COPY.enabled : ACCOUNT_SETTINGS_COPY.disabled}
            {twoFactor?.method ? ` · ${twoFactor.method}` : ''}
          </Text>
          {twoFactor && !twoFactor.enrollmentAvailable ? (
            <Text className="mt-1 text-[12px] text-slate-400" style={{ fontFamily: 'PlusJakartaSans_400Regular' }}>
              A second factor is not available on this account.
            </Text>
          ) : null}
        </View>
      )}
    </SettingsCard>
  );
}
