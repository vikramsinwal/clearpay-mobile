import { router, type Href } from 'expo-router';
import { ChevronRight, Landmark } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ACCOUNTS_PAGE_SIZE } from '@/constants/accounts';
import { PAYIN_COPY, PAYIN_STATUS_LABEL } from '@/constants/payin';
import { useAccountsInfiniteQuery } from '@/features/accounts/hooks/use-accounts';
import { connectivityLabel } from '@/features/accounts/lib/format-account';
import { PayinChrome } from '@/features/payin/components/payin-chrome';
import { PayinOrderCard } from '@/features/payin/components/payin-order-card';
import {
  PayinDashboardSkeleton,
  PayinEmptyState,
  PayinErrorState,
} from '@/features/payin/components/payin-states';
import { usePayinOrders } from '@/features/payin/hooks/use-payin-orders';
import { formatMoneyMinor } from '@/features/payin/lib/format';
import { payinResultKind } from '@/features/payin/lib/status';
import { useDashboardSummaryQuery } from '@/features/home/hooks/use-home-queries';
import { useFeeStructureQuery } from '@/features/profile/hooks/use-account-settings';
import { formatBps, formatFeeSource } from '@/features/profile/lib/format-account';
import type { PayinOrderListItem } from '@/features/payin/types';
import { useAuthStore } from '@/stores/auth-store';

export function PayinDashboardScreen() {
  const [now] = useState(() => Date.now());
  const timezone = useAuthStore((state) => state.customer?.profile?.timezone);
  const summaryQuery = useDashboardSummaryQuery();
  const accountsQuery = useAccountsInfiniteQuery({
    kind: 'upi_bank',
    limit: ACCOUNTS_PAGE_SIZE,
  });
  const ordersQuery = usePayinOrders({ limit: 5 });
  const feesQuery = useFeeStructureQuery();

  const accountSummary = accountsQuery.data?.pages[0]?.summary ?? null;
  const activePayin = accountSummary?.activePayin ?? null;
  const accounts = useMemo(
    () => accountsQuery.data?.pages[0]?.items ?? [],
    [accountsQuery.data],
  );
  const activeAccount = accounts.find((item) => item.publicId === activePayin?.publicId) ?? null;
  const recent = useMemo(() => {
    const seen = new Set<string>();
    const next: PayinOrderListItem[] = [];
    for (const item of ordersQuery.data?.pages[0]?.items ?? []) {
      if (seen.has(item.publicId)) continue;
      seen.add(item.publicId);
      next.push(item);
    }
    return next.slice(0, 5);
  }, [ordersQuery.data]);

  const counts = ordersQuery.data?.pages[0]?.counts ?? null;
  const totals = ordersQuery.data?.pages[0]?.totals ?? null;
  const dashboard = summaryQuery.data?.summary;
  const fees = feesQuery.data;
  const connected = accounts.filter((item) => item.connectivity === 'connected').length;
  const payinReady = activeAccount?.payin.status === 'ACTIVE' && activeAccount.connectivity === 'connected';

  const loading =
    (summaryQuery.isPending && !summaryQuery.data) ||
    (accountsQuery.isPending && !accountsQuery.data) ||
    (ordersQuery.isPending && !ordersQuery.data);
  const failed =
    !summaryQuery.data &&
    !accountsQuery.data &&
    !ordersQuery.data &&
    (summaryQuery.isError || accountsQuery.isError || ordersQuery.isError);

  const refresh = () => {
    void Promise.all([
      summaryQuery.refetch(),
      accountsQuery.refetch(),
      ordersQuery.refetch(),
      feesQuery.refetch(),
    ]);
  };

  function openOrder(item: PayinOrderListItem) {
    const result = payinResultKind(item.status);
    if (result) {
      router.push(`/payin-result?orderId=${encodeURIComponent(item.publicId)}&kind=${result}` as Href);
      return;
    }
    router.push(`/payin-order?orderId=${encodeURIComponent(item.publicId)}` as Href);
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f9f9ff]" edges={['top']}>
      <PayinChrome title={PAYIN_COPY.dashboardTitle} />
      {loading ? (
        <PayinDashboardSkeleton />
      ) : failed ? (
        <PayinErrorState message={PAYIN_COPY.dashboardFailed} onRetry={refresh} />
      ) : (
        <ScrollView
          contentContainerClassName="px-4 pb-10 pt-4"
          refreshControl={
            <RefreshControl
              refreshing={
                summaryQuery.isRefetching ||
                accountsQuery.isRefetching ||
                ordersQuery.isRefetching
              }
              onRefresh={refresh}
            />
          }
        >
          <View
            className={`mb-3 rounded-xl p-4 ${
              payinReady ? 'bg-[#e6fff6]' : 'bg-[#dfe8ff]'
            }`}
          >
            <Text className="text-[11px] uppercase tracking-wider text-[#414754]">
              {PAYIN_COPY.dashboardStatus}
            </Text>
            <Text
              className="mt-1 text-[18px] text-[#0d1c32]"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {payinReady
                ? PAYIN_STATUS_LABEL.PENDING_PAYMENT
                : activePayin
                  ? PAYIN_COPY.activeAccount
                  : PAYIN_COPY.noActiveAccount}
            </Text>
            <Text className="mt-1 text-[13px] text-[#414754]">
              {payinReady
                ? `${PAYIN_COPY.activeAccount}: ${activePayin?.name ?? '—'}`
                : PAYIN_COPY.connectAccount}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            className="mb-3 flex-row items-center justify-between rounded-xl bg-white p-4"
            onPress={() =>
              router.push(
                (activeAccount
                  ? `/payin-account?accountId=${encodeURIComponent(activeAccount.publicId)}`
                  : '/payin-accounts') as Href,
              )
            }
          >
            <View className="min-w-0 flex-1 flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#d8e2ff]">
                <Landmark color="#0058bc" size={20} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-[11px] uppercase tracking-wider text-[#414754]">
                  {PAYIN_COPY.activeAccount}
                </Text>
                <Text
                  className="text-[15px] text-[#0d1c32]"
                  numberOfLines={1}
                  style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                >
                  {activePayin?.name ?? PAYIN_COPY.noActiveAccount}
                </Text>
                {activeAccount ? (
                  <Text className="text-[12px] text-[#414754]">
                    {activeAccount.provider || '—'} · {connectivityLabel(activeAccount.connectivity)}
                  </Text>
                ) : null}
              </View>
            </View>
            <ChevronRight color="#414754" size={18} />
          </Pressable>

          <View className="mb-3 flex-row gap-3">
            <StatTile
              label={PAYIN_COPY.todayAmount}
              value={
                totals?.todayAmountMinor != null
                  ? formatMoneyMinor(totals.todayAmountMinor, totals.currency ?? 'INR')
                  : '—'
              }
            />
            <StatTile
              label={PAYIN_COPY.totalAmount}
              value={
                totals?.totalAmountMinor != null
                  ? formatMoneyMinor(totals.totalAmountMinor, totals.currency ?? 'INR')
                  : '—'
              }
            />
          </View>
          <View className="mb-3 flex-row gap-3">
            <StatTile
              label={PAYIN_COPY.pendingCount}
              value={counts ? String(counts.pending) : dashboard ? String(dashboard.activity.activePayins) : '—'}
              onPress={() => router.push('/payin-orders?tab=pending' as Href)}
            />
            <StatTile
              label={PAYIN_COPY.completedCount}
              value={
                counts
                  ? String(counts.completed)
                  : dashboard
                    ? String(dashboard.activity.successfulPayins)
                    : '—'
              }
              onPress={() => router.push('/payin-orders?tab=completed' as Href)}
            />
          </View>
          <View className="mb-3 flex-row gap-3">
            <StatTile
              label={PAYIN_COPY.failedCount}
              value={counts ? String(counts.failed) : '—'}
              onPress={() => router.push('/payin-orders?tab=failed' as Href)}
            />
            <StatTile
              label={PAYIN_COPY.availableAccounts}
              value={String(connected)}
              onPress={() => router.push('/payin-accounts' as Href)}
            />
          </View>

          <View className="mb-3 rounded-xl bg-white p-4">
            <Text
              className="text-[14px] text-[#0d1c32]"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {PAYIN_COPY.feeInfo}
            </Text>
            {fees ? (
              <Text className="mt-1 text-[13px] text-[#414754]">
                {fees.unit === 'bps' ? formatBps(fees.payinFee) : String(fees.payinFee)} ·{' '}
                {formatFeeSource(fees.source.payinFee)}
              </Text>
            ) : (
              <Text className="mt-1 text-[13px] text-[#414754]">{PAYIN_COPY.feeUnavailable}</Text>
            )}
          </View>

          <View className="mb-2 flex-row items-center justify-between">
            <Text
              className="text-[16px] text-[#0d1c32]"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {PAYIN_COPY.recent}
            </Text>
            <Pressable onPress={() => router.push('/payin-orders' as Href)}>
              <Text
                className="text-[13px] text-[#0058bc]"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                {PAYIN_COPY.viewAll}
              </Text>
            </Pressable>
          </View>

          {recent.length === 0 ? (
            <PayinEmptyState
              actionLabel={PAYIN_COPY.connectAccount}
              onAction={() => router.push('/payin-accounts' as Href)}
            />
          ) : (
            recent.map((item) => (
              <PayinOrderCard
                key={item.publicId}
                deviceNowMs={now}
                order={item}
                skewMs={0}
                timeZone={timezone}
                onPress={() => openOrder(item)}
              />
            ))
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatTile({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const inner = (
    <View className="flex-1 rounded-xl bg-white p-3">
      <Text className="text-[11px] uppercase tracking-wider text-[#414754]">{label}</Text>
      <Text
        className="mt-1 text-[18px] text-[#0d1c32]"
        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
      >
        {value}
      </Text>
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable accessibilityRole="button" className="flex-1" onPress={onPress}>
      {inner}
    </Pressable>
  );
}
