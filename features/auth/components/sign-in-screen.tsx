import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClearpayLogo } from '@/components/brand/clearpay-logo';
import { AuthTextField } from '@/components/ui/auth-text-field';
import { GradientButton } from '@/components/ui/gradient-button';
import { useSignIn } from '@/features/auth/hooks/use-sign-in';
import {
  signInSchema,
  type SignInFormValues,
} from '@/features/auth/schemas/sign-in-schema';

export function SignInScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onSubmit',
  });

  const signIn = useSignIn({
    onFormError: setFormError,
    onSuccessClearForm: () => {
      reset({ email: '', password: '' });
      setShowPassword(false);
      setFormError(null);
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    signIn.mutate(values);
  });

  return (
    <SafeAreaView className="flex-1 bg-[#F3F8FC]" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-5 pb-8 pt-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-8 items-center">
            <ClearpayLogo size={80} />
          </View>

          <View
            className="w-full self-center rounded-[20px] bg-white px-5 py-7"
            style={{
              maxWidth: 420,
              shadowColor: '#1B6CA8',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.12,
              shadowRadius: 24,
              elevation: 8,
            }}
          >
            <Text
              className="text-center text-[26px] font-bold text-navy"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              Welcome back!
            </Text>
            <Text
              className="mt-2 text-center text-[14px] text-navy-300"
              style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
            >
              Sign in to your trader account
            </Text>

            <View className="mt-7 gap-4">
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <AuthTextField
                    ref={ref}
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    error={errors.email?.message}
                    keyboardType="email-address"
                    label="Email"
                    onBlur={onBlur}
                    onChangeText={(text) => {
                      onChange(text);
                      if (formError) {
                        setFormError(null);
                      }
                    }}
                    placeholder="you@company.com"
                    returnKeyType="next"
                    textContentType="emailAddress"
                    value={value}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <View>
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text
                        className="text-[13px] font-semibold text-navy"
                        style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                      >
                        Password
                      </Text>
                      <Link href="/forgot-password" asChild>
                        <Pressable hitSlop={8}>
                          <Text
                            className="text-[13px] font-semibold text-blue"
                            style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                          >
                            Forgot password?
                          </Text>
                        </Pressable>
                      </Link>
                    </View>
                    <AuthTextField
                      ref={ref}
                      autoCapitalize="none"
                      autoComplete="password"
                      autoCorrect={false}
                      error={errors.password?.message}
                      onBlur={onBlur}
                      onChangeText={(text) => {
                        onChange(text);
                        if (formError) {
                          setFormError(null);
                        }
                      }}
                      placeholder="Enter your password"
                      returnKeyType="done"
                      secureTextEntry={!showPassword}
                      textContentType="password"
                      value={value}
                      onSubmitEditing={onSubmit}
                      rightSlot={
                        <Pressable
                          accessibilityLabel={
                            showPassword ? 'Hide password' : 'Show password'
                          }
                          accessibilityRole="button"
                          className="ml-2 p-1"
                          hitSlop={8}
                          onPress={() => setShowPassword((current) => !current)}
                        >
                          {showPassword ? (
                            <EyeOff color="#5A7BA3" size={20} />
                          ) : (
                            <Eye color="#5A7BA3" size={20} />
                          )}
                        </Pressable>
                      }
                    />
                  </View>
                )}
              />
            </View>

            {formError ? (
              <Text
                accessibilityLiveRegion="polite"
                className="mt-4 text-center text-[13px] text-red-600"
                style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
              >
                {formError}
              </Text>
            ) : null}

            <View className="mt-6">
              <GradientButton
                disabled={signIn.isPending}
                label="Sign In"
                loading={signIn.isPending}
                onPress={onSubmit}
              />
            </View>

            <View className="my-6 flex-row items-center gap-3">
              <View className="h-px flex-1 bg-navy-100" />
              <Text
                className="text-[12px] uppercase tracking-widest text-navy-200"
                style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
              >
                or
              </Text>
              <View className="h-px flex-1 bg-navy-100" />
            </View>

            <View className="flex-row items-center justify-center gap-1">
              <Text
                className="text-[14px] text-navy-300"
                style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
              >
                New here?
              </Text>
              <Link href="/register" asChild>
                <Pressable hitSlop={8}>
                  <Text
                    className="text-[14px] font-bold text-blue"
                    style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                  >
                    Sign Up
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>

          <View className="mt-8 items-center px-4">
            <View className="flex-row items-center gap-2">
              <ShieldCheck color="#1B6CA8" size={16} />
              <Lock color="#1B6CA8" size={14} />
              <Text
                className="text-center text-[12px] text-navy-300"
                style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
              >
                End-to-end encrypted 256-bit Portal
              </Text>
            </View>
            {Platform.OS === 'ios' ? (
              <View className="mt-5 h-1 w-28 rounded-full bg-navy-100 opacity-70" />
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
