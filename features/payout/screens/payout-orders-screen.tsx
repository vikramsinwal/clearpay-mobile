import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PAYOUT_COPY } from '@/constants/payout';
import { PayoutChrome } from '@/features/payout/components/payout-chrome';
import { PayoutFilterSheet } from '@/features/payout/components/payout-filter-sheet';
import { PayoutOrderCard } from '@/features/payout/components/payout-order-card';
import { PayoutSummaryChips } from '@/features/payout/components/payout-summary-chips';
import { usePayoutOrdersQuery } from '@/features/payout/hooks/use-payout-orders';
import { payoutErrorMessage } from '@/features/payout/lib/payout-errors';
import { serverSkewMs } from '@/features/payout/lib/presentation';
import type { PayoutListFilters, PayoutOrderListItem, PayoutSummaryStatus } from '@/features/payout/types';

export function PayoutOrdersScreen() {
  const router = useRouter();
  const [filters, setFilters] = useState<PayoutListFilters>({});
  const [debounced, setDebounced] = useState<PayoutListFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const listQuery = usePayoutOrdersQuery(debounced);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(filters), 300);
    return () => clearTimeout(id);
  }, [filters]);

  const items = useMemo(() => {
    const seen = new Set<string>();
    const next: PayoutOrderListItem[] = [];
    for (const page of listQuery.data?.pages ?? []) {
      for (const item of page.items) {
        if (seen.has(item.publicId)) continue;
        seen.add(item.publicId);
        next.push(item);
      }
    }
    return next;
  }, [listQuery.data]);

  const counts = listQuery.data?.pages[0]?.counts ?? null;
  const observedAt = listQuery.dataUpdatedAt;
  const serverTime = listQuery.data?.pages[0]?.serverTime ?? null;

  useEffect(() => {
    if (items.length === 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [items.length]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <PayoutChrome title={PAYOUT_COPY.listTitle} onBack={() => router.back()} />
      <PayoutSummaryChips
        counts={counts}
        selected={filters.status ?? null}
        onSelect={(status: PayoutSummaryStatus | null) =>
          setFilters((current) => ({ ...current, status: status ?? undefined }))
        }
      />
      <Pressable className="mx-4 mb-2 self-start" onPress={() => setFiltersOpen(true)}>
        <Text className="text-[13px] text-blue" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
          {PAYOUT_COPY.filters}
        </Text>
      </Pressable>
      {listQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1B6CA8" />
        </View>
      ) : listQuery.isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-[14px] text-slate-600">
            {payoutErrorMessage(listQuery.error, PAYOUT_COPY.loadFailed)}
          </Text>
          <Pressable className="mt-4" onPress={() => void listQuery.refetch()}>
            <Text className="text-[15px] text-blue-600">{PAYOUT_COPY.retry}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          contentContainerClassName="px-4 pb-8"
          data={items}
          keyExtractor={(item) => item.publicId}
          ListEmptyComponent={
            <Text className="mt-10 text-center text-[14px] text-slate-500">{PAYOUT_COPY.empty}</Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={listQuery.isRefetching && !listQuery.isFetchingNextPage}
              onRefresh={() => void listQuery.refetch()}
            />
          }
          renderItem={({ item }) => (
            <PayoutOrderCard
              deviceNowMs={now}
              order={item}
              skewMs={serverTime ? serverSkewMs(serverTime, observedAt) : 0}
              onPress={(publicId) =>
                router.push(`/payout-order?orderId=${encodeURIComponent(publicId)}` as Href)
              }
            />
          )}
          onEndReached={() => {
            if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
              void listQuery.fetchNextPage();
            }
          }}
        />
      )}
      <PayoutFilterSheet
        value={filters}
        visible={filtersOpen}
        onApply={setFilters}
        onClose={() => setFiltersOpen(false)}
      />
    </SafeAreaView>
  );
}
