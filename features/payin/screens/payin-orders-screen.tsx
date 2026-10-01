import { router, type Href } from 'expo-router';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LIST_TAB_QUERY, PAYIN_COPY } from '@/constants/payin';
import { PayinChrome } from '@/features/payin/components/payin-chrome';
import { PayinFilterTabs } from '@/features/payin/components/payin-filter-tabs';
import { PayinOrderCard } from '@/features/payin/components/payin-order-card';
import { PayinEmptyState, PayinErrorState, PayinListSkeleton } from '@/features/payin/components/payin-states';
import { usePayinOrders } from '@/features/payin/hooks/use-payin-orders';
import { serverSkewMs } from '@/features/payin/lib/expiry';
import { payinResultKind } from '@/features/payin/lib/status';
import type { PayinListTab, PayinOrderListItem } from '@/features/payin/types';
import { useAuthStore } from '@/stores/auth-store';

export function PayinOrdersScreen({
  initialTab = 'all',
  title = PAYIN_COPY.listTitle,
}: {
  initialTab?: PayinListTab;
  title?: string;
}) {
  const [tab, setTab] = useState<PayinListTab>(initialTab);
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const timezone = useAuthStore((state) => state.customer?.profile?.timezone);
  const status = LIST_TAB_QUERY[tab];
  const listQuery = usePayinOrders({
    ...(status ? { status } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  });

  const items = useMemo(() => {
    const seen = new Set<string>();
    const next: PayinOrderListItem[] = [];
    for (const page of listQuery.data?.pages ?? []) {
      for (const item of page.items) {
        if (seen.has(item.publicId)) continue;
        seen.add(item.publicId);
        next.push(item);
      }
    }
    return next;
  }, [listQuery.data]);

  const firstPage = listQuery.data?.pages[0];
  const counts = firstPage?.counts ?? null;
  const total = firstPage?.total ?? null;
  const observedAt = listQuery.dataUpdatedAt;

  useEffect(() => {
    if (items.length === 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [items.length]);

  function openOrder(publicId: string, statusValue: PayinOrderListItem['status']) {
    const result = payinResultKind(statusValue);
    if (result) {
      router.push(
        `/payin-result?orderId=${encodeURIComponent(publicId)}&kind=${result}` as Href,
      );
      return;
    }
    router.push(`/payin-order?orderId=${encodeURIComponent(publicId)}` as Href);
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f9f9ff]" edges={['top']}>
      <PayinChrome title={title} onBack={() => router.back()} />
      <View className="flex-row items-center gap-2 px-3.5 pt-3">
        <View className="h-10 flex-1 flex-row items-center rounded-xl border border-[#e2e8f0] bg-white px-3">
          <Search color="#94a3b8" size={16} />
          <TextInput
            className="ml-2 flex-1 py-2 text-[12px] text-[#1e293b]"
            placeholder="Search by ID, UTR, Account..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <Pressable
          accessibilityLabel="Filter records"
          className="h-10 w-10 items-center justify-center rounded-xl border border-[#e2e8f0] bg-white"
          onPress={() => setTab(tab === 'failed' ? 'pending' : 'failed')}
        >
          <SlidersHorizontal color="#475569" size={16} />
        </Pressable>
      </View>
      <PayinFilterTabs
        counts={counts}
        selected={tab}
        total={total}
        onSelect={setTab}
      />
      {listQuery.isPending && !listQuery.data ? (
        <PayinListSkeleton />
      ) : listQuery.isError && !listQuery.data ? (
        <PayinErrorState
          message={PAYIN_COPY.loadFailed}
          onRetry={() => void listQuery.refetch()}
        />
      ) : (
        <FlatList
          contentContainerClassName="px-3.5 pb-8 pt-3"
          data={items}
          keyExtractor={(item) => item.publicId}
          ListEmptyComponent={
            <PayinEmptyState actionLabel={PAYIN_COPY.retry} onAction={() => void listQuery.refetch()} />
          }
          ListFooterComponent={
            <View className="items-center py-3">
              {listQuery.isFetchingNextPage ? <ActivityIndicator color="#2563eb" /> : null}
              {firstPage && firstPage.totalPages > 0 ? (
                <Text className="mt-2 text-[12px] text-[#475569]">
                  {firstPage.page} of {firstPage.totalPages}
                </Text>
              ) : null}
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={listQuery.isRefetching && !listQuery.isFetchingNextPage}
              onRefresh={() => void listQuery.refetch()}
            />
          }
          renderItem={({ item }) => (
            <PayinOrderCard
              deviceNowMs={now}
              order={item}
              skewMs={item.serverTime ? serverSkewMs(item.serverTime, observedAt) : 0}
              timeZone={timezone}
              onPress={(publicId) => openOrder(publicId, item.status)}
            />
          )}
          onEndReached={() => {
            if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
              void listQuery.fetchNextPage();
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}
