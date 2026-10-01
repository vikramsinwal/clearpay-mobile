import * as Clipboard from 'expo-clipboard';
import { Check, Clock3, Copy, MoreVertical, TriangleAlert } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { PAYIN_COPY, PAYIN_STATUS_LABEL } from '@/constants/payin';
import { formatMoneyMinor, formatOrderTimestamp } from '@/features/payin/lib/format';
import type { PayinOrderListItem } from '@/features/payin/types';

type PayinOrderCardProps = {
  order: PayinOrderListItem;
  deviceNowMs: number;
  skewMs: number;
  timeZone?: string | null;
  onPress: (publicId: string) => void;
};

function statusBadge(status: PayinOrderListItem['status']): { label: string; className: string; text: string } {
  if (status === 'COMPLETED') {
    return { label: 'Success', className: 'border-[#a7f3d0] bg-[#ecfdf5]', text: 'text-[#059669]' };
  }
  if (status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED') {
    return {
      label: PAYIN_STATUS_LABEL[status],
      className: 'border-[#fecaca] bg-[#fef2f2]',
      text: 'text-[#b91c1c]',
    };
  }
  if (status === 'PENDING_VERIFICATION' || status === 'DISPUTED') {
    return { label: 'Review', className: 'border-[#fde68a] bg-[#fffbeb]', text: 'text-[#b45309]' };
  }
  return { label: 'Pending', className: 'border-[#bfdbfe] bg-[#eff6ff]', text: 'text-[#1d4ed8]' };
}

function compactStamp(iso: string, timeZone?: string | null): string {
  const formatted = formatOrderTimestamp(iso, timeZone);
  return formatted.replace(',', '');
}

export function PayinOrderCard({ order, timeZone, onPress }: PayinOrderCardProps) {
  const badge = statusBadge(order.status);
  const account = order.assignedAccountLabel ?? order.remitterName;
  const bank = order.bankLabel ?? order.paymentMethod ?? '—';
  const smsKnown = order.smsReceived != null;
  const smsOk = order.smsReceived === true;
  const earned =
    order.earningMinor != null
      ? `+${formatMoneyMinor(order.earningMinor, order.currency)} Earned`
      : null;

  return (
    <Pressable
      accessibilityRole="button"
      className="mb-3 rounded-2xl border border-[#e2e8f0] bg-white p-3.5 active:opacity-90"
      onPress={() => onPress(order.publicId)}
    >
      <View className="flex-row items-center justify-between border-b border-[#f1f5f9] pb-2">
        <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
          <Text className="text-[13px] text-[#475569]" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
            Payin #{order.displayId}
          </Text>
          <Pressable
            accessibilityLabel="Copy Payin ID"
            hitSlop={8}
            onPress={() => {
              void Clipboard.setStringAsync(order.publicId);
            }}
          >
            <Copy color="#94a3b8" size={14} />
          </Pressable>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className={`rounded-full border px-2 py-0.5 ${badge.className}`}>
            <Text className={`text-[11px] ${badge.text}`} style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
              {badge.label}
            </Text>
          </View>
          <MoreVertical color="#94a3b8" size={16} />
        </View>
      </View>

      <View className="mt-2.5 flex-row items-end justify-between">
        <Text className="text-[20px] text-[#0f172a]" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
          {formatMoneyMinor(order.expectedInboundAmountMinor, order.currency).replace('₹', '₹ ')}
        </Text>
        {earned ? (
          <View className="rounded border border-[#dbeafe] bg-[#eff6ff] px-1.5 py-0.5">
            <Text className="text-[11px] text-[#2563eb]" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
              {earned}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mt-2 flex-row flex-wrap">
        <View className="mb-2 w-1/2 pr-2">
          <Text className="text-[11px] text-[#94a3b8]">Bank Account</Text>
          <Text className="text-[12px] text-[#1e293b]" numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
            {account}
          </Text>
        </View>
        <View className="mb-2 w-1/2">
          <Text className="text-[11px] text-[#94a3b8]">Bank</Text>
          <Text className="text-[12px] text-[#1e293b]" numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
            {bank}
          </Text>
        </View>
        <View className="w-1/2 pr-2">
          <Text className="text-[11px] text-[#94a3b8]">UTR</Text>
          <Text className="text-[12px] tracking-wider text-[#1e293b]" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
            {order.utr ?? PAYIN_COPY.awaitingUtr}
          </Text>
        </View>
        <View className="w-1/2">
          <Text className="text-[11px] text-[#94a3b8]">Phone</Text>
          <Text className="text-[12px] text-[#1e293b]" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
            {order.accountPhone ?? '—'}
          </Text>
        </View>
      </View>

      <View className="mt-2 flex-row items-end justify-between border-t border-[#f1f5f9] pt-2">
        <View className="min-w-0 flex-1 pr-2">
          {smsKnown ? (
            <View className="flex-row items-center gap-1">
              {smsOk ? <Check color="#059669" size={14} /> : <TriangleAlert color="#d97706" size={14} />}
              <Text
                className={`text-[11px] ${smsOk ? 'text-[#059669]' : 'text-[#d97706]'}`}
                style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
              >
                {smsOk ? 'SMS received' : 'No SMS received'}
              </Text>
            </View>
          ) : null}
          {order.matchNote ? (
            <View className="mt-0.5 flex-row items-center gap-1">
              <Clock3 color="#94a3b8" size={12} />
              <Text className="text-[11px] text-[#64748b]" numberOfLines={1}>
                {order.matchNote}
              </Text>
            </View>
          ) : null}
        </View>
        {order.createdAt ? (
          <Text className="text-[11px] text-[#94a3b8]">{compactStamp(order.createdAt, timeZone)}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
