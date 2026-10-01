import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ACCOUNT_SETTINGS_COPY } from '@/constants/profile';
import { formatAmountMinor } from '@/features/home/lib/format';
import {
  formatDurationMs,
  formatUpdatedDate,
  metricBarColor,
} from '@/features/profile/lib/format-account';
import type {
  AccountPerformance,
  PerformancePeriod,
} from '@/features/profile/types/account';

import { CardError, CardSkeleton, SettingsCard, SettingsHeading } from './settings-card';

const PERIODS: PerformancePeriod[] = ['7d', '30d', '90d', 'custom'];

function MetricRow({
  label,
  value,
  progress,
}: {
  label: string;
  value: string;
  progress: number | null;
}) {
  const width = progress == null ? 0 : Math.max(0, Math.min(100, progress));
  return (
    <View className="flex-row items-center gap-2">
      <Text
        className="w-[108px] text-[12px] text-slate-600"
        numberOfLines={1}
        style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
      >
        {label}
      </Text>
      <View className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        {width > 0 ? (
          <View
            className="h-full rounded-full"
            style={{ width: `${width}%`, backgroundColor: metricBarColor(width) }}
          />
        ) : null}
      </View>
      <Text
        className="w-[72px] text-right text-[12px] text-slate-700"
        numberOfLines={1}
        style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
      >
        {value}
      </Text>
    </View>
  );
}

type PerformanceCardProps = {
  data?: AccountPerformance;
  period: PerformancePeriod;
  loading: boolean;
  error: boolean;
  onPeriodChange: (period: PerformancePeriod) => void;
  onCustomRange: (startDate: string, endDate: string) => void;
  onRetry: () => void;
};

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function ScoreRing({ score }: { score: number | null }) {
  const size = 84;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = score == null ? 0 : Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * circumference;

  return (
    <View className="h-[84px] w-[84px] items-center justify-center">
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E8EEF5"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#22C55E"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeDashoffset={circumference / 4}
          strokeLinecap="round"
        />
      </Svg>
      <Text
        className="absolute text-[22px] text-slate-900"
        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
      >
        {score == null ? '—' : Math.round(score)}
      </Text>
    </View>
  );
}

export function PerformanceCard({
  data,
  period,
  loading,
  error,
  onPeriodChange,
  onCustomRange,
  onRetry,
}: PerformanceCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [editingStart, setEditingStart] = useState(true);
  const [start, setStart] = useState(() => new Date());
  const [end, setEnd] = useState(() => new Date());

  const choosePeriod = (next: PerformancePeriod) => {
    setMenuOpen(false);
    if (next === 'custom') {
      setRangeOpen(true);
      return;
    }
    onPeriodChange(next);
  };

  const applyRange = () => {
    const earliest = start <= end ? start : end;
    const latest = start <= end ? end : start;
    onCustomRange(toDateKey(earliest), toDateKey(latest));
    setRangeOpen(false);
  };

  if (loading && !data) return <CardSkeleton lines={6} />;
  if (error && !data) return <CardError onRetry={onRetry} />;

  return (
    <SettingsCard>
      <SettingsHeading
        title={ACCOUNT_SETTINGS_COPY.performanceTitle}
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change performance period"
            onPress={() => setMenuOpen(true)}
          >
            <Text
              className="text-[12px] text-slate-400"
              style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
            >
              {ACCOUNT_SETTINGS_COPY.periods[period]}
            </Text>
          </Pressable>
        }
      />

      {data ? (
        <>
          <View className="flex-row items-center gap-3">
            <ScoreRing score={data.traderScore.value} />
            <View className="flex-1">
              <Text
                className="text-[13px] text-slate-500"
                style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
              >
                {ACCOUNT_SETTINGS_COPY.traderScore}
              </Text>
              <Text
                className="text-[15px] text-emerald-600"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                {data.traderScore.trend == null
                  ? '—'
                  : `${data.traderScore.trend > 0 ? '+' : ''}${data.traderScore.trend}%`}
              </Text>
              <Text
                className="mt-0.5 text-[11px] text-slate-400"
                style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
              >
                {ACCOUNT_SETTINGS_COPY.lastUpdated} {formatUpdatedDate(data.to)}
              </Text>
            </View>
          </View>

          <View className="mt-4 gap-2.5">
            <MetricRow
              label="Payout speed"
              progress={null}
              value={formatDurationMs(data.payoutSpeed.averageMs)}
            />
            <MetricRow
              label="Payin speed"
              progress={null}
              value={formatDurationMs(data.payinSpeed.averageMs)}
            />
            <MetricRow
              label="Conversion rate"
              progress={data.conversionRate.percent}
              value={data.conversionRate.percent == null ? '—' : `${data.conversionRate.percent}%`}
            />
            <MetricRow
              label="Settlement"
              progress={data.settlementPerformance.percent}
              value={
                data.settlementPerformance.percent == null
                  ? '—'
                  : `${data.settlementPerformance.percent}%`
              }
            />
            <MetricRow
              label="Statement"
              progress={data.statementPerformance.percent}
              value={
                data.statementPerformance.percent == null
                  ? '—'
                  : `${data.statementPerformance.percent}%`
              }
            />
            <MetricRow
              label="Auto-confirm"
              progress={data.autoConfirmPerformance.percent}
              value={
                data.autoConfirmPerformance.percent == null
                  ? '—'
                  : `${data.autoConfirmPerformance.percent}%`
              }
            />
            <MetricRow
              label="Daily turnover"
              progress={null}
              value={formatAmountMinor(
                data.dailyTurnover.totalAmountMinor,
                data.dailyTurnover.currency,
              )}
            />
          </View>
        </>
      ) : (
        <Text
          className="text-[13px] text-slate-500"
          style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
        >
          Choose a date range to load performance.
        </Text>
      )}

      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable className="flex-1 justify-end bg-slate-950/40" onPress={() => setMenuOpen(false)}>
          <View className="rounded-t-3xl bg-white px-4 pb-8 pt-3">
            <View className="mb-3 items-center">
              <View className="h-1 w-10 rounded-full bg-slate-300" />
            </View>
            {PERIODS.map((item) => (
              <Pressable
                key={item}
                className="min-h-[48px] justify-center border-b border-slate-100"
                onPress={() => choosePeriod(item)}
              >
                <Text
                  className="text-[15px] text-slate-900"
                  style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                >
                  {ACCOUNT_SETTINGS_COPY.periods[item]}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal transparent visible={rangeOpen} animationType="slide" onRequestClose={() => setRangeOpen(false)}>
        <View className="flex-1 justify-end bg-slate-950/40">
          <View className="rounded-t-3xl bg-white p-5">
            <Text
              className="text-lg text-slate-900"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              Custom
            </Text>
            <View className="mt-4 flex-row rounded-xl bg-slate-100 p-1">
              {(['Start date', 'End date'] as const).map((label, index) => (
                <Pressable
                  key={label}
                  className="flex-1 rounded-lg px-3 py-2"
                  style={{
                    backgroundColor: editingStart === (index === 0) ? '#FFFFFF' : 'transparent',
                  }}
                  onPress={() => setEditingStart(index === 0)}
                >
                  <Text
                    className="text-center text-xs text-slate-700"
                    style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <DateTimePicker
              display="spinner"
              maximumDate={new Date()}
              value={editingStart ? start : end}
              onChange={(_, date) => {
                if (!date) return;
                if (editingStart) setStart(date);
                else setEnd(date);
              }}
            />
            <View className="mt-4 flex-row gap-3">
              <Pressable
                className="flex-1 items-center rounded-xl border border-slate-200 py-3"
                onPress={() => setRangeOpen(false)}
              >
                <Text
                  className="text-sm text-slate-700"
                  style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                >
                  {ACCOUNT_SETTINGS_COPY.cancel}
                </Text>
              </Pressable>
              <Pressable className="flex-1 items-center rounded-xl bg-blue py-3" onPress={applyRange}>
                <Text
                  className="text-sm text-white"
                  style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                >
                  {ACCOUNT_SETTINGS_COPY.save}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SettingsCard>
  );
}
