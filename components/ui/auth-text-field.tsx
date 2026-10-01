import { forwardRef } from 'react';
import {
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

type AuthTextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  helperText?: string;
  /** Convenience alias for secureTextEntry on password fields. */
  isPassword?: boolean;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
};

export const AuthTextField = forwardRef<TextInput, AuthTextFieldProps>(
  function AuthTextField(
    {
      label,
      error,
      helperText,
      isPassword,
      leftSlot,
      rightSlot,
      style,
      secureTextEntry,
      ...props
    },
    ref,
  ) {
    return (
      <View className="w-full">
        {label ? (
          <Text
            className="mb-2 text-[13px] font-semibold text-navy"
            style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
          >
            {label}
          </Text>
        ) : null}
        <View
          className="min-h-[52px] flex-row items-center rounded-2xl border px-4"
          style={{
            backgroundColor: '#E8F3FA',
            borderColor: error ? '#DC2626' : '#C5E0F2',
            borderRadius: 14,
          }}
        >
          {leftSlot}
          <TextInput
            ref={ref}
            placeholderTextColor="#8FA7C4"
            className="flex-1 py-3 text-[15px] text-navy"
            style={[{ fontFamily: 'PlusJakartaSans_400Regular' }, style]}
            secureTextEntry={secureTextEntry ?? isPassword}
            {...props}
          />
          {rightSlot}
        </View>
        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            className="mt-1.5 text-[12px] text-red-600"
            style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
          >
            {error}
          </Text>
        ) : helperText ? (
          <Text
            className="mt-1.5 text-[12px] text-navy-300"
            style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
          >
            {helperText}
          </Text>
        ) : null}
      </View>
    );
  },
);
