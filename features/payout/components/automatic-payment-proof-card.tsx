import { useState } from 'react';
import { Modal, Platform, Pressable, Switch, Text, View } from 'react-native';

import { PAYOUT_COPY } from '@/constants/payout';
import { SMS_CONSENT_STATEMENT, SMS_CONSENT_VERSION } from '@/features/payout/sms/consent-store';
import { PayoutSmsModule } from '@/features/payout/sms/payout-sms-module';
import { SettingsCard, SettingsHeading } from '@/features/profile/components/settings-card';
import {
  useAutomaticPaymentProofMutation,
  useAutomaticPaymentProofQuery,
} from '@/features/payout/hooks/use-payout-orders';
import { showAlert } from '@/lib/ui/alert';
import { ApiClientError } from '@/lib/api/errors';

export function AutomaticPaymentProofCard() {
  const query = useAutomaticPaymentProofQuery();
  const mutation = useAutomaticPaymentProofMutation();
  const enabled = query.data?.enabled === true;
  const [consentOpen, setConsentOpen] = useState(false);
  const [manualNote, setManualNote] = useState<string | null>(
    Platform.OS === 'ios' ? PAYOUT_COPY.smsUnsupported : null,
  );

  async function enableAfterConsent() {
    setConsentOpen(false);
    const permission = await PayoutSmsModule.requestPermissionIfSupported();
    if (permission !== 'PERMISSION_GRANTED') {
      const note =
        permission === 'PERMISSION_DENIED' ? PAYOUT_COPY.smsPermissionDenied : PAYOUT_COPY.smsManual;
      setManualNote(note);
      return;
    }
    mutation.mutate(
      { enabled: true, consentVersion: SMS_CONSENT_VERSION },
      {
        onSuccess: () => setManualNote(null),
        onError: (error) => {
          showAlert(
            PAYOUT_COPY.autoProofTitle,
            error instanceof ApiClientError ? error.message : PAYOUT_COPY.retry,
          );
        },
      },
    );
  }

  return (
    <SettingsCard>
      <SettingsHeading
        title={PAYOUT_COPY.autoProofTitle}
        trailing={
          <Text className="text-[12px] text-slate-500" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
            {enabled ? PAYOUT_COPY.autoProofOn : PAYOUT_COPY.autoProofOff}
          </Text>
        }
      />
      <Text className="text-[13px] leading-5 text-slate-600">{PAYOUT_COPY.autoProofBody}</Text>
      {manualNote ? <Text className="mt-2 text-[12px] text-slate-500">{manualNote}</Text> : null}
      {query.isError ? (
        <Pressable className="mt-3" onPress={() => void query.refetch()}>
          <Text className="text-blue">{PAYOUT_COPY.retry}</Text>
        </Pressable>
      ) : (
        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-[14px] text-slate-800">{PAYOUT_COPY.autoProofTitle}</Text>
          <Switch
            disabled={query.isPending || mutation.isPending || Platform.OS === 'ios'}
            value={enabled}
            onValueChange={(next) => {
              if (!next) {
                mutation.mutate(
                  { enabled: false },
                  {
                    onError: (error) => {
                      showAlert(
                        PAYOUT_COPY.autoProofTitle,
                        error instanceof ApiClientError ? error.message : PAYOUT_COPY.retry,
                      );
                    },
                  },
                );
                return;
              }
              setConsentOpen(true);
            }}
          />
        </View>
      )}
      <Modal animationType="fade" transparent visible={consentOpen} onRequestClose={() => setConsentOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full rounded-2xl bg-white p-5">
            <Text
              className="text-[16px] text-slate-900"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {PAYOUT_COPY.autoProofTitle}
            </Text>
            <Text className="mt-3 text-[14px] leading-5 text-slate-700">{SMS_CONSENT_STATEMENT}</Text>
            <Pressable
              accessibilityRole="button"
              className="mt-5 items-center rounded-xl bg-navy py-3"
              onPress={() => void enableAfterConsent()}
            >
              <Text className="text-[15px] text-white" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
                {PAYOUT_COPY.autoProofAcknowledge}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="mt-2 items-center py-3"
              onPress={() => setConsentOpen(false)}
            >
              <Text className="text-[15px] text-slate-600" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                {PAYOUT_COPY.autoProofNotNow}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SettingsCard>
  );
}
