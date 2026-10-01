import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import {
  ChevronUp,
  Filter,
  Plus,
  Search,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { TopHeader } from '@/components/brand/top-header';
import { ACCOUNTS_COPY, ACCOUNTS_PAGE_SIZE } from '@/constants/accounts';
import { AccountCard } from '@/features/accounts/components/account-card';
import { AccountDetailsBody } from '@/features/accounts/components/account-details-body';
import { AccountSkeletonList } from '@/features/accounts/components/account-skeleton';
import { AddAccountForm } from '@/features/accounts/components/add-account-form';
import {
  AccountsFilterBody,
  type AccountFilters,
} from '@/features/accounts/components/accounts-filter-body';
import { AccountsSheet } from '@/features/accounts/components/accounts-sheet';
import {
  useAccountsInfiniteQuery,
  useActivateAccountMutation,
  useDeactivateAccountMutation,
  useDeleteAccountMutation,
  useReconnectAccountMutation,
} from '@/features/accounts/hooks/use-accounts';
import { clampPercent } from '@/features/accounts/lib/format-account';
import { accountProvidersFor } from '@/features/accounts/lib/providers';
import type {
  AccountChannel,
  AccountKind,
  ReceivingAccount,
} from '@/features/accounts/types';
import { ApiClientError } from '@/lib/api/errors';
import { useNotificationCountQuery } from '@/features/home/hooks/use-home-queries';
import { useAppTheme } from '@/lib/theme';
import { showAlert } from '@/lib/ui/alert';

type ConfirmState = {
  account: ReceivingAccount;
  channel: AccountChannel | null;
  mode: 'activate' | 'deactivate' | 'delete';
  replacesName: string | null;
};

function describeError(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError && error.message.trim()) return error.message;
  return fallback;
}

function useDebounced(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function countLabel(value: number | undefined): string {
  return value == null ? '—' : String(value);
}

export function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ReceivingAccount>>(null);
  const { isDark, colors } = useAppTheme();
  const [kind, setKind] = useState<AccountKind>('upi_bank');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 400);
  const [filters, setFilters] = useState<AccountFilters>({});
  const [draftFilters, setDraftFilters] = useState<AccountFilters>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addKind, setAddKind] = useState<AccountKind>('upi_bank');
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const notificationCountQuery = useNotificationCountQuery();
  const listParams = useMemo(
    () => ({
      kind,
      limit: ACCOUNTS_PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      status: filters.status,
      provider: filters.provider,
      payinStatus: filters.payinStatus,
      payoutStatus: filters.payoutStatus,
      connectivity: filters.connectivity,
      verification: filters.verification,
    }),
    [debouncedSearch, filters, kind],
  );
  const listQuery = useAccountsInfiniteQuery(listParams);
  const activate = useActivateAccountMutation();
  const deactivate = useDeactivateAccountMutation();
  const reconnect = useReconnectAccountMutation();
  const removeAccount = useDeleteAccountMutation();

  const items = useMemo(() => {
    const seen = new Set<string>();
    const next: ReceivingAccount[] = [];
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
  const summary = firstPage?.summary ?? null;
  const total = firstPage?.total;
  const showSkeleton = listQuery.isPending && !listQuery.data;
  const showError = listQuery.isError && !listQuery.data;
  const refreshing = listQuery.isRefetching && !listQuery.isFetchingNextPage;

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(isDark ? 'light' : 'dark');
      return () => setStatusBarStyle('dark');
    }, [isDark]),
  );

  const onRefresh = useCallback(() => {
    void listQuery.refetch();
    void notificationCountQuery.refetch();
  }, [listQuery, notificationCountQuery]);

  const requestActivate = useCallback(
    (account: ReceivingAccount, channel: AccountChannel) => {
      const current =
        channel === 'payin' ? summary?.activePayin : summary?.activePayout;
      if (current?.publicId === account.publicId) return;
      setConfirm({
        account,
        channel,
        mode: 'activate',
        replacesName:
          current && current.publicId !== account.publicId ? current.name : null,
      });
    },
    [summary?.activePayin, summary?.activePayout],
  );

  const requestDeactivate = useCallback(
    (account: ReceivingAccount, channel: AccountChannel) => {
      setConfirm({ account, channel, mode: 'deactivate', replacesName: null });
    },
    [],
  );

  const requestDelete = useCallback((account: ReceivingAccount) => {
    setConfirm({ account, channel: null, mode: 'delete', replacesName: null });
  }, []);

  const runConfirm = useCallback(async () => {
    if (!confirm) return;
    try {
      if (confirm.mode === 'activate' && confirm.channel) {
        await activate.mutateAsync({
          publicId: confirm.account.publicId,
          channel: confirm.channel,
        });
        showAlert(
          confirm.channel === 'payin'
            ? ACCOUNTS_COPY.payinUpdated
            : ACCOUNTS_COPY.payoutUpdated,
        );
      } else if (confirm.mode === 'deactivate' && confirm.channel) {
        await deactivate.mutateAsync({
          publicId: confirm.account.publicId,
          channel: confirm.channel,
        });
        showAlert(ACCOUNTS_COPY.deactivated);
      } else if (confirm.mode === 'delete') {
        await removeAccount.mutateAsync(confirm.account.publicId);
        setDetailsId(null);
        showAlert(ACCOUNTS_COPY.deleted);
      }
      setConfirm(null);
    } catch (error) {
      const fallback =
        confirm.mode === 'delete' ? ACCOUNTS_COPY.deleteFailed : ACCOUNTS_COPY.actionFailed;
      showAlert(fallback, describeError(error, fallback));
    }
  }, [activate, confirm, deactivate, removeAccount]);

  const onReconnect = useCallback(
    async (publicId: string) => {
      try {
        await reconnect.mutateAsync(publicId);
        showAlert(ACCOUNTS_COPY.reconnected);
      } catch (error) {
        showAlert(ACCOUNTS_COPY.actionFailed, describeError(error, ACCOUNTS_COPY.actionFailed));
      }
    },
    [reconnect],
  );

  const onCopy = useCallback(async (value: string) => {
    await Clipboard.setStringAsync(value);
    showAlert(ACCOUNTS_COPY.copied);
  }, []);

  const pendingFor = useCallback(
    (publicId: string): AccountChannel | null => {
      const pending = activate.isPending
        ? activate.variables
        : deactivate.isPending
          ? deactivate.variables
          : null;
      if (!pending || pending.publicId !== publicId) return null;
      return pending.channel;
    },
    [
      activate.isPending,
      activate.variables,
      deactivate.isPending,
      deactivate.variables,
    ],
  );

  const renderItem = useCallback(
    ({ item }: { item: ReceivingAccount }) => (
      <AccountCard
        account={item}
        pendingChannel={pendingFor(item.publicId)}
        onActivate={requestActivate}
        onDeactivate={requestDeactivate}
        onOpen={setDetailsId}
      />
    ),
    [pendingFor, requestActivate, requestDeactivate],
  );

  const confirmBusy =
    activate.isPending || deactivate.isPending || removeAccount.isPending;

  const filtersActive = Boolean(
    filters.status ||
      filters.provider ||
      filters.payinStatus ||
      filters.payoutStatus ||
      filters.connectivity ||
      filters.verification,
  );

  const loadedCount = items.length;
  const totalLabel = total == null ? '—' : String(total);
  const headerCount = summary?.total ?? total;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-navy-900" edges={['top']}>
      <TopHeader title={ACCOUNTS_COPY.title} />
      <View className="border-b border-slate-100 bg-white px-4 py-2.5 dark:border-navy-700 dark:bg-navy-800">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-navy-700">
              <Text
                className="text-[11px] text-slate-500 dark:text-navy-100"
                style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
              >
                {countLabel(headerCount)} {ACCOUNTS_COPY.totalSuffix}
              </Text>
            </View>
          </View>
          <View className="flex-row rounded-lg bg-slate-100 p-0.5 dark:bg-navy-900">
            {(['upi_bank', 'gateway'] as const).map((option) => {
              const selectedTab = kind === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedTab }}
                  className={`rounded-md px-2.5 py-1 ${selectedTab ? 'bg-white dark:bg-navy-700' : ''}`}
                  onPress={() => {
                    setKind(option);
                    setFilters((current) => ({ ...current, provider: undefined }));
                  }}
                >
                  <Text
                    className={`text-[11px] ${selectedTab ? 'text-blue' : 'text-slate-500'}`}
                    style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                  >
                    {option === 'upi_bank' ? ACCOUNTS_COPY.tabUpi : ACCOUNTS_COPY.tabGateways}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {showSkeleton ? (
        <AccountSkeletonList />
      ) : showError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text
            className="text-base text-slate-900 dark:text-white"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {ACCOUNTS_COPY.errorTitle}
          </Text>
          <Text
            className="mt-1 text-center text-sm text-slate-500"
            style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
          >
            {ACCOUNTS_COPY.errorBody}
          </Text>
          <Pressable
            accessibilityRole="button"
            className="mt-4 min-h-11 items-center justify-center rounded-lg bg-blue px-5"
            onPress={() => void listQuery.refetch()}
          >
            <Text className="text-sm text-white" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
              {ACCOUNTS_COPY.retry}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: 120 + insets.bottom,
            flexGrow: 1,
          }}
          data={items}
          initialNumToRender={8}
          ItemSeparatorComponent={Separator}
          keyExtractor={keyExtractor}
          ListEmptyComponent={
            <View className="items-center px-6 py-16">
              <Text
                className="text-base text-slate-900 dark:text-white"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                {ACCOUNTS_COPY.emptyTitle}
              </Text>
              <Text
                className="mt-2 text-center text-sm text-slate-500"
                style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
              >
                {ACCOUNTS_COPY.emptyBody}
              </Text>
              <Pressable
                accessibilityRole="button"
                className="mt-4 min-h-11 flex-row items-center gap-1 rounded-lg bg-blue px-4"
                onPress={() => {
                  setAddKind(kind);
                  setAddOpen(true);
                }}
              >
                <Plus color="#FFFFFF" size={16} />
                <Text className="text-sm text-white" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
                  {ACCOUNTS_COPY.addAccount}
                </Text>
              </Pressable>
            </View>
          }
          ListFooterComponent={
            items.length > 0 ? (
              <View className="items-center py-3">
                <Text
                  className="text-[11px] text-slate-400"
                  style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
                >
                  {ACCOUNTS_COPY.showing} {loadedCount} {ACCOUNTS_COPY.of} {totalLabel}{' '}
                  {ACCOUNTS_COPY.accounts}
                </Text>
                {listQuery.hasNextPage ? (
                  <Pressable
                    accessibilityRole="button"
                    className="mt-2 min-h-11 items-center justify-center"
                    disabled={listQuery.isFetchingNextPage}
                    onPress={() => void listQuery.fetchNextPage()}
                  >
                    {listQuery.isFetchingNextPage ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <Text
                        className="text-xs text-blue"
                        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                      >
                        {ACCOUNTS_COPY.loadMore}
                      </Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
            ) : null
          }
          ListHeaderComponent={
            <View className="mb-3 gap-3">
              <View className="flex-row gap-2.5">
                <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3 dark:border-navy-700 dark:bg-navy-800">
                  <Text
                    className="text-[11px] uppercase tracking-wider text-slate-500"
                    style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
                  >
                    {ACCOUNTS_COPY.inWork}
                  </Text>
                  <View className="mt-1 flex-row items-end justify-between">
                    <Text
                      className="text-2xl text-slate-900 dark:text-white"
                      style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                    >
                      {countLabel(summary?.inWork)}
                    </Text>
                    <Text
                      className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue"
                      style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                    >
                      {summary?.inWorkPercent == null
                        ? '—'
                        : `${clampPercent(summary.inWorkPercent)}%`}
                    </Text>
                  </View>
                  <View className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                    <View
                      className="h-1 rounded-full bg-blue"
                      style={{ width: `${clampPercent(summary?.inWorkPercent ?? null)}%` }}
                    />
                  </View>
                </View>
                <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3 dark:border-navy-700 dark:bg-navy-800">
                  <Text
                    className="text-[11px] uppercase tracking-wider text-slate-500"
                    style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
                  >
                    {ACCOUNTS_COPY.active}
                  </Text>
                  <Text
                    className="mt-1 text-[12px] text-slate-800 dark:text-white"
                    numberOfLines={1}
                    style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                  >
                    {ACCOUNTS_COPY.payin}: {summary?.activePayin?.name ?? ACCOUNTS_COPY.standby}
                  </Text>
                  <Text
                    className="mt-0.5 text-[12px] text-slate-800 dark:text-white"
                    numberOfLines={1}
                    style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                  >
                    {ACCOUNTS_COPY.payout}: {summary?.activePayout?.name ?? ACCOUNTS_COPY.standby}
                  </Text>
                  <View className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                    <View
                      className="h-1 rounded-full bg-emerald-500"
                      style={{
                        width: `${
                          (summary?.activePayin ? 50 : 0) + (summary?.activePayout ? 50 : 0)
                        }%`,
                      }}
                    />
                  </View>
                </View>
              </View>

              <View className="flex-row items-center gap-2">
                <View className="h-11 flex-1 flex-row items-center rounded-xl border border-slate-200 bg-white px-3 dark:border-navy-700 dark:bg-navy-800">
                  <Search color="#94A3B8" size={16} />
                  <TextInput
                    className="ml-2 flex-1 text-xs text-slate-800 dark:text-white"
                    placeholder={ACCOUNTS_COPY.searchPlaceholder}
                    placeholderTextColor="#94A3B8"
                    returnKeyType="search"
                    value={search}
                    onChangeText={setSearch}
                  />
                  {search.length > 0 ? (
                    <Pressable
                      accessibilityLabel={ACCOUNTS_COPY.clearSearch}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => setSearch('')}
                    >
                      <X color="#94A3B8" size={14} />
                    </Pressable>
                  ) : null}
                </View>
                <Pressable
                  accessibilityLabel={ACCOUNTS_COPY.filters}
                  accessibilityRole="button"
                  className="h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-navy-700 dark:bg-navy-800"
                  onPress={() => {
                    setDraftFilters(filters);
                    setFilterOpen(true);
                  }}
                >
                  <Filter color={filtersActive ? colors.primary : '#334155'} size={16} />
                </Pressable>
                <Pressable
                  accessibilityLabel={ACCOUNTS_COPY.addAccount}
                  accessibilityRole="button"
                  className="h-11 w-11 items-center justify-center rounded-xl bg-blue"
                  onPress={() => {
                    setAddKind(kind);
                    setAddOpen(true);
                  }}
                >
                  <Plus color="#FFFFFF" size={16} strokeWidth={2.5} />
                </Pressable>
              </View>

              <View className="flex-row flex-wrap gap-1.5">
                <QuickChip
                  label={`${ACCOUNTS_COPY.all} (${countLabel(summary?.counts.all)})`}
                  selected={!filters.status && !filters.provider}
                  onPress={() =>
                    setFilters((current) => ({
                      ...current,
                      status: undefined,
                      provider: undefined,
                    }))
                  }
                />
                <QuickChip
                  label={`${ACCOUNTS_COPY.activeFilter} (${countLabel(summary?.counts.active)})`}
                  selected={filters.status === 'active'}
                  onPress={() =>
                    setFilters((current) => ({ ...current, status: 'active' }))
                  }
                />
                <QuickChip
                  label={`${ACCOUNTS_COPY.inactiveFilter} (${countLabel(summary?.counts.inactive)})`}
                  selected={filters.status === 'inactive'}
                  onPress={() =>
                    setFilters((current) => ({ ...current, status: 'inactive' }))
                  }
                />
                {accountProvidersFor(kind).map((provider) => (
                  <QuickChip
                    key={provider.id}
                    label={provider.label}
                    selected={filters.provider === provider.id}
                    onPress={() =>
                      setFilters((current) => ({
                        ...current,
                        provider:
                          current.provider === provider.id ? undefined : provider.id,
                      }))
                    }
                  />
                ))}
              </View>
            </View>
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
          onEndReached={() => {
            if (
              listQuery.hasNextPage &&
              !listQuery.isFetchingNextPage &&
              !listQuery.isRefetching
            ) {
              void listQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          onScroll={(event) =>
            setShowScrollTop(event.nativeEvent.contentOffset.y > 280)
          }
          scrollEventThrottle={16}
        />
      )}

      {showScrollTop && !showSkeleton && !showError ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(160)}
          className="absolute right-4"
          style={{ bottom: 76 + insets.bottom }}
        >
          <Pressable
            accessibilityLabel={ACCOUNTS_COPY.scrollTop}
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full bg-blue"
            onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
          >
            <ChevronUp color="#FFFFFF" size={20} strokeWidth={2.5} />
          </Pressable>
        </Animated.View>
      ) : null}

      <AccountsSheet
        subtitle="Choose what to show. Counts stay on the server."
        title={ACCOUNTS_COPY.filters}
        visible={filterOpen && confirm == null}
        onClose={() => setFilterOpen(false)}
      >
        <AccountsFilterBody
          draft={draftFilters}
          kind={kind}
          providers={accountProvidersFor(kind).map((provider) => ({
            id: provider.id,
            label: provider.label,
          }))}
          onApply={() => {
            setFilters(draftFilters);
            setFilterOpen(false);
          }}
          onChange={setDraftFilters}
          onKind={(next) => {
            setKind(next);
            setDraftFilters((current) => ({ ...current, provider: undefined }));
            setFilters((current) => ({ ...current, provider: undefined }));
          }}
          onReset={() => setDraftFilters({})}
        />
      </AccountsSheet>

      <AccountsSheet
        subtitle={ACCOUNTS_COPY.addBody}
        title={ACCOUNTS_COPY.addTitle}
        visible={addOpen && confirm == null}
        onClose={() => setAddOpen(false)}
      >
        <AddAccountForm
          kind={addKind}
          onCancel={() => setAddOpen(false)}
          onCreated={() => setAddOpen(false)}
          onKind={setAddKind}
        />
      </AccountsSheet>

      <AccountsSheet
        title={ACCOUNTS_COPY.detailsTitle}
        visible={detailsId != null && confirm == null}
        onClose={() => setDetailsId(null)}
      >
        {detailsId ? (
          <AccountDetailsBody
            busy={
              activate.isPending ||
              deactivate.isPending ||
              reconnect.isPending ||
              removeAccount.isPending
            }
            publicId={detailsId}
            onActivate={requestActivate}
            onCopy={(value) => void onCopy(value)}
            onDeactivate={requestDeactivate}
            onDelete={requestDelete}
            onReconnect={(id) => void onReconnect(id)}
          />
        ) : null}
      </AccountsSheet>

      {confirm ? (
        <AccountsSheet
          subtitle={confirmBody(confirm)}
          title={confirmTitle(confirm)}
          visible
          onClose={() => {
            if (!confirmBusy) setConfirm(null);
          }}
        >
          <View className="flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              className="min-h-11 flex-1 items-center justify-center rounded-lg border border-slate-200"
              disabled={confirmBusy}
              onPress={() => setConfirm(null)}
            >
              <Text
                className="text-[13px] text-slate-600"
                style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
              >
                {ACCOUNTS_COPY.cancel}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className={`min-h-11 flex-1 items-center justify-center rounded-lg ${
                confirm.mode === 'delete' ? 'bg-red-600' : 'bg-blue'
              }`}
              disabled={confirmBusy}
              onPress={() => void runConfirm()}
            >
              {confirmBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  className="text-[13px] text-white"
                  style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                >
                  {confirm.mode === 'activate'
                    ? ACCOUNTS_COPY.activate
                    : confirm.mode === 'delete'
                      ? ACCOUNTS_COPY.delete
                      : ACCOUNTS_COPY.deactivate}
                </Text>
              )}
            </Pressable>
          </View>
        </AccountsSheet>
      ) : null}
    </SafeAreaView>
  );
}

function confirmTitle(confirm: ConfirmState): string {
  if (confirm.mode === 'delete') return ACCOUNTS_COPY.deleteTitle;
  if (confirm.mode === 'deactivate') return ACCOUNTS_COPY.deactivateTitle;
  return confirm.channel === 'payin'
    ? ACCOUNTS_COPY.activatePayinTitle
    : ACCOUNTS_COPY.activatePayoutTitle;
}

function confirmBody(confirm: ConfirmState): string {
  if (confirm.mode === 'delete') return ACCOUNTS_COPY.deleteBody;
  if (confirm.mode === 'deactivate') {
    return confirm.channel === 'payin'
      ? ACCOUNTS_COPY.deactivatePayinBody
      : ACCOUNTS_COPY.deactivatePayoutBody;
  }
  if (confirm.replacesName) {
    return confirm.channel === 'payin'
      ? ACCOUNTS_COPY.activatePayinBody
      : ACCOUNTS_COPY.activatePayoutBody;
  }
  return confirm.channel === 'payin'
    ? ACCOUNTS_COPY.activatePayinFirst
    : ACCOUNTS_COPY.activatePayoutFirst;
}

function QuickChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`rounded-lg px-3 py-1 ${
        selected ? 'bg-blue' : 'border border-slate-200 bg-white dark:border-navy-700 dark:bg-navy-800'
      }`}
      onPress={onPress}
    >
      <Text
        className={`text-xs ${selected ? 'text-white' : 'text-slate-600 dark:text-navy-100'}`}
        style={{ fontFamily: selected ? 'PlusJakartaSans_600SemiBold' : 'PlusJakartaSans_500Medium' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Separator() {
  return <View className="h-3" />;
}

function keyExtractor(item: ReceivingAccount) {
  return item.publicId;
}
