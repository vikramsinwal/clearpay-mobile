import { router, type Href } from 'expo-router';
import { CircleAlert, CircleCheck, Clock3 } from 'lucide-react-native';
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PAYIN_COPY, PAYIN_STATUS_LABEL } from '@/constants/payin';
import { isPayinOrderId } from '@/features/payin/api/payin-orders-api';
import { PayinChrome } from '@/features/payin/components/payin-chrome';
import { PayinErrorState, PayinListSkeleton } from '@/features/payin/components/payin-states';
import { usePayinOrder } from '@/features/payin/hooks/use-payin-orders';
import { formatMoneyMinor, formatOrderTimestamp, isHttpsUrl } from '@/features/payin/lib/format';
import { useAuthStore } from '@/stores/auth-store';
import { showAlert } from '@/lib/ui/alert';

export function PayinResultScreen({
  orderId,
  kind,
}: {
  orderId: string | null;
  kind: 'success' | 'failed' | 'expired';
}) {
  const validId = isPayinOrderId(orderId) ? orderId : null;
  const orderQuery = usePayinOrder(validId);
  const order = orderQuery.data;
  const timezone = useAuthStore((state) => state.customer?.profile?.timezone);

  const title =
    kind === 'success'
      ? PAYIN_COPY.successTitle
      : kind === 'expired'
        ? PAYIN_COPY.expiredTitle
        : PAYIN_COPY.failedTitle;

  function onContactSupport() {
    const support = process.env.EXPO_PUBLIC_SUPPORT_URL?.trim();
    if (support && (support.startsWith('mailto:') || isHttpsUrl(support))) {
      void Linking.openURL(support);
      return;
    }
    showAlert(PAYIN_COPY.contactSupport, PAYIN_COPY.supportMissing);
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f9f9ff]" edges={['top']}>
      <PayinChrome title={title} onBack={() => router.back()} />
      {!validId ? (
        <PayinErrorState message={PAYIN_COPY.detailFailed} onRetry={() => router.back()} />
      ) : orderQuery.isPending ? (
        <PayinListSkeleton />
      ) : orderQuery.isError || !order ? (
        <PayinErrorState
          message={PAYIN_COPY.detailFailed}
          onRetry={() => void orderQuery.refetch()}
        />
      ) : (
        <ScrollView
          contentContainerClassName="px-4 pb-10 pt-6"
          refreshControl={
            <RefreshControl
              refreshing={orderQuery.isRefetching}
              onRefresh={() => void orderQuery.refetch()}
            />
          }
        >
          <View className="items-center">
            <View
              className={`h-16 w-16 items-center justify-center rounded-full ${
                kind === 'success' ? 'bg-[#57fdc8]' : kind === 'expired' ? 'bg-[#dfe8ff]' : 'bg-[#ffdad6]'
              }`}
            >
              {kind === 'success' ? (
                <CircleCheck color="#007256" size={32} />
              ) : kind === 'expired' ? (
                <Clock3 color="#414754" size={32} />
              ) : (
                <CircleAlert color="#ba1a1a" size={32} />
              )}
            </View>
            <Text
              className="mt-4 text-[22px] text-[#0d1c32]"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {title}
            </Text>
            <Text className="mt-1 text-[13px] text-[#414754]">{PAYIN_STATUS_LABEL[order.status]}</Text>
          </View>

          <View className="mt-6 rounded-xl bg-white p-4">
            <Row label="Order ID" value={`#${order.displayId}`} />
            <Row
              label={PAYIN_COPY.amount}
              value={formatMoneyMinor(order.expectedInboundAmountMinor, order.currency)}
            />
            <Row
              label={PAYIN_COPY.accountSection}
              value={order.assignedAccountName ?? order.assignedAccountLabel ?? '—'}
            />
            {order.netAmountMinor != null ? (
              <Row
                label={PAYIN_COPY.netAmount}
                value={formatMoneyMinor(order.netAmountMinor, order.currency)}
              />
            ) : null}
            {order.transactionId ? (
              <Row label={PAYIN_COPY.transactionId} value={order.transactionId} />
            ) : null}
            {order.completedAt ? (
              <Row label={PAYIN_COPY.timestamp} value={formatOrderTimestamp(order.completedAt, timezone)} />
            ) : null}
            {kind !== 'success' ? (
              <Row
                label={PAYIN_COPY.failureReason}
                value={order.failureReason ?? PAYIN_COPY.noReason}
              />
            ) : null}
          </View>

          <View className="mt-4 gap-2">
            {kind === 'success' && order.transactionId ? (
              <Pressable
                className="h-12 items-center justify-center rounded-lg bg-[#0058bc]"
                onPress={() =>
                  router.push(`/payin-order?orderId=${encodeURIComponent(order.publicId)}` as Href)
                }
              >
                <Text className="text-white" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
                  {PAYIN_COPY.viewTransaction}
                </Text>
              </Pressable>
            ) : null}
            {kind !== 'success' ? (
              <Pressable
                className="h-12 items-center justify-center rounded-lg bg-[#d6e3ff]"
                onPress={onContactSupport}
              >
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{PAYIN_COPY.contactSupport}</Text>
              </Pressable>
            ) : null}
            <Pressable
              className="h-12 items-center justify-center rounded-lg bg-[#e8eeff]"
              onPress={() => router.replace('/payin' as Href)}
            >
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{PAYIN_COPY.backToPayins}</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3 flex-row items-start justify-between gap-3">
      <Text className="text-[12px] text-[#414754]">{label}</Text>
      <Text
        className="max-w-[65%] text-right text-[13px] text-[#0d1c32]"
        style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
      >
        {value}
      </Text>
    </View>
  );
}
