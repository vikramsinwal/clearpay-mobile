import { Pressable, ScrollView, Text, View } from 'react-native';

import { PAYOUT_COPY, PAYOUT_SUMMARY_LABEL } from '@/constants/payout';
import type { PayoutOrderCounts, PayoutSummaryStatus } from '@/features/payout/types';
import { PAYOUT_SUMMARY_STATUSES } from '@/features/payout/types';

type PayoutSummaryChipsProps = {
  counts: PayoutOrderCounts | null;
  selected: PayoutSummaryStatus | null;
  onSelect: (status: PayoutSummaryStatus | null) => void;
};

const QUICK: (PayoutSummaryStatus | null)[] = [null, ...PAYOUT_SUMMARY_STATUSES];

export function PayoutSummaryChips({ counts, selected, onSelect }: PayoutSummaryChipsProps) {
  return (
    <View>
      {counts ? (
        <ScrollView
          horizontal
          contentContainerClassName="gap-2 px-4 pb-2"
          showsHorizontalScrollIndicator={false}
        >
          {PAYOUT_SUMMARY_STATUSES.map((status) => (
            <View key={status} className="rounded-xl bg-white px-3 py-2">
              <Text className="text-[11px] text-slate-500">{PAYOUT_SUMMARY_LABEL[status]}</Text>
              <Text
                className="text-[16px] text-slate-900"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                {counts[status]}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
      <ScrollView
        horizontal
        contentContainerClassName="gap-2 px-4 py-2"
        showsHorizontalScrollIndicator={false}
      >
        {QUICK.map((status) => {
          const active = selected === status;
          const label = status ? PAYOUT_SUMMARY_LABEL[status] : PAYOUT_COPY.all;
          return (
            <Pressable
              key={label}
              accessibilityRole="button"
              className={`rounded-full px-3 py-1.5 ${active ? 'bg-blue' : 'bg-white'}`}
              onPress={() => onSelect(status)}
            >
              <Text
                className={`text-[12px] ${active ? 'text-white' : 'text-slate-700'}`}
                style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
