import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus } from 'lucide-react-native';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

import { AuthTextField } from '@/components/ui/auth-text-field';
import { GradientButton } from '@/components/ui/gradient-button';
import { ACCOUNT_SETTINGS_COPY } from '@/constants/profile';
import { employeeDraftSchema } from '@/features/profile/schemas/account-settings';
import type {
  AccountEmployee,
  EmployeeDraft,
  EmployeeList,
  EmployeeStatus,
} from '@/features/profile/types/account';

import { CardError, CardSkeleton, SettingsCard, SettingsHeading } from './settings-card';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
}

const FILTERS: { key: '' | EmployeeStatus; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'INACTIVE', label: 'Inactive' },
];

export function EmployeesCard({
  list,
  loading,
  error,
  saving,
  search,
  status,
  onSearch,
  onStatus,
  onPage,
  onRetry,
  onCreate,
  onUpdate,
  onToggleStatus,
}: {
  list?: EmployeeList;
  loading: boolean;
  error: boolean;
  saving: boolean;
  search: string;
  status?: EmployeeStatus;
  onSearch: (search: string) => void;
  onStatus: (status?: EmployeeStatus) => void;
  onPage: (page: number) => void;
  onRetry: () => void;
  onCreate: (draft: EmployeeDraft) => Promise<void>;
  onUpdate: (id: string, draft: EmployeeDraft) => Promise<void>;
  onToggleStatus: (employee: AccountEmployee) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AccountEmployee | null>(null);
  const [searchDraft, setSearchDraft] = useState(search);
  const form = useForm({
    resolver: zodResolver(employeeDraftSchema),
    defaultValues: { name: '', email: '', mobile: '', role: '' },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: '', email: '', mobile: '', role: '' });
    setOpen(true);
  };

  const openEdit = (employee: AccountEmployee) => {
    setEditing(employee);
    form.reset({
      name: employee.name,
      email: employee.email ?? '',
      mobile: employee.mobile ?? '',
      role: employee.role,
    });
    setOpen(true);
  };

  if (loading && !list) return <CardSkeleton lines={3} />;
  if (error && !list) return <CardError onRetry={onRetry} />;

  return (
    <SettingsCard>
      <SettingsHeading
        title={ACCOUNT_SETTINGS_COPY.myEmployees}
        trailing={
          <Pressable accessibilityRole="button" className="flex-row items-center gap-1" onPress={openCreate}>
            <Plus color="#1B6CA8" size={16} />
            <Text className="text-[13px] text-blue" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
              {ACCOUNT_SETTINGS_COPY.addEmployee}
            </Text>
          </Pressable>
        }
      />

      <TextInput
        className="mb-2 min-h-[40px] rounded-xl border border-slate-200 px-3 text-[13px] text-slate-900"
        placeholder="Search name, email, or mobile"
        placeholderTextColor="#94A3B8"
        returnKeyType="search"
        value={searchDraft}
        onChangeText={setSearchDraft}
        onSubmitEditing={() => onSearch(searchDraft.trim())}
      />
      <View className="mb-3 flex-row gap-2">
        {FILTERS.map((filter) => {
          const selected = (status ?? '') === filter.key;
          return (
            <Pressable
              key={filter.label}
              className={`rounded-full px-3 py-1 ${selected ? 'bg-blue' : 'bg-slate-100'}`}
              onPress={() => onStatus(filter.key || undefined)}
            >
              <Text
                className={`text-[12px] ${selected ? 'text-white' : 'text-slate-600'}`}
                style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {(list?.items.length ?? 0) === 0 ? (
        <Text className="text-[13px] text-slate-500" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>
          {ACCOUNT_SETTINGS_COPY.noEmployees}
        </Text>
      ) : (
        <View className="gap-3">
          {list?.items.map((employee) => (
            <View
              key={employee.id}
              className="flex-row flex-wrap items-center gap-2 rounded-xl border border-slate-100 px-2 py-2"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                <Text className="text-[12px] text-blue" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
                  {initials(employee.name)}
                </Text>
              </View>
              <View className="min-w-[120px] flex-1">
                <Text className="text-[14px] text-slate-900" numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
                  {employee.name}
                </Text>
                <Text className="text-[12px] text-slate-500" numberOfLines={1} style={{ fontFamily: 'PlusJakartaSans_400Regular' }}>
                  {employee.email || employee.mobile || employee.role}
                </Text>
                <Text className="text-[11px] text-slate-400" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>
                  {employee.role}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={`Edit ${employee.name}`}
                accessibilityRole="button"
                className="flex-row items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5"
                onPress={() => openEdit(employee)}
              >
                <Pencil color="#334155" size={13} />
                <Text className="text-[12px] text-slate-700" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                  {ACCOUNT_SETTINGS_COPY.edit}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                className={`rounded-lg px-2 py-1.5 ${employee.status === 'ACTIVE' ? 'bg-emerald-50' : 'bg-slate-100'}`}
                disabled={saving}
                onPress={() => void onToggleStatus(employee)}
              >
                <Text
                  className={`text-[12px] ${employee.status === 'ACTIVE' ? 'text-emerald-700' : 'text-slate-500'}`}
                  style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                >
                  {employee.status === 'ACTIVE' ? ACCOUNT_SETTINGS_COPY.active : ACCOUNT_SETTINGS_COPY.inactive}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {list && list.totalPages > 1 ? (
        <View className="mt-3 flex-row items-center justify-between">
          <Pressable disabled={list.page <= 1} onPress={() => onPage(list.page - 1)}>
            <Text className="text-[13px] text-blue" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
              Previous
            </Text>
          </Pressable>
          <Text className="text-[12px] text-slate-400" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>
            {list.page} / {list.totalPages}
          </Text>
          <Pressable disabled={list.page >= list.totalPages} onPress={() => onPage(list.page + 1)}>
            <Text className="text-[13px] text-blue" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
              Next
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Modal transparent animationType="slide" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-slate-950/40" onPress={() => setOpen(false)}>
          <Pressable className="rounded-t-3xl bg-white px-4 pb-8 pt-3" onPress={() => undefined}>
            <Text className="mb-4 text-[16px] text-slate-900" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
              {editing ? ACCOUNT_SETTINGS_COPY.edit : ACCOUNT_SETTINGS_COPY.addEmployee}
            </Text>
            <View className="gap-3">
              <Controller
                control={form.control}
                name="name"
                render={({ field: { onChange, onBlur, value }, fieldState }) => (
                  <AuthTextField error={fieldState.error?.message} label="Name" onBlur={onBlur} onChangeText={onChange} value={value} />
                )}
              />
              <Controller
                control={form.control}
                name="email"
                render={({ field: { onChange, onBlur, value }, fieldState }) => (
                  <AuthTextField
                    autoCapitalize="none"
                    error={fieldState.error?.message}
                    keyboardType="email-address"
                    label="Email"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="mobile"
                render={({ field: { onChange, onBlur, value }, fieldState }) => (
                  <AuthTextField
                    error={fieldState.error?.message}
                    keyboardType="phone-pad"
                    label="Mobile"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="role"
                render={({ field: { onChange, onBlur, value }, fieldState }) => (
                  <AuthTextField error={fieldState.error?.message} label="Role" onBlur={onBlur} onChangeText={onChange} value={value} />
                )}
              />
            </View>
            <View className="mt-4">
              <GradientButton
                label={ACCOUNT_SETTINGS_COPY.save}
                loading={saving}
                onPress={() =>
                  void form.handleSubmit(async (values) => {
                    const draft: EmployeeDraft = {
                      name: values.name,
                      email: values.email || null,
                      mobile: values.mobile || null,
                      role: values.role,
                    };
                    if (editing) await onUpdate(editing.id, draft);
                    else await onCreate(draft);
                    setOpen(false);
                  })()
                }
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SettingsCard>
  );
}
