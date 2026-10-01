import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { DISPUTE_REASON_LABEL, PAYIN_COPY } from '@/constants/payin';
import { GradientButton } from '@/components/ui/gradient-button';
import { PayinSheet } from '@/features/payin/components/payin-sheet';
import type { DisputeReason } from '@/features/payin/types';
import { DISPUTE_REASONS } from '@/features/payin/types';

type DisputeSheetProps = {
  visible: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (input: { reason: DisputeReason; description?: string }) => void;
};

export function DisputeSheet({ visible, submitting, onClose, onSubmit }: DisputeSheetProps) {
  const [reason, setReason] = useState<DisputeReason | null>(null);
  const [description, setDescription] = useState('');

  return (
    <PayinSheet
      subtitle={PAYIN_COPY.disputeSubtitle}
      title={PAYIN_COPY.disputeTitle}
      visible={visible}
      onClose={onClose}
    >
      {DISPUTE_REASONS.filter((item) => item !== 'OTHER').map((item) => (
        <Pressable
          key={item}
          accessibilityRole="button"
          className="mb-2 flex-row items-center justify-between rounded-lg bg-[#e8eeff] px-3 py-3"
          disabled={submitting}
          onPress={() => onSubmit({ reason: item })}
        >
          <Text
            className="flex-1 pr-2 text-[14px] text-[#0d1c32]"
            style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
          >
            {DISPUTE_REASON_LABEL[item]}
          </Text>
          <ChevronRight color="#414754" size={18} />
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        className={`mb-2 rounded-lg px-3 py-3 ${
          reason === 'OTHER' ? 'bg-[#dfe8ff]' : 'bg-[#e8eeff]'
        }`}
        onPress={() => setReason('OTHER')}
      >
        <Text
          className="text-[14px] text-[#0d1c32]"
          style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
        >
          {DISPUTE_REASON_LABEL.OTHER}
        </Text>
      </Pressable>
      {reason === 'OTHER' ? (
        <TextInput
          className="mb-3 min-h-[88px] rounded-lg border border-[#c1c6d6] bg-white px-3 py-2 text-[14px] text-[#0d1c32]"
          maxLength={500}
          multiline
          placeholder={PAYIN_COPY.disputeOther}
          value={description}
          onChangeText={setDescription}
        />
      ) : null}
      {reason === 'OTHER' ? (
        <View className="mb-2">
          <GradientButton
            disabled={submitting}
            label={PAYIN_COPY.disputeSubmit}
            loading={submitting}
            onPress={() =>
              onSubmit({
                reason: 'OTHER',
                ...(description.trim() ? { description: description.trim() } : {}),
              })
            }
          />
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        className="h-11 items-center justify-center rounded-lg bg-[#dfe8ff]"
        onPress={onClose}
      >
        <Text
          className="text-[14px] text-[#0d1c32]"
          style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
        >
          {PAYIN_COPY.disputeCancel}
        </Text>
      </Pressable>
    </PayinSheet>
  );
}

export function SmsConsentSheet({
  visible,
  onEnable,
  onDecline,
}: {
  visible: boolean;
  onEnable: () => void;
  onDecline: () => void;
}) {
  return (
    <PayinSheet title={PAYIN_COPY.smsTitle} visible={visible} onClose={onDecline}>
      <Text
        className="mb-2 text-[14px] leading-5 text-slate-600"
        style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
      >
        {PAYIN_COPY.smsBody}
      </Text>
      <Text className="mb-4 text-[13px] text-slate-500">{PAYIN_COPY.smsContinue}</Text>
      <GradientButton label={PAYIN_COPY.smsEnable} onPress={onEnable} />
      <Pressable accessibilityRole="button" className="mt-3 items-center py-3" onPress={onDecline}>
        <Text
          className="text-[15px] text-slate-600"
          style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
        >
          {PAYIN_COPY.smsNotNow}
        </Text>
      </Pressable>
    </PayinSheet>
  );
}
