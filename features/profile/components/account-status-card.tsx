import { Text, View } from 'react-native';

import { ACCOUNT_SETTINGS_COPY } from '@/constants/profile';
import { statusTone } from '@/features/profile/lib/format-account';
import type { AccountStatus } from '@/features/profile/types/account';

import { CardError, CardSkeleton, SettingsCard, SettingsHeading } from './settings-card';

const TONE = {
  success: { badge: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  warning: { badge: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  danger: { badge: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
  neutral: { badge: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
} as const;

export function AccountStatusCard({
  status,
  loading,
  error,
  onRetry,
}: {
  status?: AccountStatus;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (loading && !status) return <CardSkeleton lines={3} />;
  if (error && !status) return <CardError onRetry={onRetry} />;
  if (!status) return null;

  const tone = TONE[statusTone(status.status)];

  return (
    <SettingsCard>
      <SettingsHeading title={ACCOUNT_SETTINGS_COPY.accountStatus} />
      <View className={`self-start flex-row items-center rounded-full px-2.5 py-1 ${tone.badge}`}>
        <View className={`mr-1.5 h-2 w-2 rounded-full ${tone.dot}`} />
        <Text
          className={`text-[12px] ${tone.text}`}
          style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
        >
          {status.label}
        </Text>
      </View>
      <Text
        className="mt-3 text-[13px] leading-5 text-slate-700"
        style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
      >
        {status.message}
      </Text>
      {!status.canCustomerChange ? (
        <Text
          className="mt-2 text-[12px] leading-5 text-slate-400"
          style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
        >
          {ACCOUNT_SETTINGS_COPY.statusManaged}
        </Text>
      ) : null}
    </SettingsCard>
  );
}
