import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PAYOUT_COPY, PAYOUT_HELP_LABEL } from '@/constants/payout';
import type { PayoutHelpReason } from '@/features/payout/types';
import { PAYOUT_HELP_REASONS } from '@/features/payout/types';

type PayoutHelpSheetProps = {
  visible: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (input: { reason: PayoutHelpReason; description?: string }) => void;
};

export function PayoutHelpSheet({ visible, submitting, onClose, onSubmit }: PayoutHelpSheetProps) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<PayoutHelpReason | null>(null);
  const [description, setDescription] = useState('');

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-slate-900/40">
        <Pressable accessibilityLabel="Close help" className="flex-1" onPress={onClose} />
        <View
          className="rounded-t-3xl bg-white px-4 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <Text
            className="text-[18px] text-slate-900"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {PAYOUT_COPY.helpTitle}
          </Text>
          <View className="mt-3 gap-2">
            {PAYOUT_HELP_REASONS.map((item) => {
              const active = reason === item;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  className={`rounded-xl px-3 py-3 ${active ? 'bg-blue-50' : 'bg-slate-50'}`}
                  onPress={() => setReason(item)}
                >
                  <Text
                    className="text-[14px] text-slate-900"
                    style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                  >
                    {PAYOUT_HELP_LABEL[item]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {reason === 'OTHER' ? (
            <TextInput
              className="mt-3 min-h-20 rounded-xl bg-slate-100 px-3 py-2 text-slate-900"
              multiline
              placeholder={PAYOUT_COPY.helpDescribe}
              value={description}
              onChangeText={setDescription}
            />
          ) : null}
          <Pressable
            accessibilityRole="button"
            className="mt-4 h-12 items-center justify-center rounded-xl bg-navy"
            disabled={!reason || submitting}
            onPress={() => {
              if (!reason) return;
              onSubmit({ reason, description: description.trim() || undefined });
            }}
          >
            <Text className="text-white" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
              {PAYOUT_COPY.helpSubmit}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
