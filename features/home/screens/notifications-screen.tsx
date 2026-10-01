import { ArrowLeft, ChevronUp } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NotificationCard } from '@/features/home/components/notification-card';
import {
  NotificationEmptyState,
  NotificationErrorState,
  NotificationSkeletonList,
} from '@/features/home/components/notification-states';
import { openNotificationAction } from '@/features/home/lib/notification-action';
import { TopHeader } from '@/components/brand/top-header';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsInfiniteQuery,
} from '@/features/home/hooks/use-home-queries';
import type { CustomerNotification, NotificationAction } from '@/features/home/types';
import { useAppTheme } from '@/lib/theme';

export function NotificationsScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<CustomerNotification>>(null);
  const { isDark, colors } = useAppTheme();
  const [showScrollTop, setShowScrollTop] = useState(false);

  const listQuery = useNotificationsInfiniteQuery();
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();

  const items = useMemo(() => {
    const seen = new Set<string>();
    const next: CustomerNotification[] = [];
    for (const page of listQuery.data?.pages ?? []) {
      for (const item of page.items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        next.push(item);
      }
    }
    return next;
  }, [listQuery.data]);

  const firstPage = listQuery.data?.pages[0];
  const unreadCount = firstPage?.unreadCount;
  const totalCount = firstPage?.total ?? null;
  const hasUnread = (unreadCount ?? 0) > 0;
  const totalLabel = totalCount == null ? '—' : String(totalCount);
  const unreadLabel = unreadCount == null ? '—' : String(unreadCount);
  const pendingId = markReadMutation.isPending ? markReadMutation.variables : null;

  const showSkeleton = listQuery.isPending && !listQuery.data;
  const showError = listQuery.isError && !listQuery.data;
  const refreshing = listQuery.isRefetching && !listQuery.isFetchingNextPage;

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(isDark ? 'light' : 'dark');
      return () => setStatusBarStyle('dark');
    }, [isDark]),
  );

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.navigate('/');
  }, [router]);

  const onRefresh = useCallback(() => {
    if (
      listQuery.isPending ||
      listQuery.isFetchingNextPage ||
      listQuery.isRefetching
    ) {
      return;
    }
    void listQuery.refetch();
  }, [listQuery]);

  const onMarkRead = useCallback(
    (id: string) => {
      markReadMutation.mutate(id);
    },
    [markReadMutation],
  );

  const onAction = useCallback(
    (action: NotificationAction) => {
      void openNotificationAction(action, router, '/notifications');
    },
    [router],
  );

  const onEndReached = useCallback(() => {
    if (
      !listQuery.hasNextPage ||
      listQuery.isPending ||
      listQuery.isFetchingNextPage ||
      listQuery.isRefetching
    ) {
      return;
    }
    void listQuery.fetchNextPage();
  }, [listQuery]);

  const renderItem = useCallback(
    ({ item }: { item: CustomerNotification }) => (
      <NotificationCard
        colors={colors}
        item={item}
        pending={pendingId === item.id}
        onAction={onAction}
        onMarkRead={onMarkRead}
      />
    ),
    [colors, onAction, onMarkRead, pendingId],
  );

  return (
    <SafeAreaView
      className="flex-1 bg-app-background dark:bg-navy-900"
      edges={['top']}
    >
      <TopHeader title="Notifications" />

      <View className="flex-row items-center justify-between border-b border-app-border bg-app-surface px-4 py-3 dark:border-navy-700 dark:bg-navy-800">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            className="items-center justify-center p-1"
            hitSlop={12}
            onPress={goBack}
          >
            <ArrowLeft color={colors.primary} size={16} strokeWidth={2.5} />
          </Pressable>
          <Text
            className="shrink text-xs text-slate-600 dark:text-navy-200"
            style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
          >
            Total:{' '}
            <Text className="text-slate-800 dark:text-white" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
              {totalLabel}
            </Text>
            {'   '}
            Unread:{' '}
            <Text className="text-slate-800 dark:text-white" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
              {unreadLabel}
            </Text>
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Mark all as read"
          accessibilityRole="button"
          className="min-h-11 items-center justify-center rounded-md border border-slate-300 bg-app-surface px-3 py-1 dark:border-navy-600 dark:bg-navy-800"
          disabled={!hasUnread || markAllReadMutation.isPending}
          onPress={() => markAllReadMutation.mutate()}
          style={{ opacity: hasUnread ? 1 : 0.45 }}
        >
          {markAllReadMutation.isPending ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text
              className="text-xs text-slate-600 dark:text-navy-100"
              style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
            >
              Mark all as read
            </Text>
          )}
        </Pressable>
      </View>

      {showSkeleton ? (
        <NotificationSkeletonList />
      ) : showError ? (
        <NotificationErrorState onRetry={() => void listQuery.refetch()} />
      ) : (
        <FlatList
          ref={listRef}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: 96,
            flexGrow: 1,
          }}
          data={items}
          extraData={pendingId}
          initialNumToRender={8}
          ItemSeparatorComponent={ItemSeparator}
          keyExtractor={keyExtractor}
          ListEmptyComponent={<NotificationEmptyState colors={colors} />}
          ListFooterComponent={
            listQuery.isFetchingNextPage ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.primary}
              onRefresh={onRefresh}
            />
          }
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          onScroll={(event) => setShowScrollTop(event.nativeEvent.contentOffset.y > 160)}
          scrollEventThrottle={16}
        />
      )}

      {showScrollTop && !showSkeleton && !showError ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(180)}
          className="absolute bottom-4 right-4"
        >
          <Pressable
            accessibilityLabel="Scroll to top"
            accessibilityRole="button"
            className="h-10 w-10 items-center justify-center rounded-full bg-app-primary shadow-lg active:opacity-90"
            onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
          >
            <ChevronUp color={colors.white} size={20} strokeWidth={2} />
          </Pressable>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

function ItemSeparator() {
  return <View className="h-3" />;
}

function keyExtractor(item: CustomerNotification) {
  return item.id;
}
