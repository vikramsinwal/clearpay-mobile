import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

export type FeatureHighlightProps = {
  icon: ReactNode;
  title: string;
  description: string;
  /** Visual status cue (e.g. active / verified). Defaults to an active teal dot. */
  statusIndicator?: ReactNode;
  accessibilityLabel?: string;
};

/**
 * Reusable onboarding / marketing feature card.
 * Pass icon, title, description, and optional status indicator — do not fork
 * per-feature card implementations.
 */
export function FeatureHighlight({
  icon,
  title,
  description,
  statusIndicator,
  accessibilityLabel,
}: FeatureHighlightProps) {
  return (
    <View
      accessible
      accessibilityLabel={
        accessibilityLabel ?? `${title}. ${description}`
      }
      className="flex-row items-start gap-3 rounded-2xl border border-navy-100 bg-white px-4 py-4"
      style={{
        shadowColor: '#0B1F3A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      <View className="h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
        {icon}
      </View>

      <View className="min-w-0 flex-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text
            className="flex-1 text-base font-semibold text-navy"
            numberOfLines={2}
            style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
          >
            {title}
          </Text>
          {statusIndicator ?? (
            <View
              accessibilityLabel="Active"
              accessibilityRole="image"
              className="h-2.5 w-2.5 rounded-full bg-teal"
            />
          )}
        </View>
        <Text
          className="mt-1 text-sm leading-5 text-navy-300"
          style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}
