import { Pressable, Text, View } from 'react-native';

import { ACCOUNT_SETTINGS_COPY } from '@/constants/profile';

export function SettingsCard({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'danger';
}) {
  const danger = tone === 'danger';
  return (
    <View
      className={`rounded-2xl border p-4 shadow-sm ${
        danger ? 'border-red-200 bg-red-50/70' : 'border-slate-200/90 bg-white'
      }`}
    >
      {children}
    </View>
  );
}

export function SettingsHeading({
  title,
  trailing,
}: {
  title: string;
  trailing?: React.ReactNode;
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between gap-3">
      <Text
        className="text-[15px] text-slate-900"
        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
      >
        {title}
      </Text>
      {trailing}
    </View>
  );
}

export function CardSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <View className="rounded-2xl border border-slate-200/90 bg-white p-4">
      <View className="h-4 w-36 rounded-md bg-slate-200" />
      <View className="mt-4 gap-2.5">
        {Array.from({ length: lines }, (_, index) => (
          <View
            key={index}
            className="h-9 rounded-xl bg-slate-100"
            style={{ width: index % 2 === 0 ? '100%' : '72%' }}
          />
        ))}
      </View>
    </View>
  );
}

export function CardError({
  message = ACCOUNT_SETTINGS_COPY.cardError,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <View className="rounded-2xl border border-slate-200/90 bg-white p-4">
      <Text
        className="text-[13px] text-slate-600"
        style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
      >
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        className="mt-3 self-start rounded-lg bg-blue px-3 py-2"
        onPress={onRetry}
      >
        <Text
          className="text-xs text-white"
          style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
        >
          {ACCOUNT_SETTINGS_COPY.retry}
        </Text>
      </Pressable>
    </View>
  );
}
