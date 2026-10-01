import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RegistrationProgress } from '@/components/auth/registration-progress';
import { ClearpayLogo } from '@/components/brand/clearpay-logo';
import { TelegramIcon } from '@/components/icons/telegram-icon';
import { AuthTextField } from '@/components/ui/auth-text-field';
import { GradientButton } from '@/components/ui/gradient-button';
import { InfoBanner } from '@/components/ui/info-banner';
import { NumberedInstructions } from '@/components/ui/numbered-instructions';
import { OutlineButton } from '@/components/ui/outline-button';
import { useCheckTelegramVerification } from '@/features/auth/hooks/use-check-telegram-verification';
import {
  telegramUsernameSchema,
  type TelegramUsernameFormValues,
} from '@/features/auth/schemas/telegram-username-schema';
import { getTelegramBotUrl } from '@/lib/env';

const INSTRUCTIONS = [
  { title: 'Open the Telegram bot and press Start' },
  { title: 'Come back here and click Check Verification' },
] as const;

/**
 * Create Account — Step 2 / Telegram verification.
 * Light surface tokens only; dark-mode class variants can layer later.
 */
export function TelegramVerificationScreen() {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<TelegramUsernameFormValues>({
    resolver: zodResolver(telegramUsernameSchema),
    defaultValues: {
      telegramUsername: '',
    },
    mode: 'onSubmit',
  });

  const checkMutation = useCheckTelegramVerification({
    onFormError: (message) => {
      setStatusMessage(null);
      setFormError(message);
    },
    onStatusMessage: (message) => {
      setFormError(null);
      setStatusMessage(message);
    },
  });

  const busy = isSubmitting || checkMutation.isPending;

  const onCheckVerification = handleSubmit((values) => {
    if (busy) {
      return;
    }
    setFormError(null);
    setStatusMessage(null);
    setConfigError(null);
    checkMutation.mutate(values.telegramUsername);
  });

  const onOpenTelegramBot = useCallback(async () => {
    setConfigError(null);
    const botUrl = getTelegramBotUrl();
    if (!botUrl) {
      setConfigError(
        'Telegram bot URL is not configured. Set EXPO_PUBLIC_TELEGRAM_BOT_URL in your environment.',
      );
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(botUrl);
      if (!canOpen) {
        setConfigError('Unable to open the Telegram bot URL on this device.');
        return;
      }
      await Linking.openURL(botUrl);
    } catch {
      setConfigError('Unable to open the Telegram bot. Please try again.');
    }
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FC]" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="grow px-6 pb-8 pt-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center pt-2">
            <ClearpayLogo size={80} />
          </View>

          <Text
            accessibilityRole="header"
            className="mt-6 text-center text-[24px] font-bold text-navy"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            Create account
          </Text>
          <Text
            className="mt-2 text-center text-[14px] text-navy-300"
            style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
          >
            Step 2 of 2 · almost done
          </Text>

          <RegistrationProgress activeStep={2} />

          <View className="mt-6">
            <InfoBanner
              title="Check your Telegram"
              message="Open the Telegram bot and press Start, then check verification here."
              variant="info"
            />
          </View>

          <View className="mt-6">
            <Controller
              control={control}
              name="telegramUsername"
              render={({ field: { onChange, onBlur, value, ref } }) => (
                <AuthTextField
                  ref={ref}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!busy}
                  error={errors.telegramUsername?.message}
                  label="Telegram username"
                  leftSlot={
                    <Text
                      className="mr-1 text-[15px] text-navy-300"
                      style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
                    >
                      @
                    </Text>
                  }
                  onBlur={onBlur}
                  onChangeText={(text) => {
                    onChange(text.replace(/^@+/, ''));
                    if (errors.telegramUsername) {
                      clearErrors('telegramUsername');
                    }
                  }}
                  placeholder="username"
                  returnKeyType="done"
                  value={value}
                />
              )}
            />
          </View>

          <View className="mt-8 items-center">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#2AABEE]">
              <TelegramIcon color="#FFFFFF" size={30} />
            </View>
            <Text
              className="mt-4 text-center text-[20px] font-bold text-navy"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              Verify Telegram
            </Text>
            <Text
              className="mt-2 max-w-[300px] text-center text-[14px] leading-5 text-navy-300"
              style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
            >
              Link your Telegram account so Clearpay can confirm payments and
              protect your profile.
            </Text>
          </View>

          <View className="mt-6">
            <NumberedInstructions items={[...INSTRUCTIONS]} variant="card" />
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

          {statusMessage ? (
            <Text
              accessibilityLiveRegion="polite"
              className="mt-4 text-center text-[13px] text-blue-700"
              style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
            >
              {statusMessage}
            </Text>
          ) : null}

          {configError ? (
            <Text
              accessibilityLiveRegion="polite"
              className="mt-4 text-center text-[13px] text-amber-700"
              style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
            >
              {configError}
            </Text>
          ) : null}

          <View className="mt-8 gap-3">
            <GradientButton
              disabled={busy}
              label="Check Verification"
              loading={busy}
              onPress={onCheckVerification}
            />
            <OutlineButton
              disabled={busy}
              label="Open Telegram Bot"
              onPress={onOpenTelegramBot}
            />
          </View>

          {/* Home-indicator breathing room */}
          <View className="h-3" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
