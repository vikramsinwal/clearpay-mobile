import { Bell } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';

export function NotificationSkeletonList() {
  return (
    <View accessibilityLabel="Loading notifications" className="gap-3 px-3 py-3">
      {Array.from({ length: 5 }, (_, index) => (
        <View
          key={index}
          className="rounded-xl border border-app-border bg-app-surface p-3.5 dark:border-navy-700 dark:bg-navy-800"
        >
          <View className="h-3 w-40 rounded-full bg-slate-200 dark:bg-navy-700" />
          <View className="mt-3 h-3 w-full rounded-full bg-slate-200 dark:bg-navy-700" />
          <View className="mt-2 h-3 w-4/5 rounded-full bg-slate-200 dark:bg-navy-700" />
          <View className="mt-3 h-2.5 w-28 rounded-full bg-slate-100 dark:bg-navy-700" />
        </View>
      ))}
    </View>
  );
}

export function NotificationEmptyState({ colors }: { colors: ThemeColors }) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-16">
      <Bell color={colors.textFaint} size={36} strokeWidth={1.8} />
      <Text
        className="mt-4 text-base text-slate-900 dark:text-white"
        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
      >
        No notifications
      </Text>
      <Text
        className="mt-1 text-center text-sm text-slate-500 dark:text-navy-200"
        style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
      >
        {"You're all caught up."}
      </Text>
    </View>
  );
}

export function NotificationErrorState({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-16">
      <Text
        className="text-base text-slate-900 dark:text-white"
        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
      >
        Unable to load notifications
      </Text>
      <Text
        className="mt-1 text-center text-sm text-slate-500 dark:text-navy-200"
        style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
      >
        Please try again.
      </Text>
      <Pressable
        accessibilityLabel="Retry loading notifications"
        accessibilityRole="button"
        className="mt-4 min-h-11 items-center justify-center rounded-xl bg-app-primary px-4"
        onPress={onRetry}
      >
        <Text className="text-sm text-white" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
          Retry
        </Text>
      </Pressable>
    </View>
  );
}
