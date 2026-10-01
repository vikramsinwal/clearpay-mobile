import { router, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ACCOUNTS_COPY, ACCOUNTS_PAGE_SIZE } from '@/constants/accounts';
import { PAYIN_COPY } from '@/constants/payin';
import { AccountsSheet } from '@/features/accounts/components/accounts-sheet';
import {
  useAccountsInfiniteQuery,
  useActivateAccountMutation,
  useDeactivateAccountMutation,
} from '@/features/accounts/hooks/use-accounts';
import { connectivityLabel } from '@/features/accounts/lib/format-account';
import type { AccountKind, ReceivingAccount } from '@/features/accounts/types';
import { PayinChrome, PayinToast } from '@/features/payin/components/payin-chrome';
import { PayinEmptyState, PayinErrorState, PayinListSkeleton } from '@/features/payin/components/payin-states';
import { payinErrorMessage } from '@/features/payin/lib/errors';
import { showAlert } from '@/lib/ui/alert';

export function PayinAccountSelectionScreen() {
  const [kind, setKind] = useState<AccountKind>('upi_bank');
  const [toast, setToast] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    account: ReceivingAccount;
    mode: 'activate' | 'deactivate';
    replacesName: string | null;
  } | null>(null);

  const listQuery = useAccountsInfiniteQuery({ kind, limit: ACCOUNTS_PAGE_SIZE });
  const activate = useActivateAccountMutation();
  const deactivate = useDeactivateAccountMutation();

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

  const summary = listQuery.data?.pages[0]?.summary ?? null;
  const busy = activate.isPending || deactivate.isPending;

  const requestActivate = useCallback(
    (account: ReceivingAccount) => {
      const current = summary?.activePayin;
      if (current?.publicId === account.publicId) return;
      setConfirm({
        account,
        mode: 'activate',
        replacesName: current && current.publicId !== account.publicId ? current.name : null,
      });
    },
    [summary?.activePayin],
  );

  async function runConfirm() {
    if (!confirm) return;
    try {
      if (confirm.mode === 'activate') {
        await activate.mutateAsync({ publicId: confirm.account.publicId, channel: 'payin' });
        setToast(ACCOUNTS_COPY.payinUpdated);
      } else {
        await deactivate.mutateAsync({ publicId: confirm.account.publicId, channel: 'payin' });
        setToast(ACCOUNTS_COPY.deactivated);
      }
      setConfirm(null);
    } catch (error) {
      showAlert(PAYIN_COPY.accountsTitle, payinErrorMessage(error, ACCOUNTS_COPY.actionFailed));
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f9f9ff]" edges={['top']}>
      <PayinToast text={toast} />
      <PayinChrome title={PAYIN_COPY.accountsTitle} onBack={() => router.back()} />
      <View className="flex-row gap-2 px-4 py-3">
        <KindChip
          label={ACCOUNTS_COPY.tabUpi}
          selected={kind === 'upi_bank'}
          onPress={() => setKind('upi_bank')}
        />
        <KindChip
          label={ACCOUNTS_COPY.tabGateways}
          selected={kind === 'gateway'}
          onPress={() => setKind('gateway')}
        />
      </View>
      {summary?.activePayin ? (
        <Text className="px-4 pb-2 text-[12px] text-[#414754]">
          {PAYIN_COPY.activeAccount}: {summary.activePayin.name}
        </Text>
      ) : null}

      {listQuery.isPending && !listQuery.data ? (
        <PayinListSkeleton />
      ) : listQuery.isError && !listQuery.data ? (
        <PayinErrorState
          message={PAYIN_COPY.accountsFailed}
          onRetry={() => void listQuery.refetch()}
        />
      ) : (
        <FlatList
          contentContainerClassName="px-4 pb-8"
          data={items}
          keyExtractor={(item) => item.publicId}
          ListEmptyComponent={
            <PayinEmptyState
              actionLabel={PAYIN_COPY.addAccount}
              body={PAYIN_COPY.emptyAccountsBody}
              title={PAYIN_COPY.emptyAccountsTitle}
              onAction={() => router.push('/accounts' as Href)}
            />
          }
          ListFooterComponent={
            listQuery.isFetchingNextPage ? <ActivityIndicator className="py-4" color="#0058bc" /> : null
          }
          refreshControl={
            <RefreshControl
              refreshing={listQuery.isRefetching && !listQuery.isFetchingNextPage}
              onRefresh={() => void listQuery.refetch()}
            />
          }
          renderItem={({ item }) => (
            <PayinAccountRow
              account={item}
              busy={busy}
              onActivate={() => requestActivate(item)}
              onDeactivate={() =>
                setConfirm({ account: item, mode: 'deactivate', replacesName: null })
              }
              onOpen={() =>
                router.push(
                  `/payin-account?accountId=${encodeURIComponent(item.publicId)}` as Href,
                )
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

      {confirm ? (
        <AccountsSheet
          title={
            confirm.mode === 'deactivate'
              ? ACCOUNTS_COPY.deactivateTitle
              : confirm.replacesName
                ? PAYIN_COPY.replacePayinTitle
                : ACCOUNTS_COPY.activatePayinTitle
          }
          visible
          onClose={() => setConfirm(null)}
        >
          <Text className="mb-4 text-[13px] leading-5 text-[#414754]">
            {confirm.mode === 'deactivate'
              ? ACCOUNTS_COPY.deactivatePayinBody
              : confirm.replacesName
                ? `${PAYIN_COPY.replacePayinBody} (${confirm.replacesName})`
                : ACCOUNTS_COPY.activatePayinFirst}
          </Text>
          <Text className="mb-4 text-[12px] text-[#727785]">{PAYIN_COPY.payoutIndependent}</Text>
          <View className="flex-row gap-2">
            <Pressable
              className="h-11 flex-1 items-center justify-center rounded-lg bg-[#e8eeff]"
              onPress={() => setConfirm(null)}
            >
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{PAYIN_COPY.cancel}</Text>
            </Pressable>
            <Pressable
              className="h-11 flex-1 items-center justify-center rounded-lg bg-[#0058bc]"
              disabled={busy}
              onPress={() => void runConfirm()}
            >
              <Text className="text-white" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
                {confirm.mode === 'deactivate' ? PAYIN_COPY.deactivatePayin : PAYIN_COPY.activatePayin}
              </Text>
            </Pressable>
          </View>
        </AccountsSheet>
      ) : null}
    </SafeAreaView>
  );
}

function PayinAccountRow({
  account,
  busy,
  onOpen,
  onActivate,
  onDeactivate,
}: {
  account: ReceivingAccount;
  busy: boolean;
  onOpen: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  const active = account.payin.status === 'ACTIVE';
  const payinBlocked =
    account.payin.status === 'NOT_ELIGIBLE' &&
    Boolean(account.payin.unavailableReason) &&
    !account.payin.unavailableReason?.includes('PayOut');
  return (
    <Pressable
      accessibilityRole="button"
      className="mb-3 rounded-xl bg-white p-4"
      onPress={onOpen}
    >
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text
            className="text-[15px] text-[#0d1c32]"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {account.name}
          </Text>
          <Text className="mt-0.5 text-[12px] text-[#414754]">
            {account.kind === 'gateway' ? 'Gateway' : 'UPI / Bank'} · {account.provider || '—'}
          </Text>
          <Text className="mt-1 text-[12px] text-[#0d1c32]">{account.identifier ?? '—'}</Text>
          <Text className="mt-1 text-[12px] text-[#414754]">
            {PAYIN_COPY.connectivity}: {connectivityLabel(account.connectivity)}
          </Text>
        </View>
        <View className={`rounded-full px-2 py-1 ${active ? 'bg-[#57fdc8]' : 'bg-[#e8eeff]'}`}>
          <Text
            className={`text-[11px] ${active ? 'text-[#007256]' : 'text-[#414754]'}`}
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {active ? PAYIN_COPY.payinActiveBadge : PAYIN_COPY.payinInactiveBadge}
          </Text>
        </View>
      </View>
      {payinBlocked ? (
        <Text className="mt-3 text-[12px] text-[#414754]">
          {account.payin.unavailableReason}
        </Text>
      ) : null}
      {account.payin.canActivate && !active ? (
        <Pressable
          className="mt-3 h-10 items-center justify-center rounded-lg bg-[#0058bc]"
          disabled={busy}
          onPress={onActivate}
        >
          <Text className="text-white" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
            {PAYIN_COPY.activatePayin}
          </Text>
        </Pressable>
      ) : null}
      {active && account.payin.canDeactivate ? (
        <Pressable
          className="mt-3 h-10 items-center justify-center rounded-lg bg-[#e8eeff]"
          disabled={busy}
          onPress={onDeactivate}
        >
          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{PAYIN_COPY.deactivatePayin}</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function KindChip({
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
      className={`rounded-full px-3 py-1.5 ${selected ? 'bg-[#0058bc]' : 'bg-white'}`}
      onPress={onPress}
    >
      <Text
        className={`text-[12px] ${selected ? 'text-white' : 'text-[#414754]'}`}
        style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
