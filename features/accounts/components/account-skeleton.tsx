import { View } from 'react-native';

function Bone({ className }: { className: string }) {
  return <View className={`rounded-md bg-slate-200 dark:bg-navy-700 ${className}`} />;
}

export function AccountCardSkeleton() {
  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-navy-700 dark:bg-navy-800">
      <View className="flex-row items-center gap-3">
        <Bone className="h-4 w-4" />
        <Bone className="h-10 w-10 rounded-xl" />
        <View className="flex-1 gap-2">
          <Bone className="h-3 w-32" />
          <Bone className="h-2.5 w-24" />
        </View>
      </View>
      <Bone className="mt-4 h-8 w-full" />
      <Bone className="mt-3 h-14 w-full rounded-xl" />
      <Bone className="mt-3 h-3 w-40" />
    </View>
  );
}

export function AccountSkeletonList() {
  return (
    <View className="gap-3 px-3.5 pt-3">
      <AccountCardSkeleton />
      <AccountCardSkeleton />
      <AccountCardSkeleton />
      <AccountCardSkeleton />
      <AccountCardSkeleton />
    </View>
  );
}
