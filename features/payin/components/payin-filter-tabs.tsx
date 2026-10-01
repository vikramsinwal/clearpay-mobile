import { Pressable, Text, View } from 'react-native';

import type { PayinListTab, PayinOrderCounts } from '@/features/payin/types';

const SEGMENTS: { tab: PayinListTab; label: string }[] = [
  { tab: 'pending', label: 'Pending' },
  { tab: 'action_required', label: 'Review' },
  { tab: 'completed', label: 'Success' },
];

function segmentCount(
  tab: PayinListTab,
  counts: PayinOrderCounts | null,
  total: number | null,
): string | null {
  if (!counts && total == null) return null;
  if (tab === 'completed') {
    const value = counts?.completed ?? 0;
    return value > 150 ? '150+' : String(value);
  }
  if (tab === 'pending') return String(counts?.pending ?? 0);
  if (tab === 'action_required') return String(counts?.processing ?? 0);
  return total == null ? null : String(total);
}

export function PayinFilterTabs({
  selected,
  counts,
  total,
  onSelect,
}: {
  selected: PayinListTab;
  counts: PayinOrderCounts | null;
  total: number | null;
  onSelect: (tab: PayinListTab) => void;
}) {
  return (
    <View
      accessibilityRole="tablist"
      className="mx-3.5 mt-3 flex-row rounded-xl bg-[#e2e8f0] p-1"
    >
      {SEGMENTS.map((segment) => {
        const active = selected === segment.tab;
        const count = segmentCount(segment.tab, counts, total);
        return (
          <Pressable
            key={segment.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`flex-1 flex-row items-center justify-center gap-1 rounded-lg py-1.5 ${
              active ? 'bg-white' : ''
            }`}
            onPress={() => onSelect(segment.tab)}
          >
            <Text
              className={`text-[12px] ${active ? 'text-[#0f172a]' : 'text-[#475569]'}`}
              style={{ fontFamily: active ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_600SemiBold' }}
            >
              {segment.label}
            </Text>
            {count != null ? (
              <View
                className={`rounded-full px-1.5 ${
                  active && segment.tab === 'completed' ? 'bg-[#d1fae5]' : 'bg-[#cbd5e1]'
                }`}
              >
                <Text
                  className={`text-[10px] ${
                    active && segment.tab === 'completed' ? 'text-[#047857]' : 'text-[#334155]'
                  }`}
                  style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                >
                  {count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
