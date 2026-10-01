import { Clock, Lock } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { DEPOSIT_UNDER_REVIEW_COPY } from '@/constants/deposit-under-review';
import { MIN_DEPOSIT_USDT } from '@/constants/home';

type DepositUnderReviewCardProps = {
  amountUsdt?: number;
  amountDisplay?: string;
  currency?: string;
};

function formatCollateralLabel(
  amountUsdt: number,
  amountDisplay: string | undefined,
  currency: string,
): string {
  const amount =
    amountDisplay?.trim() ||
    amountUsdt.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  return `${amount} ${currency}`;
}

/**
 * Home hero while deposit proof is PROOF_SUBMITTED / awaiting admin approval.
 * Replaces the Make Deposit card — no payment CTA until verification completes.
 */
export function DepositUnderReviewCard({
  amountUsdt = MIN_DEPOSIT_USDT,
  amountDisplay,
  currency = 'USDT',
}: DepositUnderReviewCardProps) {
  const collateral = formatCollateralLabel(amountUsdt, amountDisplay, currency);

  return (
    <View className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <View className="relative z-10 items-center pb-1 pt-1">
        <View className="mb-3 h-14 w-14 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/15">
          <Clock color="#D97706" size={28} strokeWidth={2.2} />
        </View>

        <View className="mb-2.5 flex-row items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1">
          <View className="h-2 w-2 rounded-full bg-amber-500" />
          <Text
            className="text-[11px] font-semibold tracking-tight text-amber-800"
            style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
          >
            {DEPOSIT_UNDER_REVIEW_COPY.homeStatusPill}
          </Text>
        </View>

        <Text
          accessibilityRole="header"
          className="mb-1.5 text-xl font-extrabold tracking-tight text-slate-900"
          style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
        >
          {DEPOSIT_UNDER_REVIEW_COPY.homeTitle}
        </Text>

        <Text
          className="mb-4 max-w-[320px] text-center text-[12px] font-normal leading-5 text-slate-600"
          style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
        >
          {DEPOSIT_UNDER_REVIEW_COPY.homeBodyPrefix} {collateral}{' '}
          {DEPOSIT_UNDER_REVIEW_COPY.homeBodySuffix}
        </Text>

        <View className="w-full flex-row items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 shadow-sm">
          <Lock color="#D97706" size={16} strokeWidth={2.2} />
          <Text
            className="text-xs font-semibold text-slate-700"
            style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
          >
            {DEPOSIT_UNDER_REVIEW_COPY.homeLockedCta}
          </Text>
        </View>

        <View className="mt-2.5 flex-row items-center gap-1.5">
          <Text
            className="text-[11px] font-medium text-slate-500"
            style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
          >
            {DEPOSIT_UNDER_REVIEW_COPY.homeCollateralLabel}
          </Text>
          <Text
            className="text-[11px] font-bold tracking-wide text-blue"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {collateral}
          </Text>
        </View>
      </View>
    </View>
  );
}
