import { Pressable, Text, View } from 'react-native';

import { PAYIN_COPY } from '@/constants/payin';

function Bone({ className }: { className: string }) {
  return <View className={`rounded-md bg-[#d6e3ff] ${className}`} />;
}

export function PayinOrderCardSkeleton() {
  return (
    <View className="mb-3 rounded-xl bg-white px-4 py-4">
      <View className="flex-row justify-between">
        <Bone className="h-4 w-28" />
        <Bone className="h-4 w-16" />
      </View>
      <Bone className="mt-3 h-3 w-40" />
      <Bone className="mt-4 h-7 w-36" />
      <Bone className="mt-3 h-3 w-24" />
    </View>
  );
}

export function PayinListSkeleton() {
  return (
    <View className="px-4 pt-3" accessibilityLabel={PAYIN_COPY.skeleton}>
      <PayinOrderCardSkeleton />
      <PayinOrderCardSkeleton />
      <PayinOrderCardSkeleton />
      <PayinOrderCardSkeleton />
    </View>
  );
}

export function PayinDashboardSkeleton() {
  return (
    <View className="gap-3 px-4 pt-4" accessibilityLabel={PAYIN_COPY.skeleton}>
      <Bone className="h-24 w-full rounded-xl" />
      <View className="flex-row gap-3">
        <Bone className="h-20 flex-1 rounded-xl" />
        <Bone className="h-20 flex-1 rounded-xl" />
      </View>
      <View className="flex-row gap-3">
        <Bone className="h-20 flex-1 rounded-xl" />
        <Bone className="h-20 flex-1 rounded-xl" />
      </View>
      <Bone className="h-28 w-full rounded-xl" />
      <PayinOrderCardSkeleton />
    </View>
  );
}

export function PayinEmptyState({
  title = PAYIN_COPY.emptyTitle,
  body = PAYIN_COPY.emptyBody,
  actionLabel,
  onAction,
}: {
  title?: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="items-center px-8 py-16">
      <Text
        className="text-center text-[16px] text-[#0d1c32]"
        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
      >
        {title}
      </Text>
      <Text className="mt-2 text-center text-[13px] leading-5 text-[#414754]">{body}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          className="mt-4 rounded-lg bg-[#0058bc] px-4 py-2.5"
          onPress={onAction}
        >
          <Text
            className="text-[13px] text-white"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PayinErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View className="items-center px-8 py-16">
      <Text className="text-center text-[14px] text-[#414754]">{message}</Text>
      <Pressable accessibilityRole="button" className="mt-4" onPress={onRetry}>
        <Text
          className="text-[15px] text-[#0058bc]"
          style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
        >
          {PAYIN_COPY.retry}
        </Text>
      </Pressable>
    </View>
  );
}
