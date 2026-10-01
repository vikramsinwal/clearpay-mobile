import { ArrowRight, Clock, Lock, Wallet } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEPOSIT_UNDER_REVIEW_COPY } from '@/constants/deposit-under-review';
import { MIN_DEPOSIT_USDT } from '@/constants/home';
import { DepositUsdtPaymentSheet } from '@/features/deposit/components/deposit-usdt-payment-sheet';
import { useDepositStatusQuery } from '@/features/deposit/hooks/use-deposit-status';
import { HomeHeader } from '@/features/home/components/home-header';
import { useAuthStore } from '@/stores/auth-store';
import { useDepositFlowStore } from '@/stores/deposit-flow-store';

/**
 * Deposit tab — opens the Deposit USDT payment-details sheet.
 * While PROOF_SUBMITTED, shows under-review state instead of Make Deposit.
 */
export function DepositScreen() {
  const router = useRouter();
  const customer = useAuthStore((state) => state.customer);
  const depositStatus = useDepositFlowStore((state) => state.status);
  const submission = useDepositFlowStore((state) => state.submission);
  const markAwaitingProof = useDepositFlowStore(
    (state) => state.markAwaitingProof,
  );
  const depositStatusQuery = useDepositStatusQuery();
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [paymentSessionKey, setPaymentSessionKey] = useState(0);

  const activeSession = depositStatusQuery.data?.status.activeSession;
  const unlocked = depositStatusQuery.data?.status.unlocked === true;
  const isUnderReview =
    !unlocked &&
    (depositStatus === 'under_review' ||
      activeSession?.status === 'PROOF_SUBMITTED');

  const amountUsdt =
    submission?.amountUsdt ?? activeSession?.amountUsdt ?? MIN_DEPOSIT_USDT;
  const amountDisplay =
    submission?.amountDisplay ??
    activeSession?.amountDisplay ??
    amountUsdt.toLocaleString('en-US');
  const currency = submission?.currency ?? activeSession?.currency ?? 'USDT';

  const openPaymentSheet = () => {
    if (isUnderReview || unlocked) return;
    setPaymentSessionKey((key) => key + 1);
    setPaymentSheetVisible(true);
  };

  const onFundsSent = (session?: { publicId?: string }) => {
    const publicId =
      session?.publicId?.trim() ||
      useDepositFlowStore.getState().sessionPublicId?.trim() ||
      null;
    if (!publicId) {
      return;
    }
    markAwaitingProof(publicId);
    router.push(
      `/deposit-proof?sessionId=${encodeURIComponent(publicId)}`,
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FB]" edges={['top']}>
      <HomeHeader
        email={customer?.email}
        name={customer?.name}
        title="Deposit"
      />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 32,
        }}
        refreshControl={
          <RefreshControl
            refreshing={depositStatusQuery.isRefetching}
            onRefresh={() => {
              void depositStatusQuery.refetch();
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isUnderReview ? (
          <View className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <View className="mb-3 h-12 w-12 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/15">
              <Clock color="#D97706" size={24} strokeWidth={2.2} />
            </View>
            <Text
              className="text-lg font-bold text-slate-900"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              Pending verification
            </Text>
            <Text
              className="mt-2 text-[13px] leading-5 text-slate-600"
              style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
            >
              Your deposit has been submitted successfully and is waiting for admin verification.
            </Text>
            <Text
              className="mt-2 text-[13px] leading-5 text-slate-600"
              style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
            >
              {amountDisplay} {currency}
              {activeSession?.networkLabel ? ` · ${activeSession.networkLabel}` : ''}
              {activeSession?.status ? ` · ${activeSession.status}` : ''}
            </Text>
            <View className="mt-5 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3">
              <Lock color="#D97706" size={16} strokeWidth={2.2} />
              <Text
                className="text-sm font-semibold text-slate-700"
                style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
              >
                {DEPOSIT_UNDER_REVIEW_COPY.homeLockedCta}
              </Text>
            </View>
          </View>
        ) : (
          <View className="rounded-2xl border border-blue-900/30 bg-[#091D42] p-5">
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <Wallet color="#41DDC5" size={24} />
            </View>
            <Text
              className="text-lg font-bold text-white"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              Initial deposit
            </Text>
            <Text
              className="mt-2 text-[13px] leading-5 text-slate-300"
              style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
            >
              Minimum deposit required before withdrawals or trading operations.
            </Text>

            <View className="mt-5 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <Text
                className="text-[11px] font-medium uppercase tracking-wide text-slate-400"
                style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
              >
                Minimum amount
              </Text>
              <Text
                className="mt-1 text-2xl font-extrabold text-teal"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                {MIN_DEPOSIT_USDT} USDT
              </Text>
            </View>

            <Pressable
              accessibilityLabel="Make Deposit"
              accessibilityRole="button"
              className="mt-5 flex-row items-center justify-center gap-2 rounded-xl bg-white py-3.5 active:opacity-90"
              disabled={unlocked}
              onPress={openPaymentSheet}
            >
              <Text
                className="text-sm font-bold text-slate-900"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                Make Deposit
              </Text>
              <ArrowRight color="#334155" size={16} strokeWidth={2.5} />
            </Pressable>
          </View>
        )}
      </ScrollView>

      <DepositUsdtPaymentSheet
        visible={paymentSheetVisible}
        sessionKey={paymentSessionKey}
        onClose={() => setPaymentSheetVisible(false)}
        onFundsSent={onFundsSent}
      />
    </SafeAreaView>
  );
}
