import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { ACCOUNTS_COPY } from '@/constants/accounts';
import {
  connectivityLabel,
  formatConversion,
  formatInrMinor,
  formatTransactionUsage,
} from '@/features/accounts/lib/format-account';
import { useAccountDetailsQuery } from '@/features/accounts/hooks/use-accounts';
import type { AccountChannel, ReceivingAccount } from '@/features/accounts/types';

type AccountDetailsBodyProps = {
  publicId: string;
  busy: boolean;
  expanded?: boolean;
  onCopy: (value: string) => void;
  onActivate: (account: ReceivingAccount, channel: AccountChannel) => void;
  onDeactivate: (account: ReceivingAccount, channel: AccountChannel) => void;
  onReconnect: (publicId: string) => void;
  onDelete: (account: ReceivingAccount) => void;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2 flex-row items-start justify-between gap-3">
      <Text
        className="text-[11px] text-slate-400"
        style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
      >
        {label}
      </Text>
      <Text
        className="max-w-[65%] text-right text-[12px] text-slate-800 dark:text-white"
        style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
      >
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  disabled,
  onPress,
  tone = 'primary',
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  tone?: 'primary' | 'muted' | 'danger';
}) {
  const toneClass =
    tone === 'primary'
      ? 'bg-blue'
      : tone === 'danger'
        ? 'border border-red-200 bg-white'
        : 'border border-slate-200 bg-white';
  return (
    <Pressable
      accessibilityRole="button"
      className={`min-h-11 items-center justify-center rounded-lg px-3 ${toneClass}`}
      disabled={disabled}
      onPress={onPress}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Text
        className={`text-[12px] ${
          tone === 'primary' ? 'text-white' : tone === 'danger' ? 'text-red-600' : 'text-slate-700'
        }`}
        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function AccountDetailsBody({
  publicId,
  busy,
  expanded = false,
  onCopy,
  onActivate,
  onDeactivate,
  onReconnect,
  onDelete,
}: AccountDetailsBodyProps) {
  const detailsQuery = useAccountDetailsQuery(publicId);

  if (detailsQuery.isPending) {
    return (
      <View className="items-center py-10">
        <ActivityIndicator color="#1B6CA8" />
      </View>
    );
  }

  if (detailsQuery.isError || !detailsQuery.data) {
    return (
      <View className="items-center py-8">
        <Text
          className="text-sm text-slate-900"
          style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
        >
          {ACCOUNTS_COPY.detailsFailed}
        </Text>
        <Pressable
          accessibilityRole="button"
          className="mt-3 rounded-lg bg-blue px-4 py-2"
          onPress={() => void detailsQuery.refetch()}
        >
          <Text className="text-xs text-white" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
            {ACCOUNTS_COPY.retry}
          </Text>
        </Pressable>
      </View>
    );
  }

  const { account, recentTransactions, activationHistory } = detailsQuery.data;
  const channelLabel = (channel: AccountChannel) =>
    channel === 'payin' ? ACCOUNTS_COPY.payin : ACCOUNTS_COPY.payout;

  return (
    <ScrollView className={expanded ? undefined : 'max-h-[520px]'} showsVerticalScrollIndicator={false}>
      <Text
        className="mb-2 text-[12px] text-slate-900 dark:text-white"
        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
      >
        {ACCOUNTS_COPY.information}
      </Text>
      <Row label="Name" value={account.name} />
      <Row label={ACCOUNTS_COPY.status} value={account.workState ?? '—'} />
      <Row label={ACCOUNTS_COPY.provider} value={account.provider || '—'} />
      <Row label={account.identifierLabel} value={account.identifier ?? '—'} />
      <Row label={ACCOUNTS_COPY.phone} value={account.phone ?? '—'} />
      <Row
        label={ACCOUNTS_COPY.verification}
        value={account.verificationStatus ?? '—'}
      />
      {account.verificationMessage ? (
        <Text className="mb-2 text-[11px] text-slate-500">{account.verificationMessage}</Text>
      ) : null}
      <Row label={ACCOUNTS_COPY.connectivity} value={connectivityLabel(account.connectivity)} />
      <Row label={ACCOUNTS_COPY.payin} value={account.payin.status} />
      <Row label={ACCOUNTS_COPY.payout} value={account.payout.status} />
      <Row
        label={ACCOUNTS_COPY.totalReceived}
        value={formatInrMinor(account.totalReceivedMinor, account.currency)}
      />
      <Row label={ACCOUNTS_COPY.transactions} value={formatTransactionUsage(account)} />
      <Row label={ACCOUNTS_COPY.conversion} value={formatConversion(account)} />

      <Text
        className="mb-2 mt-3 text-[12px] text-slate-900 dark:text-white"
        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
      >
        {ACCOUNTS_COPY.recent}
      </Text>
      {recentTransactions.length === 0 ? (
        <Text className="mb-2 text-[12px] text-slate-400">{ACCOUNTS_COPY.noTransactions}</Text>
      ) : (
        recentTransactions.map((item) => (
          <View key={item.publicId} className="mb-2 flex-row justify-between">
            <Text className="text-[12px] text-slate-700">
              {formatInrMinor(item.amountMinor, item.currency)}
            </Text>
            <Text className="text-[11px] text-slate-400">{item.status}</Text>
          </View>
        ))
      )}

      <Text
        className="mb-2 mt-2 text-[12px] text-slate-900 dark:text-white"
        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
      >
        {ACCOUNTS_COPY.history}
      </Text>
      {activationHistory.length === 0 ? (
        <Text className="mb-2 text-[12px] text-slate-400">{ACCOUNTS_COPY.noHistory}</Text>
      ) : (
        activationHistory.map((item, index) => (
          <Text key={`${item.action}-${item.at ?? index}`} className="mb-1 text-[12px] text-slate-600">
            {item.channel ? `${channelLabel(item.channel)} · ` : ''}
            {item.action}
            {item.at ? ` · ${item.at}` : ''}
          </Text>
        ))
      )}

      <View className="mt-3 gap-2 pb-2">
        {account.payin.canActivate && account.payin.status !== 'ACTIVE' ? (
          <ActionButton
            disabled={busy}
            label={`${ACCOUNTS_COPY.activate} ${ACCOUNTS_COPY.payin}`}
            onPress={() => onActivate(account, 'payin')}
          />
        ) : null}
        {account.payout.canActivate && account.payout.status !== 'ACTIVE' ? (
          <ActionButton
            disabled={busy}
            label={`${ACCOUNTS_COPY.activate} ${ACCOUNTS_COPY.payout}`}
            onPress={() => onActivate(account, 'payout')}
          />
        ) : null}
        {account.payin.status === 'ACTIVE' && account.payin.canDeactivate ? (
          <ActionButton
            disabled={busy}
            label={`${ACCOUNTS_COPY.deactivate} ${ACCOUNTS_COPY.payin}`}
            tone="muted"
            onPress={() => onDeactivate(account, 'payin')}
          />
        ) : null}
        {account.payout.status === 'ACTIVE' && account.payout.canDeactivate ? (
          <ActionButton
            disabled={busy}
            label={`${ACCOUNTS_COPY.deactivate} ${ACCOUNTS_COPY.payout}`}
            tone="muted"
            onPress={() => onDeactivate(account, 'payout')}
          />
        ) : null}
        {account.canReconnect ? (
          <ActionButton
            disabled={busy}
            label={ACCOUNTS_COPY.reconnect}
            tone="muted"
            onPress={() => onReconnect(account.publicId)}
          />
        ) : null}
        {account.identifier && account.canCopyIdentifier ? (
          <ActionButton
            label={ACCOUNTS_COPY.copyUpi}
            tone="muted"
            onPress={() => onCopy(account.identifier ?? '')}
          />
        ) : null}
        <ActionButton
          disabled={busy}
          label={ACCOUNTS_COPY.delete}
          tone="danger"
          onPress={() => onDelete(account)}
        />
      </View>
    </ScrollView>
  );
}
