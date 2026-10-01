import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AuthTextField } from '@/components/ui/auth-text-field';
import { ACCOUNT_SETTINGS_COPY, PROFILE_COPY } from '@/constants/profile';
import { upiIdSchema } from '@/features/profile/schemas/profile-schema';

import { SettingsCard, SettingsHeading } from './settings-card';

export function PaymentReceivingCard({
  upiId,
  phone,
  saving,
  onSave,
}: {
  upiId: string;
  phone: string;
  saving: boolean;
  onSave: (upiId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(upiId);
  const [error, setError] = useState<string | undefined>();

  const save = async () => {
    const parsed = upiIdSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Use a valid UPI ID');
      return;
    }
    setError(undefined);
    await onSave(parsed.data);
    setEditing(false);
  };

  return (
    <SettingsCard>
      <SettingsHeading
        title={ACCOUNT_SETTINGS_COPY.paymentReceiving}
        trailing={
          editing ? (
            <View className="flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => {
                  setDraft(upiId);
                  setError(undefined);
                  setEditing(false);
                }}
              >
                <Text
                  className="text-[13px] text-slate-500"
                  style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                >
                  {ACCOUNT_SETTINGS_COPY.cancel}
                </Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()}>
                <Text
                  className="text-[13px] text-blue"
                  style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                >
                  {ACCOUNT_SETTINGS_COPY.save}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setDraft(upiId);
                setError(undefined);
                setEditing(true);
              }}
            >
              <Text
                className="text-[13px] text-blue"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                {ACCOUNT_SETTINGS_COPY.edit}
              </Text>
            </Pressable>
          )
        }
      />

      {editing ? (
        <AuthTextField
          autoCapitalize="none"
          autoCorrect={false}
          error={error}
          label={PROFILE_COPY.upiLabel}
          onChangeText={setDraft}
          placeholder={PROFILE_COPY.upiPlaceholder}
          value={draft}
        />
      ) : (
        <View>
          <Text
            className="text-[12px] text-slate-500"
            style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
          >
            {PROFILE_COPY.upiLabel}
          </Text>
          <Text
            className="mt-1 text-[14px] text-slate-900"
            style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
          >
            {upiId || '—'}
          </Text>
        </View>
      )}
      <Text
        className="mt-2 text-[12px] text-slate-400"
        style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
      >
        {ACCOUNT_SETTINGS_COPY.upiUsedFor}. {PROFILE_COPY.upiHelper}
      </Text>
      {phone ? (
        <Text
          className="mt-2 text-[12px] leading-5 text-slate-500"
          style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
        >
          Incoming payments can also be matched to your mobile number {phone}. This number stays on your account and is not shown to other customers.
        </Text>
      ) : null}
    </SettingsCard>
  );
}
