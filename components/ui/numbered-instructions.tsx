import { Text, View } from 'react-native';

export type NumberedInstruction = {
  title: string;
  description?: string;
};

type NumberedInstructionsProps = {
  items: NumberedInstruction[];
  /** Optional card chrome — matches the Telegram verification instructions card. */
  variant?: 'plain' | 'card';
};

/**
 * Reusable numbered instruction list for multi-step user guidance.
 */
export function NumberedInstructions({
  items,
  variant = 'card',
}: NumberedInstructionsProps) {
  const content = (
    <View className="gap-4">
      {items.map((item, index) => (
        <View key={`${index}-${item.title}`} className="flex-row gap-3">
          <View className="h-7 w-7 items-center justify-center rounded-full bg-blue-100">
            <Text
              className="text-[13px] font-bold text-blue"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {index + 1}
            </Text>
          </View>
          <View className="min-w-0 flex-1 pt-0.5">
            <Text
              className="text-[14px] font-semibold leading-5 text-navy"
              style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
            >
              {item.title}
            </Text>
            {item.description ? (
              <Text
                className="mt-1 text-[13px] leading-5 text-navy-300"
                style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
              >
                {item.description}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );

  if (variant === 'plain') {
    return content;
  }

  return (
    <View
      className="rounded-2xl border border-navy-100 bg-white px-4 py-4"
      style={{
        shadowColor: '#0B1F3A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      {content}
    </View>
  );
}
