import {
  Bell,
  Check,
  CircleAlert,
  CircleCheck,
  Info,
  Lock,
  Shield,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { memo, useMemo } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { formatNotificationTimestamp } from '@/features/home/lib/format';
import {
  isSystemMessage,
  parseNotificationMessage,
} from '@/features/home/lib/notification-message';
import type { CustomerNotification, NotificationAction } from '@/features/home/types';

type NotificationCardProps = {
  item: CustomerNotification;
  pending: boolean;
  colors: ThemeColors;
  onMarkRead: (id: string) => void;
  onAction: (action: NotificationAction) => void;
};

const monoFamily = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const NOTIFICATION_ICONS: Record<string, LucideIcon> = {
  warning: TriangleAlert,
  lock: Lock,
  info: Info,
  bell: Bell,
  payment: Wallet,
  security: Shield,
  success: CircleCheck,
  error: CircleAlert,
  announcement: Bell,
};

function NotificationGlyph({
  icon,
  type,
  color,
}: {
  icon?: string;
  type: string;
  color: string;
}) {
  const Icon =
    (icon ? NOTIFICATION_ICONS[icon.toLowerCase()] : undefined) ??
    NOTIFICATION_ICONS[type.toLowerCase()] ??
    Info;
  return <Icon color={color} size={14} strokeWidth={2.4} />;
}

function MessageBody({
  message,
  system,
  colors,
}: {
  message: string;
  system: boolean;
  colors: ThemeColors;
}) {
  const blocks = useMemo(() => parseNotificationMessage(message), [message]);

  if (system) {
    return (
      <Text
        selectable
        className="my-1 w-full rounded-md border border-app-border bg-slate-50 px-2 py-1 text-xs text-slate-700 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-100"
        style={{ fontFamily: monoFamily }}
      >
        {message}
      </Text>
    );
  }

  return (
    <View className="gap-1.5">
      {blocks.map((block, index) => (
        <Text
          key={`${index}-${block.runs[0]?.text ?? 'line'}`}
          className="text-xs leading-5 text-slate-600 dark:text-navy-200"
          style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
        >
          {block.runs.map((run, runIndex) => (
            <Text
              key={`${runIndex}-${run.text}`}
              style={{
                fontFamily: run.bold
                  ? 'PlusJakartaSans_700Bold'
                  : 'PlusJakartaSans_400Regular',
                color: run.bold ? colors.textPrimary : colors.textSecondary,
              }}
            >
              {run.text || ' '}
            </Text>
          ))}
        </Text>
      ))}
    </View>
  );
}

function MarkReadButton({
  title,
  pending,
  colors,
  onPress,
}: {
  title: string;
  pending: boolean;
  colors: ThemeColors;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Mark ${title} as read`}
      accessibilityRole="button"
      className="min-h-11 min-w-11 items-center justify-center"
      disabled={pending}
      hitSlop={8}
      onPress={onPress}
    >
      {pending ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : (
        <Check color={colors.textFaint} size={16} strokeWidth={2} />
      )}
    </Pressable>
  );
}

function ActionButton({
  action,
  onAction,
}: {
  action: NotificationAction;
  onAction: (action: NotificationAction) => void;
}) {
  return (
    <Pressable
      accessibilityLabel={action.label}
      accessibilityRole="button"
      className="min-h-11 shrink-0 items-center justify-center rounded-lg bg-app-primary px-3 active:opacity-90"
      onPress={() => onAction(action)}
    >
      <Text className="text-xs text-white" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>
        {action.label}
      </Text>
    </Pressable>
  );
}

function NotificationCardComponent({
  item,
  pending,
  colors,
  onMarkRead,
  onAction,
}: NotificationCardProps) {
  const system = isSystemMessage(item.type, item.message);
  const showNew = !item.isRead && item.isNew;
  const compactAction =
    Boolean(item.action) && !item.message.includes('\n') && item.message.length < 180;
  const timestamp = formatNotificationTimestamp(item.createdAt);

  const heading = (
    <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-1.5">
      <NotificationGlyph color={colors.primary} icon={item.icon} type={item.type} />
      <Text
        className="shrink text-xs text-slate-900 dark:text-white"
        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
      >
        {item.title}
      </Text>
      {showNew ? (
        <View className="rounded-full bg-app-primary px-2 py-0.5">
          <Text
            className="text-[10px] uppercase tracking-wider text-white"
            style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
          >
            New
          </Text>
        </View>
      ) : null}
    </View>
  );

  const message = (
    <View className="mt-1">
      <MessageBody colors={colors} message={item.message} system={system} />
    </View>
  );

  return (
    <View
      accessibilityLabel={`${item.title}. ${showNew ? 'New. ' : item.isRead ? 'Read. ' : ''}${item.message}. ${timestamp}`}
      className={`rounded-xl border bg-app-surface p-3.5 shadow-sm dark:bg-navy-800 ${
        item.isRead ? 'border-app-border dark:border-navy-700' : 'border-blue-200 dark:border-blue-700'
      }`}
    >
      {compactAction && item.action ? (
        <View className="flex-row flex-wrap items-start gap-3">
          <View className="min-w-[58%] flex-1">
            <View className="flex-row items-start gap-2">
              {heading}
              {item.isRead ? null : (
                <MarkReadButton
                  colors={colors}
                  pending={pending}
                  title={item.title}
                  onPress={() => onMarkRead(item.id)}
                />
              )}
            </View>
            {message}
          </View>
          <ActionButton action={item.action} onAction={onAction} />
        </View>
      ) : (
        <View>
          <View className="flex-row items-start gap-2">
            {heading}
            {item.isRead ? null : (
              <MarkReadButton
                colors={colors}
                pending={pending}
                title={item.title}
                onPress={() => onMarkRead(item.id)}
              />
            )}
          </View>
          {message}
          {item.action ? (
            <View className="mt-2 items-start">
              <ActionButton action={item.action} onAction={onAction} />
            </View>
          ) : null}
        </View>
      )}
      <Text
        className={`text-[11px] text-slate-400 dark:text-navy-300 ${system ? 'mt-1' : 'mt-2'}`}
        style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
      >
        {timestamp}
      </Text>
    </View>
  );
}

export const NotificationCard = memo(NotificationCardComponent);
