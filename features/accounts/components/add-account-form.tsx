import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ACCOUNTS_COPY } from '@/constants/accounts';
import { accountFormFields } from '@/features/accounts/lib/account-form';
import { useCreateAccountMutation } from '@/features/accounts/hooks/use-accounts';
import { createAccountSchema } from '@/features/accounts/schemas/add-account';
import type { AccountFormField, AccountKind } from '@/features/accounts/types';
import { ApiClientError } from '@/lib/api/errors';
import { showAlert } from '@/lib/ui/alert';

type AddAccountFormProps = {
  kind: AccountKind;
  onKind: (kind: AccountKind) => void;
  onCreated: () => void;
  onCancel: () => void;
};

function FieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: AccountFormField;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = field.options.find((option) => option.value === value);

  if (field.type === 'select') {
    return (
      <View className="mb-2.5 w-[48%]">
        <Text
          className="mb-1 text-[11px] text-slate-700"
          style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
        >
          {field.label}
          {field.required ? <Text className="text-red-500"> *</Text> : null}
        </Text>
        <Pressable
          accessibilityRole="button"
          className="flex-row items-center justify-between rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-2"
          onPress={() => setOpen((current) => !current)}
        >
          <Text
            className={`flex-1 text-[12px] ${selected ? 'text-slate-800' : 'text-slate-400'}`}
            numberOfLines={1}
          >
            {selected?.label ?? field.placeholder ?? 'Select'}
          </Text>
          <ChevronDown color="#94A3B8" size={14} />
        </Pressable>
        {open
          ? field.options.map((option) => (
              <Pressable
                key={option.value}
                className="border-b border-slate-100 px-2 py-2"
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <Text className="text-[12px] text-slate-700">{option.label}</Text>
              </Pressable>
            ))
          : null}
        {error ? <Text className="mt-1 text-[10px] text-red-500">{error}</Text> : null}
      </View>
    );
  }

  return (
    <View className="mb-2.5 w-[48%]">
      <Text
        className="mb-1 text-[11px] text-slate-700"
        numberOfLines={2}
        style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
      >
        {field.label}
        {field.required ? <Text className="text-red-500"> *</Text> : null}
      </Text>
      <TextInput
        autoCapitalize={field.key.toLowerCase().includes('ifsc') ? 'characters' : 'none'}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-800"
        keyboardType={
          field.type === 'tel' ? 'phone-pad' : field.type === 'number' ? 'number-pad' : 'default'
        }
        placeholder={field.placeholder ?? ''}
        placeholderTextColor="#94A3B8"
        secureTextEntry={field.key.toLowerCase().includes('accountnumber')}
        value={value}
        onChangeText={onChange}
      />
      {error ? <Text className="mt-1 text-[10px] text-red-500">{error}</Text> : null}
    </View>
  );
}

export function AddAccountForm({
  kind,
  onKind,
  onCreated,
  onCancel,
}: AddAccountFormProps) {
  const createAccount = useCreateAccountMutation();
  const fields = useMemo(() => accountFormFields(kind), [kind]);
  const schema = useMemo(() => createAccountSchema(kind), [kind]);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Record<string, string>>({
    resolver: zodResolver(schema) as unknown as Resolver<Record<string, string>>,
    defaultValues: {},
  });

  useEffect(() => {
    const defaults: Record<string, string> = {};
    for (const field of fields) defaults[field.key] = '';
    reset(defaults);
  }, [fields, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createAccount.mutateAsync({ kind, fields: values });
      showAlert(ACCOUNTS_COPY.added);
      onCreated();
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : ACCOUNTS_COPY.addFailed;
      showAlert(ACCOUNTS_COPY.addFailed, message);
    }
  });

  const basic = fields.filter((field) => field.section === 'basic');
  const additional = fields.filter((field) => field.section === 'additional');

  return (
    <View>
      <View className="mb-3 flex-row rounded-lg bg-slate-100 p-0.5">
        {(['upi_bank', 'gateway'] as const).map((option) => {
          const selected = kind === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`flex-1 items-center rounded-md px-2 py-2 ${selected ? 'bg-white' : ''}`}
              onPress={() => onKind(option)}
            >
              <Text
                className={`text-xs ${selected ? 'text-blue' : 'text-slate-500'}`}
                style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
              >
                {option === 'upi_bank' ? ACCOUNTS_COPY.tabUpi : ACCOUNTS_COPY.tabGateways}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView className="max-h-[460px]" keyboardShouldPersistTaps="handled">
        <Section fields={basic} title={ACCOUNTS_COPY.basic} control={control} errors={errors} />
        {additional.length > 0 ? (
          <Section
            fields={additional}
            title={ACCOUNTS_COPY.additional}
            control={control}
            errors={errors}
          />
        ) : null}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        className="mt-3 min-h-11 items-center justify-center rounded-lg bg-blue"
        disabled={createAccount.isPending || fields.length === 0}
        onPress={() => void onSubmit()}
        style={{ opacity: fields.length === 0 ? 0.5 : 1 }}
      >
        {createAccount.isPending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-[13px] text-white" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
            {ACCOUNTS_COPY.submit}
          </Text>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        className="mt-2 min-h-11 items-center justify-center rounded-lg border border-slate-200"
        onPress={onCancel}
      >
        <Text className="text-[13px] text-slate-600" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>
          {ACCOUNTS_COPY.cancel}
        </Text>
      </Pressable>
    </View>
  );
}

function Section({
  title,
  fields,
  control,
  errors,
}: {
  title: string;
  fields: AccountFormField[];
  control: ReturnType<typeof useForm<Record<string, string>>>['control'];
  errors: Partial<Record<string, { message?: string }>>;
}) {
  return (
    <View className="mb-3">
      <Text
        className="mb-2 text-[12px] text-slate-900"
        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
      >
        {title}
      </Text>
      <View className="flex-row flex-wrap justify-between">
        {fields.map((field) => (
          <Controller
            key={field.key}
            control={control}
            name={field.key}
            render={({ field: input }) => (
              <FieldInput
                error={errors[field.key]?.message}
                field={field}
                value={input.value ?? ''}
                onChange={input.onChange}
              />
            )}
          />
        ))}
      </View>
    </View>
  );
}
