import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, ShieldAlert } from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';
import { z } from 'zod';

import { TelegramIcon } from '@/components/icons/telegram-icon';
import { AuthTextField } from '@/components/ui/auth-text-field';
import { GradientButton } from '@/components/ui/gradient-button';
import { OutlineButton } from '@/components/ui/outline-button';
import { ACCOUNT_SETTINGS_COPY, PROFILE_COPY } from '@/constants/profile';
import { telegramUsernameSchema } from '@/features/auth/schemas/telegram-username-schema';
import { formatPhoneDisplay } from '@/features/profile/lib/format-account';
import {
  accountMobileSchema,
  accountNameSchema,
} from '@/features/profile/schemas/account-settings';
import type {
  CustomerAccountProfile,
  CustomerTelegram,
} from '@/features/profile/types/account';

import { CardError, CardSkeleton, SettingsCard, SettingsHeading } from './settings-card';

const nameFormSchema = z.object({ name: accountNameSchema });
const mobileFormSchema = z.object({ mobile: accountMobileSchema });

function FieldRow({
  label,
  value,
  actionLabel,
  onAction,
  verified,
}: {
  label: string;
  value: string;
  actionLabel?: string;
  onAction?: () => void;
  verified?: boolean | null;
}) {
  return (
    <View className="mb-3">
      <Text
        className="mb-1.5 text-[12px] text-slate-500"
        style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
      >
        {label}
      </Text>
      <View className="min-h-[48px] flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
        <Text
          className="flex-1 text-[14px] text-slate-900"
          numberOfLines={1}
          style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
        >
          {value || '—'}
        </Text>
        {actionLabel && onAction ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onAction}>
            <Text
              className="text-[13px] text-blue"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {verified == null ? null : (
        <View className="mt-1.5 flex-row items-center gap-1">
          {verified ? (
            <CheckCircle2 color="#0D9488" size={13} />
          ) : (
            <ShieldAlert color="#D97706" size={13} />
          )}
          <Text
            className={`text-[11px] ${verified ? 'text-teal' : 'text-amber-700'}`}
            style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
          >
            {verified ? PROFILE_COPY.phoneVerified : PROFILE_COPY.phoneUnverified}
          </Text>
        </View>
      )}
    </View>
  );
}

function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-slate-950/40" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-white px-4 pb-8 pt-3" onPress={() => undefined}>
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full bg-slate-300" />
          </View>
          <Text
            className="mb-4 text-[16px] text-slate-900"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {title}
          </Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function ProfileInformationCard({
  profile,
  telegram,
  loading,
  error,
  telegramError,
  saving,
  onRetry,
  onRetryTelegram,
  onSaveName,
  onSaveMobile,
  onConnectTelegram,
  onDisconnectTelegram,
  onOpenTelegramBot,
}: {
  profile?: CustomerAccountProfile;
  telegram?: CustomerTelegram;
  loading: boolean;
  error: boolean;
  telegramError: boolean;
  saving: boolean;
  onRetry: () => void;
  onRetryTelegram: () => void;
  onSaveName: (name: string) => Promise<void>;
  onSaveMobile: (mobile: string) => Promise<void>;
  onConnectTelegram: (username: string) => Promise<void>;
  onDisconnectTelegram: () => Promise<void>;
  onOpenTelegramBot: () => void;
}) {
  const [nameOpen, setNameOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [telegramOpen, setTelegramOpen] = useState(false);

  const nameForm = useForm({
    resolver: zodResolver(nameFormSchema),
    defaultValues: { name: profile?.name ?? '' },
  });
  const mobileForm = useForm({
    resolver: zodResolver(mobileFormSchema),
    defaultValues: { mobile: profile?.mobile ?? '' },
  });
  const telegramForm = useForm({
    resolver: zodResolver(telegramUsernameSchema),
    defaultValues: { telegramUsername: telegram?.username ?? '' },
  });

  if (loading && !profile) return <CardSkeleton lines={4} />;
  if (error && !profile) return <CardError onRetry={onRetry} />;
  if (!profile) return null;

  const connected = Boolean(telegram?.connected && telegram.username);

  return (
    <SettingsCard>
      <SettingsHeading title={ACCOUNT_SETTINGS_COPY.profileInformation} />
      <FieldRow
        actionLabel={ACCOUNT_SETTINGS_COPY.edit}
        label={PROFILE_COPY.nameLabel}
        value={profile.name}
        onAction={() => {
          nameForm.reset({ name: profile.name });
          setNameOpen(true);
        }}
      />
      <FieldRow label={PROFILE_COPY.emailLabel} value={profile.email} />
      <FieldRow
        actionLabel={ACCOUNT_SETTINGS_COPY.change}
        label={PROFILE_COPY.mobileLabel}
        value={formatPhoneDisplay(profile.mobile)}
        verified={profile.mobile ? profile.mobileVerified : null}
        onAction={() => {
          mobileForm.reset({ mobile: profile.mobile ?? '' });
          setPhoneOpen(true);
        }}
      />

      {telegramError && !telegram ? (
        <Pressable accessibilityRole="button" onPress={onRetryTelegram}>
          <Text
            className="mb-2 text-[13px] text-blue"
            style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
          >
            {ACCOUNT_SETTINGS_COPY.cardError} {ACCOUNT_SETTINGS_COPY.retry}
          </Text>
        </Pressable>
      ) : (
        <>
          <FieldRow
            actionLabel={ACCOUNT_SETTINGS_COPY.change}
            label="Telegram Username"
            value={connected && telegram?.username ? `@${telegram.username}` : PROFILE_COPY.telegramNotConnected}
            onAction={() => {
              telegramForm.reset({ telegramUsername: telegram?.username ?? '' });
              setTelegramOpen(true);
            }}
          />
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <TelegramIcon color="#1B6CA8" size={16} />
              <Text
                className={`text-[12px] ${connected ? 'text-teal' : 'text-slate-500'}`}
                style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
              >
                {connected ? PROFILE_COPY.telegramConnected : PROFILE_COPY.connectTelegram}
              </Text>
            </View>
            {connected ? (
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => void onDisconnectTelegram()}
              >
                <Text
                  className="text-[13px] text-red-600"
                  style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                >
                  {PROFILE_COPY.disconnectTelegram}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </>
      )}

      <Sheet title={PROFILE_COPY.nameLabel} visible={nameOpen} onClose={() => setNameOpen(false)}>
        <Controller
          control={nameForm.control}
          name="name"
          render={({ field: { onChange, onBlur, value }, fieldState }) => (
            <AuthTextField
              autoCapitalize="words"
              error={fieldState.error?.message}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        <View className="mt-4">
          <GradientButton
            label={ACCOUNT_SETTINGS_COPY.save}
            loading={saving}
            onPress={() =>
              void nameForm.handleSubmit(async (values) => {
                await onSaveName(values.name);
                setNameOpen(false);
              })()
            }
          />
        </View>
      </Sheet>

      <Sheet title={PROFILE_COPY.mobileLabel} visible={phoneOpen} onClose={() => setPhoneOpen(false)}>
        <Controller
          control={mobileForm.control}
          name="mobile"
          render={({ field: { onChange, onBlur, value }, fieldState }) => (
            <AuthTextField
              error={fieldState.error?.message}
              keyboardType="phone-pad"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="+919876543210"
              value={value}
            />
          )}
        />
        <Text
          className="mt-2 text-[12px] text-slate-400"
          style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
        >
          Changing this number clears mobile verification until it is confirmed again.
        </Text>
        <View className="mt-4">
          <GradientButton
            label={ACCOUNT_SETTINGS_COPY.save}
            loading={saving}
            onPress={() =>
              void mobileForm.handleSubmit(async (values) => {
                await onSaveMobile(values.mobile);
                setPhoneOpen(false);
              })()
            }
          />
        </View>
      </Sheet>

      <Sheet
        title={PROFILE_COPY.telegramLabel}
        visible={telegramOpen}
        onClose={() => setTelegramOpen(false)}
      >
        <Controller
          control={telegramForm.control}
          name="telegramUsername"
          render={({ field: { onChange, onBlur, value }, fieldState }) => (
            <AuthTextField
              autoCapitalize="none"
              autoCorrect={false}
              error={fieldState.error?.message}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder={PROFILE_COPY.telegramUsernamePlaceholder}
              value={value}
            />
          )}
        />
        <Text
          className="mt-2 text-[12px] leading-5 text-slate-400"
          style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
        >
          {PROFILE_COPY.telegramHelper}
        </Text>
        <View className="mt-4 gap-3">
          <OutlineButton label={PROFILE_COPY.openTelegramBot} onPress={onOpenTelegramBot} />
          <GradientButton
            label={PROFILE_COPY.connectTelegram}
            loading={saving}
            onPress={() =>
              void telegramForm.handleSubmit(async (values) => {
                await onConnectTelegram(values.telegramUsername);
                setTelegramOpen(false);
              })()
            }
          />
        </View>
      </Sheet>
    </SettingsCard>
  );
}
