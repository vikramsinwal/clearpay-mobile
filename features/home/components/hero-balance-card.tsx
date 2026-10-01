import { ArrowLeftRight, Wallet } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { formatAmountMinor, formatUsdtAmount } from '@/features/home/lib/format';

type HeroBalanceCardProps = {
  netBalanceMinor: number;
  /** INR paise from the server. Null when no USDT/INR rate is configured. */
  fiatAmountMinor: number | null;
  currency: string;
  usdtBalance: number;
  usdtCurrency: string;
  cryptoSettleEnabled: boolean;
  showBestRate: boolean;
  onCryptoSettle: () => void;
  onTransfer: () => void;
};

/** `₹ 1,14,237.41` — symbol leads, matching the home hero. */
function formatLeadingAmount(amountMinor: number, currency: string): string {
  const labeled = formatAmountMinor(amountMinor, currency);
  if (currency === 'INR') {
    return `₹ ${labeled.replace(/\s*₹$/, '')}`;
  }
  if (currency === 'USD' || currency === 'USDT') {
    return `$ ${labeled.replace(/\s*\$$/, '')}`;
  }
  return labeled;
}

export function HeroBalanceCard({
  netBalanceMinor,
  fiatAmountMinor,
  currency,
  usdtBalance,
  usdtCurrency,
  cryptoSettleEnabled,
  showBestRate,
  onCryptoSettle,
  onTransfer,
}: HeroBalanceCardProps) {
  return (
    <View
      accessibilityLabel="Net balance"
      className="relative overflow-hidden rounded-2xl bg-[#2870f8] p-4"
      style={{
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
        elevation: 8,
      }}
    >
      <View
        pointerEvents="none"
        className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10"
      />

      <View className="mb-1.5 flex-row items-start justify-between gap-2">
        <View className="flex-row items-center gap-1.5">
          <Wallet color="#DBEAFE" size={12} strokeWidth={2.4} />
          <Text
            className="text-xs text-blue-100"
            style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
          >
            Net Balance
          </Text>
        </View>

        <View className="relative">
          {showBestRate ? (
            <View className="absolute -top-2 right-1 z-10 rounded-sm bg-amber-500 px-1.5 py-0.5 shadow-sm">
              <Text
                className="text-[9px] uppercase text-slate-900"
                style={{
                  fontFamily: 'PlusJakartaSans_700Bold',
                  letterSpacing: 0.6,
                }}
              >
                BEST RATE
              </Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !cryptoSettleEnabled }}
            className="flex-row items-center gap-1.5 rounded-md bg-white/95 px-3 py-1.5 shadow-sm active:opacity-90"
            disabled={!cryptoSettleEnabled}
            onPress={onCryptoSettle}
          >
            <View className="h-4 w-4 items-center justify-center rounded-full bg-[#26a17b]">
              <Text
                className="text-[10px] text-white"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                ₮
              </Text>
            </View>
            <Text
              className="text-xs text-slate-800"
              style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
            >
              Crypto Settle
            </Text>
          </Pressable>
        </View>
      </View>

      <Text
        adjustsFontSizeToFit
        accessibilityRole="header"
        numberOfLines={1}
        className="mb-5 text-3xl text-white"
        style={{
          fontFamily: 'PlusJakartaSans_700Bold',
          letterSpacing: -0.6,
        }}
      >
        {formatLeadingAmount(netBalanceMinor, currency)}
      </Text>

      <View className="mb-3.5 h-px w-full bg-white/15" />

      <View className="flex-row items-end justify-between">
        <View className="min-w-0 flex-1 pr-3">
          <Text
            className="mb-0.5 text-xs text-blue-100/90"
            style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
          >
            Staked Deposit
          </Text>
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            className="text-xl text-white"
            style={{
              fontFamily: 'PlusJakartaSans_700Bold',
              letterSpacing: -0.4,
            }}
          >
            {fiatAmountMinor == null
              ? '≈ —'
              : `≈ ${formatLeadingAmount(fiatAmountMinor, currency)}`}
          </Text>
          <Text
            className="mt-0.5 text-xs text-blue-100/80"
            style={{
              fontFamily: 'PlusJakartaSans_500Medium',
              letterSpacing: 0.3,
            }}
          >
            {formatUsdtAmount(usdtBalance, usdtCurrency)}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Transfer or Swap"
          accessibilityRole="button"
          className="h-8 w-8 items-center justify-center rounded-lg bg-white/20 active:opacity-80"
          onPress={onTransfer}
        >
          <ArrowLeftRight color="#FFFFFF" size={14} strokeWidth={2.4} />
        </Pressable>
      </View>
    </View>
  );
}
