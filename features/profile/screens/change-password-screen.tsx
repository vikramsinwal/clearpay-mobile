import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { TopHeader } from '@/components/brand/top-header';
import { AuthTextField } from '@/components/ui/auth-text-field';
import { GradientButton } from '@/components/ui/gradient-button';
import { ACCOUNT_SETTINGS_COPY } from '@/constants/profile';
import {
  useChangePasswordMutation,
  useEndLocalSession,
} from '@/features/profile/hooks/use-account-settings';
import { changePasswordSchema } from '@/features/profile/schemas/account-settings';
import { ApiClientError } from '@/lib/api/errors';
import { showAlert } from '@/lib/ui/alert';

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordScreen() {
  const router = useRouter();
  const mutation = useChangePasswordMutation();
  const endLocalSession = useEndLocalSession();
  const { control, handleSubmit, setError } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await mutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      showAlert(
        'Password updated',
        result.message ?? 'Password updated. Sign in again.',
      );
      if (result.sessionsRevoked) {
        await endLocalSession();
        return;
      }
      router.back();
    } catch (error) {
      if (error instanceof ApiClientError && error.fieldErrors.currentPassword) {
        setError('currentPassword', { message: error.fieldErrors.currentPassword });
        return;
      }
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Unable to change your password. Please try again.';
      showAlert('Update failed', message);
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FB]" edges={['top']}>
      <TopHeader showBack title={ACCOUNT_SETTINGS_COPY.changePassword} />
      <View className="gap-3 px-4 pt-5">
        <Controller
          control={control}
          name="currentPassword"
          render={({ field: { onChange, onBlur, value }, fieldState }) => (
            <AuthTextField
              autoCapitalize="none"
              error={fieldState.error?.message}
              isPassword
              label="Current Password"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="newPassword"
          render={({ field: { onChange, onBlur, value }, fieldState }) => (
            <AuthTextField
              autoCapitalize="none"
              error={fieldState.error?.message}
              isPassword
              label="New Password"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value }, fieldState }) => (
            <AuthTextField
              autoCapitalize="none"
              error={fieldState.error?.message}
              isPassword
              label="Confirm Password"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        <GradientButton
          label={ACCOUNT_SETTINGS_COPY.save}
          loading={mutation.isPending}
          onPress={() => void onSubmit()}
        />
      </View>
    </SafeAreaView>
  );
}
