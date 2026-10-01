import { ChevronUp, Clock3 } from 'lucide-react-native';
import { useIsFocused, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopHeader } from '@/components/brand/top-header';
import { type EarningsPeriod } from '@/constants/home';
import { useDepositStatusQuery } from '@/features/deposit/hooks/use-deposit-status';
import { isDashboardLocked } from '@/features/deposit/lib/activation';
import { HeroBalanceCard } from '@/features/home/components/hero-balance-card';
import { HomeEarningsCard } from '@/features/home/components/home-earnings-card';
import { HomeNotificationsCard } from '@/features/home/components/home-notifications-card';
import {
  useDashboardEarningsQuery,
  useDashboardSummaryQuery,
  useHomeNotificationsQuery,
  useMarkNotificationReadMutation,
  useNotificationCountQuery,
} from '@/features/home/hooks/use-home-queries';

const ACTIVITY_CARDS = [
  { key: 'activePayins', label: 'Active Payins', tone: 'border-blue-100 bg-blue-50/70', accent: '#2563EB' },
  { key: 'successfulPayins', label: 'Successful Payins', tone: 'border-emerald-100 bg-emerald-50/70', accent: '#059669' },
  { key: 'pendingPayouts', label: 'Pending Payouts', tone: 'border-amber-200 bg-amber-50/80', accent: '#D97706' },
  { key: 'completedPayouts', label: 'Completed Payouts', tone: 'border-emerald-100 bg-emerald-50/70', accent: '#059669' },
] as const;

function DashboardSkeleton({ height }: { height: number }) {
  return <View className="rounded-2xl bg-slate-200/70" style={{ height }} />;
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="items-center rounded-2xl border border-rose-100 bg-white p-6">
      <Text className="text-base text-slate-800" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
        Unable to load dashboard data
      </Text>
      <Text className="mt-1 text-center text-sm text-slate-500" style={{ fontFamily: 'PlusJakartaSans_400Regular' }}>
        Check your connection and try again.
      </Text>
      <Pressable className="mt-4 rounded-xl bg-blue px-4 py-2.5" onPress={onRetry}>
        <Text className="text-sm text-white" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>Retry</Text>
      </Pressable>
    </View>
  );
}

export function HomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const scrollRef = useRef<ScrollView>(null);
  const [period, setPeriod] = useState<EarningsPeriod>('today');
  const [customRange, setCustomRange] = useState<{ startDate?: string; endDate?: string }>({});
  const [showScrollTop, setShowScrollTop] = useState(false);

  const summaryQuery = useDashboardSummaryQuery();
  const notificationsQuery = useHomeNotificationsQuery();
  const notificationCountQuery = useNotificationCountQuery({ enabled: isFocused });
  const markNotificationReadMutation = useMarkNotificationReadMutation();
  const earningsQuery = useDashboardEarningsQuery({
    period,
    ...customRange,
  });
  const summary = summaryQuery.data?.summary;
  const refreshing =
    summaryQuery.isRefetching ||
    notificationsQuery.isRefetching ||
    notificationCountQuery.isRefetching ||
    earningsQuery.isRefetching;

  const refresh = () => {
    void Promise.all([
      summaryQuery.refetch(),
      notificationsQuery.refetch(),
      notificationCountQuery.refetch(),
      earningsQuery.refetch(),
      depositStatusQuery.refetch(),
    ]);
  };

  const setEarningsPeriod = (next: EarningsPeriod) => {
    if (next === 'custom') return;
    setPeriod(next);
  };

  const applyCustomRange = (startDate: string, endDate: string) => {
    setCustomRange({ startDate, endDate });
    setPeriod('custom');
  };

  const depositStatusQuery = useDepositStatusQuery();
  const depositLocked =
    depositStatusQuery.data != null &&
    isDashboardLocked(depositStatusQuery.data.status);
  const activeSession = depositStatusQuery.data?.status.activeSession;
  const conversionRate = Math.max(0, Math.min(100, summary?.statistics.conversionRate ?? 0));

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FB]" edges={['top']}>
      <TopHeader title="Home" />

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1B6CA8" />}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => setShowScrollTop(event.nativeEvent.contentOffset.y > 240)}
        scrollEventThrottle={16}
      >
        <View className="gap-5">
          {depositLocked ? (
            <View className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <Text className="text-lg text-slate-900" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
                {activeSession?.status === 'PROOF_SUBMITTED' ? 'Pending verification' : 'Initial deposit'}
              </Text>
              <Text className="mt-2 text-[13px] leading-5 text-slate-600" style={{ fontFamily: 'PlusJakartaSans_400Regular' }}>
                {activeSession?.status === 'PROOF_SUBMITTED'
                  ? 'Your deposit has been submitted successfully and is waiting for admin verification.'
                  : 'Complete your first deposit to unlock PayIn, payouts, and trading. You can update your profile while you wait.'}
              </Text>
              {activeSession ? (
                <Text className="mt-2 text-[13px] text-slate-700" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                  {activeSession.amountDisplay} {activeSession.currency} · {activeSession.status}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                className="mt-4 items-center rounded-xl bg-[#091D42] py-3"
                onPress={() => router.push('/deposit')}
              >
                <Text className="text-sm text-white" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
                  {activeSession?.status === 'PROOF_SUBMITTED' ? 'View deposit' : 'Make deposit'}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {depositLocked ? null : summaryQuery.isLoading && !summary ? <DashboardSkeleton height={248} /> : summary ? (
            <HeroBalanceCard
              cryptoSettleEnabled={summary.cryptoSettlement.enabled}
              currency={summary.balance.currency}
              netBalanceMinor={summary.balance.netBalanceMinor}
              showBestRate={Boolean(summary.cryptoSettlement.bestRate)}
              fiatAmountMinor={summary.balance.fiatAmountMinor}
              usdtBalance={summary.balance.cryptoAmount ?? summary.balance.usdtBalance}
              usdtCurrency={summary.balance.usdtCurrency}
              onCryptoSettle={() => router.push('/settle')}
              onTransfer={() => router.push('/settle')}
            />
          ) : <DashboardError onRetry={() => void summaryQuery.refetch()} />}

          {depositLocked ? null : <HomeNotificationsCard
            error={notificationsQuery.isError}
            items={notificationsQuery.data?.items}
            loading={notificationsQuery.isLoading}
            markingReadId={
              markNotificationReadMutation.isPending
                ? (markNotificationReadMutation.variables ?? null)
                : null
            }
            onMarkRead={(id) => markNotificationReadMutation.mutate(id)}
            onRetry={() => void notificationsQuery.refetch()}
            onViewAll={() => router.push('/notifications')}
          />}

          {depositLocked ? null : <HomeEarningsCard
            data={earningsQuery.data}
            error={earningsQuery.isError}
            loading={earningsQuery.isLoading}
            period={period}
            onCustomRangeChange={applyCustomRange}
            onPeriodChange={setEarningsPeriod}
            onRetry={() => void earningsQuery.refetch()}
          />}

          {depositLocked ? null : summaryQuery.isLoading && !summary ? <DashboardSkeleton height={220} /> : summary ? (
            <View className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <View className="flex-row items-center gap-2">
                <Clock3 color="#40536E" size={19} />
                <Text className="text-base text-slate-900" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>Overall Statistics</Text>
              </View>
              <View className="mt-6 flex-row">
                <View className="flex-1">
                  <Text className="text-xs text-slate-500" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>Total Payins</Text>
                  <Text className="mt-2 text-lg text-slate-900" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{summary.statistics.totalPayins.toLocaleString('en-IN')}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-slate-500" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>Total Payouts</Text>
                  <Text className="mt-2 text-lg text-slate-900" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{summary.statistics.totalPayouts.toLocaleString('en-IN')}</Text>
                </View>
              </View>
              <View className="my-5 h-px bg-slate-100" />
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-slate-800" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>Overall Conversion Rate</Text>
                <Text className="text-sm text-emerald-600" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{conversionRate.toFixed(2)}%</Text>
              </View>
              <View className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <View className="h-full rounded-full bg-[#2563EB]" style={{ width: `${conversionRate}%` }} />
              </View>
              <View className="mt-5 flex-row items-center justify-between border-t border-slate-100 pt-4">
                <Text className="text-sm text-slate-500" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>Total Transactions</Text>
                <Text className="text-sm text-slate-900" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{summary.statistics.totalTransactions}</Text>
              </View>
            </View>
          ) : null}

          {depositLocked ? null : summaryQuery.isLoading && !summary ? <DashboardSkeleton height={265} /> : summary ? (
            <View className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <Text className="text-base text-slate-900" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>Activity Summary</Text>
              <View className="mt-4 flex-row flex-wrap gap-3">
                {ACTIVITY_CARDS.map((card) => (
                  <View key={card.key} className={`basis-[47%] flex-grow rounded-2xl border p-4 ${card.tone}`}>
                    <Text className="text-xs text-slate-600" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>{card.label}</Text>
                    <Text className="mt-3 text-3xl" style={{ color: card.accent, fontFamily: 'PlusJakartaSans_700Bold' }}>
                      {summary.activity[card.key]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {showScrollTop ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)} className="absolute bottom-5 right-5">
          <Pressable
            accessibilityLabel="Scroll to top"
            className="h-14 w-14 items-center justify-center rounded-full bg-[#2563EB] shadow-lg"
            onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          >
            <ChevronUp color="#FFFFFF" size={26} />
          </Pressable>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}
