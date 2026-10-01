import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays, TrendingUp } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import {
  EARNINGS_PERIODS,
  type EarningsPeriod,
} from '@/constants/home';
import { formatAmountMinor } from '@/features/home/lib/format';
import type { DashboardEarnings } from '@/features/home/types';

type HomeEarningsCardProps = {
  data?: DashboardEarnings;
  error?: boolean;
  loading?: boolean;
  period: EarningsPeriod;
  onPeriodChange: (period: EarningsPeriod) => void;
  onCustomRangeChange: (startDate: string, endDate: string) => void;
  onRetry: () => void;
};

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function HomeEarningsCard({
  data,
  error = false,
  loading = false,
  period,
  onPeriodChange,
  onCustomRangeChange,
  onRetry,
}: HomeEarningsCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingStart, setEditingStart] = useState(true);
  const [start, setStart] = useState(() => new Date());
  const [end, setEnd] = useState(() => new Date());

  const selectPeriod = (next: EarningsPeriod) => {
    if (next === 'custom') {
      setPickerOpen(true);
      return;
    }
    onPeriodChange(next);
  };

  const commitRange = () => {
    const earliest = start <= end ? start : end;
    const latest = start <= end ? end : start;
    onCustomRangeChange(toDateKey(earliest), toDateKey(latest));
    setPickerOpen(false);
  };

  return (
    <View className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <TrendingUp color="#059669" size={18} strokeWidth={2.5} />
          <Text
            className="text-base font-bold text-slate-900"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            Earnings
          </Text>
        </View>
        <View className="flex-row rounded-xl bg-slate-100 p-0.5">
          {EARNINGS_PERIODS.map((item) => {
            const active = item.key === period;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className="rounded-lg px-2 py-1.5"
                style={{ backgroundColor: active ? '#FFFFFF' : 'transparent' }}
                onPress={() => selectPeriod(item.key)}
              >
                <Text
                  className={active ? 'text-[11px] text-slate-900' : 'text-[11px] text-slate-500'}
                  style={{
                    fontFamily: active
                      ? 'PlusJakartaSans_700Bold'
                      : 'PlusJakartaSans_600SemiBold',
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {error ? (
        <View className="mt-5 items-start">
          <Text
            className="text-sm text-slate-600"
            style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
          >
            Unable to load earnings.
          </Text>
          <Pressable className="mt-2 rounded-lg bg-blue px-3 py-2" onPress={onRetry}>
            <Text className="text-xs text-white" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="mt-5">
          <Text className="text-xs text-slate-500" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>
            {period === 'custom' ? 'Custom period' : period === 'today' ? 'Today' : period.toUpperCase()}
          </Text>
          <Text
            className="mt-1 text-[28px] font-bold tracking-tight text-emerald-600"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {loading && !data ? 'Loading…' : formatAmountMinor(data?.earningsMinor ?? 0, data?.currency ?? 'INR')}
          </Text>
          <View className="mt-6">
            <Text className="text-xs text-slate-500" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>
              Payin Success Rate
            </Text>
            <Text className="mt-1 text-xl text-emerald-600" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
              {(data?.payinSuccessRate ?? 0).toFixed(1)}%
            </Text>
          </View>
        </View>
      )}

      <Modal animationType="slide" transparent visible={pickerOpen} onRequestClose={() => setPickerOpen(false)}>
        <View className="flex-1 justify-end bg-slate-950/40">
          <View className="rounded-t-3xl bg-white p-5">
            <View className="flex-row items-center gap-2">
              <CalendarDays color="#1B6CA8" size={20} />
              <Text className="text-lg text-slate-900" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
                Custom date range
              </Text>
            </View>
            <View className="mt-5 flex-row rounded-xl bg-slate-100 p-1">
              {(['Start date', 'End date'] as const).map((label, index) => (
                <Pressable
                  key={label}
                  className="flex-1 rounded-lg px-3 py-2"
                  style={{ backgroundColor: editingStart === (index === 0) ? '#FFFFFF' : 'transparent' }}
                  onPress={() => setEditingStart(index === 0)}
                >
                  <Text className="text-center text-xs text-slate-700" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
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
              <Pressable className="flex-1 items-center rounded-xl border border-slate-200 py-3" onPress={() => setPickerOpen(false)}>
                <Text className="text-sm text-slate-700" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>Cancel</Text>
              </Pressable>
              <Pressable className="flex-1 items-center rounded-xl bg-blue py-3" onPress={commitRange}>
                <Text className="text-sm text-white" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>Apply range</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
