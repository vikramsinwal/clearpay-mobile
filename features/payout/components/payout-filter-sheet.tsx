import { useState, type ReactNode } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  PAYOUT_COPY,
  PAYOUT_METHOD_LABEL,
  PAYOUT_SUMMARY_LABEL,
} from '@/constants/payout';
import { parseAmountInput } from '@/features/payout/lib/presentation';
import { PAYOUT_PAYMENT_METHODS, PAYOUT_SUMMARY_STATUSES } from '@/features/payout/types';
import type { PayoutListFilters } from '@/features/payout/types';

type PayoutFilterSheetProps = {
  visible: boolean;
  value: PayoutListFilters;
  onClose: () => void;
  onApply: (filters: PayoutListFilters) => void;
};

export function PayoutFilterSheet({ visible, value, onClose, onApply }: PayoutFilterSheetProps) {
  if (!visible) return null;
  return <PayoutFilterSheetBody value={value} onApply={onApply} onClose={onClose} />;
}

function PayoutFilterSheetBody({
  value,
  onClose,
  onApply,
}: Omit<PayoutFilterSheetProps, 'visible'>) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  const [minText, setMinText] = useState(value.minAmount != null ? String(value.minAmount) : '');
  const [maxText, setMaxText] = useState(value.maxAmount != null ? String(value.maxAmount) : '');

  function apply() {
    const dateFrom = /^\d{4}-\d{2}-\d{2}$/.test(draft.dateFrom ?? '') ? draft.dateFrom : undefined;
    const dateTo = /^\d{4}-\d{2}-\d{2}$/.test(draft.dateTo ?? '') ? draft.dateTo : undefined;
    onApply({
      status: draft.status,
      search: draft.search?.trim() || undefined,
      paymentMethod: draft.paymentMethod,
      dateFrom,
      dateTo,
      minAmount: parseAmountInput(minText),
      maxAmount: parseAmountInput(maxText),
    });
    onClose();
  }

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-slate-900/40">
        <Pressable accessibilityLabel="Close filters" className="flex-1" onPress={onClose} />
        <View
          className="max-h-[90%] rounded-t-3xl bg-white px-4 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <Text
            className="text-[18px] text-slate-900"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {PAYOUT_COPY.filters}
          </Text>

          <Section title={PAYOUT_COPY.status}>
            <ChoiceRow
              options={PAYOUT_SUMMARY_STATUSES.map((status) => ({
                id: status,
                label: PAYOUT_SUMMARY_LABEL[status],
              }))}
              value={draft.status}
              onChange={(status) => setDraft({ ...draft, status })}
            />
          </Section>
          <Section title="Search">
            <Field
              label="Order or beneficiary"
              value={draft.search ?? ''}
              onChangeText={(search) => setDraft({ ...draft, search: search || undefined })}
            />
          </Section>
          <Section title={PAYOUT_COPY.date}>
            <View className="flex-row gap-2">
              <Field
                label={PAYOUT_COPY.from}
                placeholder="YYYY-MM-DD"
                value={draft.dateFrom ?? ''}
                onChangeText={(dateFrom) => setDraft({ ...draft, dateFrom: dateFrom || undefined })}
              />
              <Field
                label={PAYOUT_COPY.to}
                placeholder="YYYY-MM-DD"
                value={draft.dateTo ?? ''}
                onChangeText={(dateTo) => setDraft({ ...draft, dateTo: dateTo || undefined })}
              />
            </View>
          </Section>
          <Section title={PAYOUT_COPY.amount}>
            <View className="flex-row gap-2">
              <Field
                label={PAYOUT_COPY.minAmount}
                keyboardType="number-pad"
                value={minText}
                onChangeText={setMinText}
              />
              <Field
                label={PAYOUT_COPY.maxAmount}
                keyboardType="number-pad"
                value={maxText}
                onChangeText={setMaxText}
              />
            </View>
          </Section>
          <Section title={PAYOUT_COPY.paymentMethod}>
            <ChoiceRow
              options={PAYOUT_PAYMENT_METHODS.map((method) => ({
                id: method,
                label: PAYOUT_METHOD_LABEL[method],
              }))}
              value={draft.paymentMethod}
              onChange={(paymentMethod) => setDraft({ ...draft, paymentMethod })}
            />
          </Section>

          <View className="mt-4 flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              className="h-12 flex-1 items-center justify-center rounded-xl bg-slate-100"
              onPress={() => {
                onApply({});
                onClose();
              }}
            >
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{PAYOUT_COPY.clearFilters}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="h-12 flex-1 items-center justify-center rounded-xl bg-blue"
              onPress={apply}
            >
              <Text className="text-white" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
                {PAYOUT_COPY.applyFilters}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-4">
      <Text
        className="mb-2 text-[13px] text-slate-500"
        style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value?: T;
  onChange: (value: T | undefined) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const active = value === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            className={`rounded-full px-3 py-1.5 ${active ? 'bg-navy' : 'bg-slate-100'}`}
            onPress={() => onChange(active ? undefined : option.id)}
          >
            <Text
              className={`text-[12px] ${active ? 'text-white' : 'text-slate-700'}`}
              style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View className="flex-1">
      <Text className="mb-1 text-[11px] text-slate-400">{label}</Text>
      <TextInput
        className="h-11 rounded-xl bg-slate-100 px-3 text-slate-900"
        keyboardType={keyboardType}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}
