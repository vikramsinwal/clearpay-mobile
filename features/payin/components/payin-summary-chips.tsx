import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PAYIN_SUMMARY_LABEL } from '@/constants/payin';
import type { PayinOrderCounts, PayinSummaryStatus } from '@/features/payin/types';
import { PAYIN_SUMMARY_STATUSES } from '@/features/payin/types';

type PayinSummaryChipsProps = {
  counts: PayinOrderCounts | null;
  selected: PayinSummaryStatus | null;
  onSelect: (status: PayinSummaryStatus | null) => void;
};

export function PayinSummaryChips({ counts, selected, onSelect }: PayinSummaryChipsProps) {
  return (
    <ScrollView
      horizontal
      contentContainerClassName="gap-2 px-4 py-3"
      showsHorizontalScrollIndicator={false}
    >
      {PAYIN_SUMMARY_STATUSES.map((status) => {
        const active = selected === status;
        const count = counts ? counts[status] : '—';
        return (
          <Pressable
            key={status}
            accessibilityRole="button"
            className={`rounded-full border px-3 py-2 ${
              active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'
            }`}
            onPress={() => onSelect(active ? null : status)}
          >
            <Text
              className={`text-[12px] ${active ? 'text-blue-700' : 'text-slate-600'}`}
              style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
            >
              {PAYIN_SUMMARY_LABEL[status]}
            </Text>
            <Text
              className="text-[16px] text-slate-900"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {count}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SectionCard({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <View className="mx-4 mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      {title ? (
        <Text
          className="text-[11px] uppercase tracking-wide text-slate-400"
          style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
