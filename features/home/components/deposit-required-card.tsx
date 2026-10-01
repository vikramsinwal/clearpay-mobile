import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Lock } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import {
  DEPOSIT_REQUIRED_COPY,
  MIN_DEPOSIT_USDT,
} from '@/constants/home';
import { formatAmountMinor } from '@/features/home/lib/format';

type DepositRequiredCardProps = {
  netBalanceMinor?: number;
  currency?: string;
  accountLabel?: string;
  onMakeDeposit: () => void;
};

/**
 * Locked trader account hero — deposit required (portal home design).
 */
export function DepositRequiredCard({
  netBalanceMinor = 0,
  currency = 'USD',
  accountLabel = 'Locked Trader Account #CP-1028',
  onMakeDeposit,
}: DepositRequiredCardProps) {
  return (
    <View
      className="relative overflow-hidden rounded-2xl border border-blue-900/40 bg-[#091D42] p-5"
      style={{
        shadowColor: '#0B1F3A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
        elevation: 6,
      }}
    >
      {/* Ghosted unlocked-account preview behind lock overlay */}
      <View
        className="absolute inset-0 justify-between p-4 opacity-[0.22]"
        pointerEvents="none"
      >
        <View className="flex-row items-start justify-between">
          <View>
            <Text
              className="text-[11px] uppercase tracking-wider text-slate-300"
              style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
            >
              {DEPOSIT_REQUIRED_COPY.netBalanceLabel}
            </Text>
            <Text
              className="text-xl font-extrabold text-white"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {formatAmountMinor(netBalanceMinor, currency)}
            </Text>
          </View>
          <View className="rounded border border-white/20 bg-white/10 px-3 py-1">
            <Text
              className="text-[10px] font-semibold text-slate-300"
              style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
            >
              {DEPOSIT_REQUIRED_COPY.withdrawDisabled}
            </Text>
          </View>
        </View>
        <Text
          className="text-[10px] text-slate-400"
          style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
        >
          {accountLabel}
        </Text>
      </View>

      <View className="relative z-10 items-center pb-1 pt-2">
        <View
          className="mb-3.5"
          style={{
            shadowColor: '#F59E0B',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <LinearGradient
            colors={['#ffe082', '#ffca28']}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 4,
              borderColor: 'rgba(252, 211, 77, 0.35)',
            }}
          >
            <Lock color="#5d4037" size={28} strokeWidth={2.3} />
          </LinearGradient>
        </View>

        <Text
          accessibilityRole="header"
          className="mb-1.5 text-xl font-extrabold tracking-tight text-white"
          style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
        >
          {DEPOSIT_REQUIRED_COPY.title}
        </Text>
        <Text
          className="mb-5 max-w-[270px] text-center text-[12.5px] font-normal leading-5 text-slate-300"
          style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
        >
          {DEPOSIT_REQUIRED_COPY.bannerBody}
        </Text>

        <Pressable
          accessibilityLabel={DEPOSIT_REQUIRED_COPY.cta}
          accessibilityRole="button"
          className="w-full flex-row items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 active:opacity-90"
          onPress={onMakeDeposit}
          style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}
        >
          <Text
            className="text-sm font-bold text-slate-900"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {DEPOSIT_REQUIRED_COPY.cta}
          </Text>
          <ArrowRight color="#334155" size={16} strokeWidth={2.5} />
        </Pressable>

        <View className="mt-3 flex-row items-center gap-1.5">
          <Text
            className="text-[11.5px] font-medium text-slate-300"
            style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
          >
            Minimum:
          </Text>
          <Text
            className="text-[11.5px] font-bold tracking-wide text-[#00D4B2]"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {MIN_DEPOSIT_USDT} USDT
          </Text>
        </View>
      </View>
    </View>
  );
}
