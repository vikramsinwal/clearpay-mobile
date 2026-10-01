import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ACCOUNT_SETTINGS_COPY } from '@/constants/profile';
import { formatBps, formatFeeSource } from '@/features/profile/lib/format-account';
import type { FeeStructure } from '@/features/profile/types/account';

import { CardError, CardSkeleton, SettingsCard, SettingsHeading } from './settings-card';

export function FeeStructureCard({
  fees,
  loading,
  error,
  onRetry,
}: {
  fees?: FeeStructure;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (loading && !fees) return <CardSkeleton lines={3} />;
  if (error && !fees) return <CardError onRetry={onRetry} />;
  if (!fees) return null;

  return (
    <SettingsCard>
      <SettingsHeading title={ACCOUNT_SETTINGS_COPY.feeStructure} />
      <FeeRow
        description={`Fee charged on incoming payments. ${formatFeeSource(fees.source.payinFee)}.`}
        label="Payin Fee"
        value={fees.unit === 'bps' ? formatBps(fees.payinFee) : String(fees.payinFee)}
      />
      <View className="h-3" />
      <FeeRow
        description={`Fee charged on outgoing payments. ${formatFeeSource(fees.source.payoutFee)}.`}
        label="Payout Fee"
        value={fees.unit === 'bps' ? formatBps(fees.payoutFee) : String(fees.payoutFee)}
      />
      <Text
        className="mt-3 text-[12px] leading-5 text-slate-400"
        style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
      >
        {ACCOUNT_SETTINGS_COPY.feesLocked} {ACCOUNT_SETTINGS_COPY.feesAdmin}
      </Text>
    </SettingsCard>
  );
}

function FeeRow({
  label,
  description,
  value,
}: {
  label: string;
  description: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="flex-1">
        <Text className="text-[14px] text-slate-900" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
          {label}
        </Text>
        <Text className="mt-0.5 text-[12px] text-slate-400" style={{ fontFamily: 'PlusJakartaSans_400Regular' }}>
          {description}
        </Text>
      </View>
      <Text className="text-[14px] text-slate-900" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
        {value}
      </Text>
    </View>
  );
}

export function DangerZoneCard({
  pending,
  onLogout,
}: {
  pending: boolean;
  onLogout: () => void;
}) {
  return (
    <SettingsCard tone="danger">
      <SettingsHeading title={ACCOUNT_SETTINGS_COPY.dangerZone} />
      <Pressable
        accessibilityRole="button"
        className="min-h-[48px] items-center justify-center rounded-xl bg-[#DC2626]"
        disabled={pending}
        onPress={onLogout}
      >
        {pending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text
            className="text-[15px] text-white"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            Logout
          </Text>
        )}
      </Pressable>
    </SettingsCard>
  );
}
