import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type GradientButtonProps = PressableProps & {
  label: string;
  loading?: boolean;
  loadingLabel?: string;
};

export function GradientButton({
  label,
  loading = false,
  loadingLabel,
  disabled,
  ...pressableProps
}: GradientButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      {...pressableProps}
      className={`overflow-hidden rounded-2xl ${isDisabled ? 'opacity-70' : ''}`}
      style={({ pressed }) => [{ opacity: pressed && !isDisabled ? 0.92 : 1 }]}
    >
      <LinearGradient
        colors={['#1B6CA8', '#0D9488']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          height: 52,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16,
          shadowColor: '#1B6CA8',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.22,
          shadowRadius: 10,
          elevation: 3,
        }}
      >
        <View className="flex-row items-center gap-2">
          {loading ? <ActivityIndicator color="#FFFFFF" /> : null}
          <Text className="text-[16px] font-semibold text-white">
            {loading ? loadingLabel ?? label : label}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
