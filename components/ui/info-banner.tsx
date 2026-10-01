import { type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Info } from 'lucide-react-native';

export type InfoBannerVariant = 'info' | 'warning' | 'success';

type InfoBannerProps = {
  title: string;
  message: string;
  variant?: InfoBannerVariant;
  icon?: ReactNode;
};

const variantStyles: Record<
  InfoBannerVariant,
  { container: string; iconBg: string; iconColor: string; title: string; body: string }
> = {
  info: {
    container: 'border-blue-200 bg-blue-50',
    iconBg: 'bg-blue-100',
    iconColor: '#1B6CA8',
    title: 'text-blue-700',
    body: 'text-blue-600',
  },
  warning: {
    container: 'border-amber-200 bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: '#D97706',
    title: 'text-amber-800',
    body: 'text-amber-700',
  },
  success: {
    container: 'border-teal-200 bg-teal-50',
    iconBg: 'bg-teal-100',
    iconColor: '#0D9488',
    title: 'text-teal-800',
    body: 'text-teal-700',
  },
};

/**
 * Reusable notice / information banner.
 * Color tokens stay on Clearpay navy/blue/teal — dark surfaces can be layered later.
 */
export function InfoBanner({
  title,
  message,
  variant = 'info',
  icon,
}: InfoBannerProps) {
  const styles = variantStyles[variant];

  return (
    <View
      accessibilityRole="summary"
      className={`flex-row gap-3 rounded-2xl border px-4 py-3.5 ${styles.container}`}
    >
      <View
        className={`mt-0.5 h-9 w-9 items-center justify-center rounded-xl ${styles.iconBg}`}
      >
        {icon ?? <Info color={styles.iconColor} size={18} strokeWidth={2.25} />}
      </View>
      <View className="min-w-0 flex-1">
        <Text
          className={`text-[14px] font-semibold ${styles.title}`}
          style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
        >
          {title}
        </Text>
        <Text
          className={`mt-1 text-[13px] leading-5 ${styles.body}`}
          style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
        >
          {message}
        </Text>
      </View>
    </View>
  );
}
