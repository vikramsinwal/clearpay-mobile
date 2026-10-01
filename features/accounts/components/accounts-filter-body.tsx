import { Pressable, ScrollView, Text, View } from 'react-native';

import { ACCOUNTS_COPY } from '@/constants/accounts';
import type {
  AccountKind,
  AccountListStatus,
  ChannelFilter,
  ConnectivityStatus,
} from '@/features/accounts/types';

export type AccountFilters = {
  status?: AccountListStatus;
  provider?: string;
  payinStatus?: ChannelFilter;
  payoutStatus?: ChannelFilter;
  connectivity?: ConnectivityStatus;
  verification?: string;
};

type Option<T extends string> = { value: T | undefined; label: string };

function RadioGroup<T extends string>({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: T | undefined;
  options: Option<T>[];
  onChange: (value: T | undefined) => void;
}) {
  return (
    <View className="mb-4">
      <Text
        className="mb-2 text-[12px] text-slate-900 dark:text-white"
        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
      >
        {title}
      </Text>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.label}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            className="min-h-11 flex-row items-center gap-2"
            onPress={() => onChange(option.value)}
          >
            <View
              className={`h-4 w-4 items-center justify-center rounded-full border ${
                selected ? 'border-blue' : 'border-slate-300'
              }`}
            >
              {selected ? <View className="h-2 w-2 rounded-full bg-blue" /> : null}
            </View>
            <Text
              className="text-[13px] text-slate-700 dark:text-navy-100"
              style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type AccountsFilterSheetProps = {
  draft: AccountFilters;
  kind: AccountKind;
  providers: { id: string; label: string }[];
  onChange: (next: AccountFilters) => void;
  onKind: (kind: AccountKind) => void;
  onReset: () => void;
  onApply: () => void;
};

const STATUS_OPTIONS: Option<AccountListStatus>[] = [
  { value: undefined, label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'disconnected', label: 'Disconnected' },
];

const CHANNEL_OPTIONS: Option<ChannelFilter>[] = [
  { value: undefined, label: ACCOUNTS_COPY.any },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const CONNECTIVITY_OPTIONS: Option<ConnectivityStatus>[] = [
  { value: undefined, label: ACCOUNTS_COPY.any },
  { value: 'connected', label: 'Connected' },
  { value: 'disconnected', label: 'Disconnected' },
  { value: 'connecting', label: 'Connecting' },
  { value: 'error', label: 'Error' },
];

const VERIFICATION_OPTIONS: Option<string>[] = [
  { value: undefined, label: ACCOUNTS_COPY.any },
  { value: 'verified', label: 'Verified' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
];

export function AccountsFilterBody({
  draft,
  kind,
  providers,
  onChange,
  onKind,
  onReset,
  onApply,
}: AccountsFilterSheetProps) {
  const providerOptions: Option<string>[] = [
    { value: undefined, label: ACCOUNTS_COPY.any },
    ...providers.map((provider) => ({
      value: provider.id,
      label: provider.label,
    })),
  ];

  return (
    <View>
      <ScrollView className="max-h-[420px]" showsVerticalScrollIndicator={false}>
        <RadioGroup
          options={STATUS_OPTIONS}
          title={ACCOUNTS_COPY.status}
          value={draft.status}
          onChange={(status) => onChange({ ...draft, status })}
        />
        <RadioGroup
          options={providerOptions}
          title={ACCOUNTS_COPY.provider}
          value={draft.provider}
          onChange={(provider) => onChange({ ...draft, provider })}
        />
        <RadioGroup
          options={[
            { value: 'upi_bank' as const, label: ACCOUNTS_COPY.tabUpi },
            { value: 'gateway' as const, label: ACCOUNTS_COPY.tabGateways },
          ]}
          title={ACCOUNTS_COPY.accountType}
          value={kind}
          onChange={(next) => {
            if (next) onKind(next);
          }}
        />
        <RadioGroup
          options={CHANNEL_OPTIONS}
          title={ACCOUNTS_COPY.payinStatus}
          value={draft.payinStatus}
          onChange={(payinStatus) => onChange({ ...draft, payinStatus })}
        />
        <RadioGroup
          options={CHANNEL_OPTIONS}
          title={ACCOUNTS_COPY.payoutStatus}
          value={draft.payoutStatus}
          onChange={(payoutStatus) => onChange({ ...draft, payoutStatus })}
        />
        <RadioGroup
          options={CONNECTIVITY_OPTIONS}
          title={ACCOUNTS_COPY.connectivity}
          value={draft.connectivity}
          onChange={(connectivity) => onChange({ ...draft, connectivity })}
        />
        <RadioGroup
          options={VERIFICATION_OPTIONS}
          title={ACCOUNTS_COPY.verification}
          value={draft.verification}
          onChange={(verification) => onChange({ ...draft, verification })}
        />
      </ScrollView>
      <View className="mt-2 flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          className="min-h-11 flex-1 items-center justify-center rounded-lg border border-slate-200"
          onPress={onReset}
        >
          <Text
            className="text-[13px] text-slate-600"
            style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
          >
            {ACCOUNTS_COPY.reset}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          className="min-h-11 flex-1 items-center justify-center rounded-lg bg-blue"
          onPress={onApply}
        >
          <Text
            className="text-[13px] text-white"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {ACCOUNTS_COPY.apply}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
