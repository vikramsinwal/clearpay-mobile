import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PAYOUT_COPY } from '@/constants/payout';
import { formatPayoutAmount } from '@/features/payout/lib/presentation';
import { formatCountdown, formatCreated, remainingSeconds } from '@/features/payout/lib/presentation';
import type { PayoutOrderListItem } from '@/features/payout/types';

type PayoutOrderCardProps = {
  order: PayoutOrderListItem;
  deviceNowMs: number;
  skewMs: number;
  onPress: (publicId: string) => void;
};

function statusColor(status: string): string {
  if (status === 'COMPLETED') return '#059669';
  if (status === 'EXPIRED' || status === 'CANCELLED') return '#94A3B8';
  if (status === 'FAILED' || status === 'DISPUTED') return '#EF4444';
  if (status === 'ACTION_REQUIRED') return '#1B6CA8';
  return '#D97706';
}

function PayoutOrderCardComponent({ order, deviceNowMs, skewMs, onPress }: PayoutOrderCardProps) {
  const seconds = remainingSeconds(order.deadlineAt, deviceNowMs, skewMs);
  const expired = order.status === 'EXPIRED' || seconds === 0;
  const countdown =
    seconds == null ? '' : expired ? PAYOUT_COPY.expired : `${formatCountdown(seconds)} left`;

  return (
    <Pressable
      accessibilityRole="button"
      className="mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 active:bg-slate-50"
      onPress={() => onPress(order.publicId)}
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text
          className="text-[15px] text-slate-900"
          style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
        >
          #{order.displayId}
        </Text>
        {countdown ? (
          <Text
            className={`text-[13px] ${expired ? 'text-slate-400' : 'text-blue'}`}
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {countdown}
          </Text>
        ) : null}
      </View>

      <Text
        className="mt-3 text-[18px] text-slate-900"
        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
      >
        Payout {formatPayoutAmount(order.amount, order.currency)}
      </Text>
      <Text
        className="mt-1 text-[15px] text-slate-800"
        style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
      >
        {order.beneficiaryName}
      </Text>
      {order.methodSummary ? (
        <Text className="mt-0.5 text-[13px] text-slate-500">{order.methodSummary}</Text>
      ) : null}

      <View className="mt-3 flex-row items-center gap-1.5">
        <View className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor(order.status) }} />
        <Text
          className="text-[12px] text-slate-700"
          style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
        >
          {order.statusLabel}
        </Text>
      </View>

      {order.actionRequired ? (
        <View className="mt-3 rounded-xl bg-blue-50 px-3 py-2">
          <Text
            className="text-[12px] text-blue-800"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {order.actionLabel ?? PAYOUT_COPY.actionRequired}
          </Text>
          <Text className="mt-0.5 text-[12px] text-slate-600">{PAYOUT_COPY.sendProof}</Text>
        </View>
      ) : null}

      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-[12px] text-slate-400">{formatCreated(order.createdAt)}</Text>
        <View className="rounded-lg bg-navy px-3 py-1.5">
          <Text
            className="text-[12px] text-white"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {PAYOUT_COPY.reviewPayout}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export const PayoutOrderCard = memo(PayoutOrderCardComponent);
