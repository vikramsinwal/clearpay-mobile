import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ACCOUNTS_COPY, ACCOUNTS_PAGE_SIZE } from '@/constants/accounts';
import { PAYIN_COPY } from '@/constants/payin';
import { AccountsSheet } from '@/features/accounts/components/accounts-sheet';
import { AccountDetailsBody } from '@/features/accounts/components/account-details-body';
import {
  useActivateAccountMutation,
  useAccountsInfiniteQuery,
  useDeactivateAccountMutation,
  useDeleteAccountMutation,
  useReconnectAccountMutation,
} from '@/features/accounts/hooks/use-accounts';
import type { AccountChannel, ReceivingAccount } from '@/features/accounts/types';
import { PayinChrome, PayinToast } from '@/features/payin/components/payin-chrome';
import { PayinErrorState } from '@/features/payin/components/payin-states';
import { payinErrorMessage } from '@/features/payin/lib/errors';
import { showAlert } from '@/lib/ui/alert';

export function PayinAccountDetailScreen({ accountId }: { accountId: string | null }) {
  const [toast, setToast] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    account: ReceivingAccount;
    channel: AccountChannel | null;
    mode: 'activate' | 'deactivate' | 'delete';
    replacesName: string | null;
  } | null>(null);

  const listQuery = useAccountsInfiniteQuery({ kind: 'upi_bank', limit: ACCOUNTS_PAGE_SIZE });
  const gatewayQuery = useAccountsInfiniteQuery({ kind: 'gateway', limit: ACCOUNTS_PAGE_SIZE });
  const activate = useActivateAccountMutation();
  const deactivate = useDeactivateAccountMutation();
  const reconnect = useReconnectAccountMutation();
  const removeAccount = useDeleteAccountMutation();
  const busy =
    activate.isPending || deactivate.isPending || reconnect.isPending || removeAccount.isPending;

  const summary = listQuery.data?.pages[0]?.summary ?? gatewayQuery.data?.pages[0]?.summary ?? null;

  const requestActivate = useCallback(
    (account: ReceivingAccount, channel: AccountChannel) => {
      const current = channel === 'payin' ? summary?.activePayin : summary?.activePayout;
      if (current?.publicId === account.publicId) return;
      setConfirm({
        account,
        channel,
        mode: 'activate',
        replacesName: current && current.publicId !== account.publicId ? current.name : null,
      });
    },
    [summary?.activePayin, summary?.activePayout],
  );

  async function runConfirm() {
    if (!confirm) return;
    try {
      if (confirm.mode === 'activate' && confirm.channel) {
        await activate.mutateAsync({ publicId: confirm.account.publicId, channel: confirm.channel });
        setToast(confirm.channel === 'payin' ? ACCOUNTS_COPY.payinUpdated : ACCOUNTS_COPY.payoutUpdated);
      } else if (confirm.mode === 'deactivate' && confirm.channel) {
        await deactivate.mutateAsync({ publicId: confirm.account.publicId, channel: confirm.channel });
        setToast(ACCOUNTS_COPY.deactivated);
      } else if (confirm.mode === 'delete') {
        await removeAccount.mutateAsync(confirm.account.publicId);
        setToast(ACCOUNTS_COPY.deleted);
        router.back();
      }
      setConfirm(null);
    } catch (error) {
      showAlert(PAYIN_COPY.accountDetailTitle, payinErrorMessage(error, ACCOUNTS_COPY.actionFailed));
    }
  }

  if (!accountId) {
    return (
      <SafeAreaView className="flex-1 bg-[#f9f9ff]" edges={['top']}>
        <PayinChrome title={PAYIN_COPY.accountDetailTitle} onBack={() => router.back()} />
        <PayinErrorState message={ACCOUNTS_COPY.detailsFailed} onRetry={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f9f9ff]" edges={['top']}>
      <PayinToast text={toast} />
      <PayinChrome title={PAYIN_COPY.accountDetailTitle} onBack={() => router.back()} />
      <View className="flex-1 px-4 pt-3">
        <AccountDetailsBody
          busy={busy}
          expanded
          publicId={accountId}
          onActivate={requestActivate}
          onCopy={(value) => {
            void Clipboard.setStringAsync(value).then(() => setToast(ACCOUNTS_COPY.copied));
          }}
          onDeactivate={(account, channel) =>
            setConfirm({ account, channel, mode: 'deactivate', replacesName: null })
          }
          onDelete={(account) =>
            setConfirm({ account, channel: null, mode: 'delete', replacesName: null })
          }
          onReconnect={(publicId) => {
            void reconnect.mutateAsync(publicId).then(
              () => setToast(ACCOUNTS_COPY.reconnected),
              (error: unknown) =>
                showAlert(PAYIN_COPY.accountDetailTitle, payinErrorMessage(error, ACCOUNTS_COPY.actionFailed)),
            );
          }}
        />
      </View>

      {confirm ? (
        <AccountsSheet
          title={
            confirm.mode === 'delete'
              ? ACCOUNTS_COPY.deleteTitle
              : confirm.mode === 'deactivate'
                ? ACCOUNTS_COPY.deactivateTitle
                : confirm.replacesName && confirm.channel === 'payin'
                  ? PAYIN_COPY.replacePayinTitle
                  : confirm.channel === 'payin'
                    ? ACCOUNTS_COPY.activatePayinTitle
                    : ACCOUNTS_COPY.activatePayoutTitle
          }
          visible
          onClose={() => setConfirm(null)}
        >
          <Text className="mb-4 text-[13px] leading-5 text-[#414754]">
            {confirm.mode === 'delete'
              ? ACCOUNTS_COPY.deleteBody
              : confirm.mode === 'deactivate'
                ? confirm.channel === 'payin'
                  ? ACCOUNTS_COPY.deactivatePayinBody
                  : ACCOUNTS_COPY.deactivatePayoutBody
                : confirm.replacesName && confirm.channel === 'payin'
                  ? `${PAYIN_COPY.replacePayinBody} (${confirm.replacesName})`
                  : confirm.channel === 'payin'
                    ? ACCOUNTS_COPY.activatePayinFirst
                    : ACCOUNTS_COPY.activatePayoutFirst}
          </Text>
          {confirm.channel === 'payin' ? (
            <Text className="mb-4 text-[12px] text-[#727785]">{PAYIN_COPY.payoutIndependent}</Text>
          ) : null}
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
                {confirm.mode === 'delete'
                  ? ACCOUNTS_COPY.delete
                  : confirm.mode === 'deactivate'
                    ? ACCOUNTS_COPY.deactivate
                    : PAYIN_COPY.activatePayin}
              </Text>
            </Pressable>
          </View>
        </AccountsSheet>
      ) : null}
    </SafeAreaView>
  );
}
