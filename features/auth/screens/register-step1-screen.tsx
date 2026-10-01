import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClearpayLogo } from '@/components/brand/clearpay-logo';
import { AuthTextField } from '@/components/ui/auth-text-field';
import { GradientButton } from '@/components/ui/gradient-button';
import { useRegisterMutation } from '@/features/auth/hooks/use-register';
import { getRegisterErrorMessage } from '@/features/auth/lib/register-errors';
import {
  registerStep1Schema,
  type RegisterStep1Values,
} from '@/features/auth/schema/register-step1';
import { ApiClientError } from '@/lib/api/errors';

export function RegisterStep1Screen() {
  const router = useRouter();
  const registerMutation = useRegisterMutation();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterStep1Values>({
    resolver: zodResolver(registerStep1Schema),
    defaultValues: {
      email: '',
      fullName: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onSubmit',
  });

  const busy = isSubmitting || registerMutation.isPending;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const email = values.email.trim().toLowerCase();

    try {
      await registerMutation.mutateAsync({
        name: values.fullName.trim(),
        email,
        password: values.password,
      });
      reset({
        email: '',
        fullName: '',
        password: '',
        confirmPassword: '',
      });
      setShowPassword(false);
      setShowConfirmPassword(false);
      router.replace({
        pathname: '/register/success',
        params: { email },
      });
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.fieldErrors.email) {
          setError('email', { message: error.fieldErrors.email });
        }
        if (error.fieldErrors.name) {
          setError('fullName', { message: error.fieldErrors.name });
        }
        if (error.fieldErrors.password) {
          setError('password', { message: error.fieldErrors.password });
        }
      }
      setFormError(getRegisterErrorMessage(error));
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-[#F3F8FC]" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="grow px-6 pb-6 pt-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center pt-2">
            <ClearpayLogo size={80} />
          </View>

          <View className="mt-7">
            <Text
              className="text-center text-[28px] font-bold tracking-tight text-navy"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              Create account
            </Text>
            <Text
              className="mt-2 text-center text-[14px] text-slate-500"
              style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
            >
              Create your trader account in one step
            </Text>
          </View>

          <View className="mt-7 gap-4">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value, ref } }) => (
                <AuthTextField
                  ref={ref}
                  label="Email"
                  placeholder="you@company.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  autoComplete="email"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.email?.message}
                  editable={!busy}
                />
              )}
            />

            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, onBlur, value, ref } }) => (
                <AuthTextField
                  ref={ref}
                  label="Full Name"
                  placeholder="Alex Trader"
                  autoCapitalize="words"
                  textContentType="name"
                  autoComplete="name"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.fullName?.message}
                  editable={!busy}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value, ref } }) => (
                <View>
                  <AuthTextField
                    ref={ref}
                    label="Password"
                    placeholder="••••••••"
                    textContentType="newPassword"
                    autoComplete="new-password"
                    secureTextEntry={!showPassword}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    error={errors.password?.message}
                    editable={!busy}
                    rightSlot={
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                        hitSlop={8}
                        disabled={busy}
                        onPress={() => setShowPassword((v) => !v)}
                        className="ml-1 p-1"
                      >
                        {showPassword ? (
                          <EyeOff color="#5A7BA3" size={20} />
                        ) : (
                          <Eye color="#5A7BA3" size={20} />
                        )}
                      </Pressable>
                    }
                  />
                  {!errors.password?.message ? (
                    <Text
                      className="mt-1.5 text-[12px] text-slate-400"
                      style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
                    >
                      At least 8 characters
                    </Text>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value, ref } }) => (
                <AuthTextField
                  ref={ref}
                  label="Confirm Password"
                  placeholder="••••••••"
                  textContentType="newPassword"
                  autoComplete="new-password"
                  secureTextEntry={!showConfirmPassword}
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.confirmPassword?.message}
                  editable={!busy}
                  rightSlot={
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        showConfirmPassword
                          ? 'Hide confirm password'
                          : 'Show confirm password'
                      }
                      hitSlop={8}
                      disabled={busy}
                      onPress={() => setShowConfirmPassword((v) => !v)}
                      className="ml-1 p-1"
                    >
                      {showConfirmPassword ? (
                        <EyeOff color="#5A7BA3" size={20} />
                      ) : (
                        <Eye color="#5A7BA3" size={20} />
                      )}
                    </Pressable>
                  }
                />
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
              label="Create Account"
              loadingLabel="Creating account…"
              loading={busy}
              disabled={busy}
              onPress={onSubmit}
            />
          </View>

          <View className="mt-8 flex-row items-center justify-center pb-2">
            <Text
              className="text-[14px] text-slate-500"
              style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
            >
              Already have an account?{' '}
            </Text>
            <Link href="/sign-in" asChild>
              <Pressable hitSlop={8} disabled={busy}>
                <Text
                  className="text-[14px] font-semibold text-blue"
                  style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                >
                  Sign in
                </Text>
              </Pressable>
            </Link>
          </View>

          {Platform.OS === 'ios' ? (
            <View className="mt-auto items-center pt-6">
              <View className="h-1 w-28 rounded-full bg-slate-300/80" />
            </View>
          ) : (
            <View className="h-4" />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
