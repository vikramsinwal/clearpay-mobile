import { Modal, Text, View } from 'react-native';

import { PAYIN_COPY } from '@/constants/payin';
import { GradientButton } from '@/components/ui/gradient-button';
import { OutlineButton } from '@/components/ui/outline-button';

type ReleaseConfirmModalProps = {
  visible: boolean;
  amount: string;
  customer: string;
  utr: string;
  verification: string;
  collateral: string;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ReleaseConfirmModal({
  visible,
  amount,
  customer,
  utr,
  verification,
  collateral,
  submitting,
  onCancel,
  onConfirm,
}: ReleaseConfirmModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-slate-900/50 px-5">
        <View className="w-full rounded-2xl bg-white px-4 py-4">
          <Text
            className="text-[18px] text-slate-900"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {PAYIN_COPY.confirmTitle}
          </Text>
          <Row label={PAYIN_COPY.amount} value={amount} />
          <Row label={PAYIN_COPY.customer} value={customer} />
          <Row label={PAYIN_COPY.utr} value={utr} />
          <Row label={PAYIN_COPY.verification} value={verification} />
          <Row label={PAYIN_COPY.collateral} value={collateral} />
          <Text className="mb-4 mt-3 text-[13px] leading-5 text-slate-600">
            {PAYIN_COPY.confirmBody}
          </Text>
          <View className="gap-2">
            <GradientButton
              label={PAYIN_COPY.confirmRelease}
              loading={submitting}
              loadingLabel={PAYIN_COPY.releasing}
              onPress={onConfirm}
            />
            <OutlineButton disabled={submitting} label={PAYIN_COPY.cancel} onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="mt-3 flex-row items-start justify-between gap-3">
      <Text className="text-[13px] text-slate-500">{label}</Text>
      <Text
        className="flex-1 text-right text-[14px] text-slate-900"
        style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
      >
        {value}
      </Text>
    </View>
  );
}
