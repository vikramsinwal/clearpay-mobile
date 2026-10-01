import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from 'react-native';

type OutlineButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  loading?: boolean;
};

/** Secondary / outline CTA matching Clearpay auth screens. */
export function OutlineButton({
  label,
  loading = false,
  disabled,
  ...props
}: OutlineButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className="h-[52px] items-center justify-center rounded-[14px] border border-blue-200 bg-white px-4"
      style={({ pressed }) => [{ opacity: pressed || isDisabled ? 0.85 : 1 }]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#1B6CA8" />
      ) : (
        <Text
          className="text-[16px] font-bold tracking-tight text-blue"
          style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
