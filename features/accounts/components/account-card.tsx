import * as Clipboard from 'expo-clipboard';
import { Copy, MoreVertical } from 'lucide-react-native';
import { memo, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ACCOUNTS_COPY } from '@/constants/accounts';
import {
  connectivityLabel,
  formatConversion,
  formatInrMinor,
  formatTransactionUsage,
  providerInitials,
} from '@/features/accounts/lib/format-account';
import type {
  AccountChannel,
  ConnectivityStatus,
  ReceivingAccount,
} from '@/features/accounts/types';

const CONNECTIVITY_DOT: Record<ConnectivityStatus, string> = {
  connected: 'bg-emerald-500',
  disconnected: 'bg-slate-400',
  connecting: 'bg-amber-500',
  error: 'bg-red-500',
};

const CONNECTIVITY_TEXT: Record<ConnectivityStatus, string> = {
  connected: 'text-emerald-700',
  disconnected: 'text-slate-400',
  connecting: 'text-amber-700',
  error: 'text-red-600',
};

type AccountCardProps = {
  account: ReceivingAccount;
  pendingChannel: AccountChannel | null;
  onOpen: (publicId: string) => void;
  onActivate: (account: ReceivingAccount, channel: AccountChannel) => void;
  onDeactivate: (account: ReceivingAccount, channel: AccountChannel) => void;
};

function ChannelControl({
  label,
  state,
  busy,
  onActivate,
  onDeactivate,
}: {
  label: string;
  state: ReceivingAccount['payin'];
  busy: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  const rawReason = state.unavailableReason;
  const reason =
    rawReason &&
    !(label === ACCOUNTS_COPY.payin && rawReason.includes('PayOut')) &&
    !(label === ACCOUNTS_COPY.payout && rawReason.includes('PayIn'))
      ? rawReason
      : null;
  if (
    state.status === 'NOT_ELIGIBLE' ||
    (!state.canActivate && state.status !== 'ACTIVE')
  ) {
    const blocked =
      state.status === 'PENDING'
        ? ACCOUNTS_COPY.pending
        : state.status === 'SUSPENDED'
          ? ACCOUNTS_COPY.suspended
          : state.status === 'DISCONNECTED'
            ? ACCOUNTS_COPY.disconnected
            : ACCOUNTS_COPY.unavailable;
    return (
      <View className="flex-row items-center justify-between py-1">
        <Text
          className="text-[12px] text-slate-700 dark:text-navy-100"
          style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
        >
          {label}
        </Text>
        <View className="items-end">
          <Text
            className="text-[11px] text-slate-400"
            style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
          >
            {blocked}
          </Text>
          {reason ? (
            <Text
              className="mt-0.5 max-w-[180px] text-right text-[10px] text-slate-400"
              style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
            >
              {reason}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  const active = state.status === 'ACTIVE';
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text
        className="text-[12px] text-slate-700 dark:text-navy-100"
        style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
      >
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy, selected: active }}
        className={`min-h-8 flex-row items-center rounded-lg px-3 py-1.5 ${
          active ? 'bg-emerald-50' : 'bg-blue'
        }`}
        disabled={busy || (active && !state.canDeactivate)}
        onPress={active ? onDeactivate : onActivate}
      >
        {active ? (
          <View className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
        ) : null}
        <Text
          className={`text-[11px] ${active ? 'text-emerald-700' : 'text-white'}`}
          style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
        >
          {active ? ACCOUNTS_COPY.activeState : ACCOUNTS_COPY.activate}
        </Text>
      </Pressable>
    </View>
  );
}

function AccountCardComponent({
  account,
  pendingChannel,
  onOpen,
  onActivate,
  onDeactivate,
}: AccountCardProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const onCopy = async () => {
    if (!account.identifier || !account.canCopyIdentifier) return;
    await Clipboard.setStringAsync(account.identifier);
    setCopied(true);
  };

  const openAccount = () => onOpen(account.publicId);

  return (
    <View className="rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-navy-700 dark:bg-navy-800">
      <View className="flex-row items-start justify-between">
        <Pressable
          accessibilityLabel={account.name}
          accessibilityRole="button"
          className="min-w-0 flex-1 flex-row items-center gap-3 active:opacity-80"
          onPress={openAccount}
        >
          <View className="h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 dark:border-navy-600 dark:bg-navy-900">
            <Text
              className="text-sm text-slate-700 dark:text-navy-100"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {providerInitials(account)}
            </Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text
              className="text-sm text-slate-900 dark:text-white"
              numberOfLines={1}
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {account.name}
            </Text>
            <Text
              className="mt-0.5 text-xs text-slate-500 dark:text-navy-200"
              numberOfLines={1}
              style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
            >
              {account.provider || '—'}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityLabel={ACCOUNTS_COPY.menu}
          accessibilityRole="button"
          className="p-1"
          hitSlop={8}
          onPress={openAccount}
        >
          <MoreVertical color="#94A3B8" size={18} />
        </Pressable>
      </View>

      <View className="mt-3 flex-row gap-2 border-t border-slate-100 pt-3 dark:border-navy-700">
        <View className="min-w-0 flex-1">
          <Text
            className="text-[10px] uppercase tracking-wider text-slate-400"
            style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
          >
            {account.identifierLabel || ACCOUNTS_COPY.account}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Text
              className="min-w-0 flex-1 text-[11px] text-slate-700 dark:text-navy-100"
              numberOfLines={1}
              style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
            >
              {account.identifier ?? '—'}
            </Text>
            {account.identifier && account.canCopyIdentifier ? (
              <Pressable
                accessibilityLabel={ACCOUNTS_COPY.copyUpi}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => void onCopy()}
              >
                {copied ? (
                  <Text
                    className="text-[10px] text-emerald-600"
                    style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                  >
                    {ACCOUNTS_COPY.copied}
                  </Text>
                ) : (
                  <Copy color="#94A3B8" size={12} />
                )}
              </Pressable>
            ) : null}
          </View>
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="text-[10px] uppercase tracking-wider text-slate-400"
            style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
          >
            {ACCOUNTS_COPY.phone}
          </Text>
          <Text
            className="mt-0.5 text-[11px] text-slate-700 dark:text-navy-100"
            numberOfLines={1}
            style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
          >
            {account.phone ?? '—'}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityLabel={account.name}
        accessibilityRole="button"
        className="active:opacity-80"
        onPress={openAccount}
      >
      <View className="mt-3 flex-row items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-navy-700 dark:bg-navy-900">
        <View>
          <Text
            className="text-[10px] uppercase tracking-wider text-slate-400"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {ACCOUNTS_COPY.totalReceived}
          </Text>
          <Text
            className="mt-0.5 text-base text-emerald-600"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {formatInrMinor(account.totalReceivedMinor, account.currency)}
          </Text>
        </View>
        <View className="items-end">
          <Text
            className="text-[10px] uppercase tracking-wider text-slate-400"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {ACCOUNTS_COPY.transactions}
          </Text>
          <Text
            className="mt-0.5 text-xs text-slate-700 dark:text-navy-100"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {formatTransactionUsage(account)}
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          {account.workState ? (
            <View
              className={`rounded-md border px-2 py-0.5 ${
                account.workState === 'ACTIVE'
                  ? 'border-emerald-200 bg-emerald-50'
                  : account.workState === 'PENDING'
                    ? 'border-amber-200 bg-amber-50'
                    : account.workState === 'SUSPENDED' || account.workState === 'DISCONNECTED'
                      ? 'border-red-200 bg-red-50'
                      : 'border-slate-200 bg-slate-50'
              }`}
            >
              <Text
                className={`text-[10px] ${
                  account.workState === 'ACTIVE'
                    ? 'text-emerald-700'
                    : account.workState === 'PENDING'
                      ? 'text-amber-700'
                      : account.workState === 'SUSPENDED' ||
                          account.workState === 'DISCONNECTED'
                        ? 'text-red-600'
                        : 'text-slate-600'
                }`}
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                {account.workState}
              </Text>
            </View>
          ) : null}
          <Text
            className="shrink text-[11px] text-slate-500"
            numberOfLines={1}
            style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
          >
            {ACCOUNTS_COPY.conversion}:{' '}
            <Text
              className="text-slate-800 dark:text-white"
              style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
            >
              {formatConversion(account)}
            </Text>
          </Text>
        </View>
        <View className="ml-2 flex-row items-center gap-1">
          <View
            className={`h-1.5 w-1.5 rounded-full ${CONNECTIVITY_DOT[account.connectivity]}`}
          />
          <Text
            className={`text-[11px] ${CONNECTIVITY_TEXT[account.connectivity]}`}
            style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
          >
            {connectivityLabel(account.connectivity)}
          </Text>
        </View>
      </View>
      </Pressable>

      <View className="mt-2 border-t border-slate-100 pt-1 dark:border-navy-700">
        <ChannelControl
          busy={pendingChannel === 'payin'}
          label={ACCOUNTS_COPY.payin}
          state={account.payin}
          onActivate={() => onActivate(account, 'payin')}
          onDeactivate={() => onDeactivate(account, 'payin')}
        />
        <ChannelControl
          busy={pendingChannel === 'payout'}
          label={ACCOUNTS_COPY.payout}
          state={account.payout}
          onActivate={() => onActivate(account, 'payout')}
          onDeactivate={() => onDeactivate(account, 'payout')}
        />
      </View>
    </View>
  );
}

export const AccountCard = memo(AccountCardComponent);
