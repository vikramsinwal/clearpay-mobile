import { Bell, Check, Info } from 'lucide-react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { notificationText } from '@/features/home/lib/format';
import type { CustomerNotification } from '@/features/home/types';

type HomeNotificationsCardProps = {
  items?: CustomerNotification[];
  loading?: boolean;
  error?: boolean;
  markingReadId?: string | null;
  onMarkRead: (id: string) => void;
  onRetry: () => void;
  onViewAll: () => void;
};

function timestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date);
}

export function HomeNotificationsCard({
  items,
  loading = false,
  error = false,
  markingReadId = null,
  onMarkRead,
  onRetry,
  onViewAll,
}: HomeNotificationsCardProps) {
  return (
    <View className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Bell color="#F43F5E" size={18} strokeWidth={2} />
          <Text className="text-base text-slate-900" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
            Notifications
          </Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onViewAll}>
          <Text className="text-xs text-blue" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>View all &gt;</Text>
        </Pressable>
      </View>
      {error ? (
        <View className="items-start py-2">
          <Text className="text-sm text-slate-600" style={{ fontFamily: 'PlusJakartaSans_400Regular' }}>Unable to load notifications.</Text>
          <Pressable className="mt-2 rounded-lg bg-blue px-3 py-2" onPress={onRetry}>
            <Text className="text-xs text-white" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>Retry</Text>
          </Pressable>
        </View>
      ) : loading && !items ? (
        <View className="gap-2">{[1, 2, 3].map((item) => <View key={item} className="h-11 rounded-xl bg-slate-100" />)}</View>
      ) : items && items.length ? (
        <View className="gap-2">
          {items.slice(0, 5).map((item) => (
            <View key={item.id} className={`flex-row items-center gap-2 rounded-xl border p-2.5 ${item.isRead ? 'border-slate-100 bg-slate-50' : 'border-blue-100 bg-blue-50/70'}`}>
              <Info color={item.isRead ? '#64748B' : '#2563EB'} size={16} />
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-xs text-slate-800" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>{notificationText(item)}</Text>
                <Text className="mt-0.5 text-[10px] text-slate-400" style={{ fontFamily: 'PlusJakartaSans_400Regular' }}>{timestamp(item.createdAt)}</Text>
              </View>
              {item.isRead ? (
                <Check color="#059669" size={17} />
              ) : markingReadId === item.id ? (
                <ActivityIndicator color="#2563EB" size="small" />
              ) : (
                <Pressable
                  accessibilityLabel="Mark as read"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => onMarkRead(item.id)}
                >
                  <View className="h-2 w-2 rounded-full bg-blue" />
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-sm text-slate-500" style={{ fontFamily: 'PlusJakartaSans_400Regular' }}>You have no notifications.</Text>
      )}
    </View>
  );
}
