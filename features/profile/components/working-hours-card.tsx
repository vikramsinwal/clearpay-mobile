import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { ACCOUNT_SETTINGS_COPY } from '@/constants/profile';
import { formatClock, parseTimeToDate } from '@/features/profile/lib/format-account';
import { workingHoursError } from '@/features/profile/schemas/account-settings';
import type { WorkingHours, WorkingShift } from '@/features/profile/types/account';

import { CardError, CardSkeleton, SettingsCard, SettingsHeading } from './settings-card';

export function WorkingHoursCard({
  hours,
  loading,
  error,
  saving,
  onRetry,
  onSave,
}: {
  hours?: WorkingHours;
  loading: boolean;
  error: boolean;
  saving: boolean;
  onRetry: () => void;
  onSave: (shifts: WorkingShift[]) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WorkingShift[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ index: number; field: 'start' | 'end' } | null>(null);

  if (loading && !hours) return <CardSkeleton lines={4} />;
  if (error && !hours) return <CardError onRetry={onRetry} />;
  if (!hours) return null;

  const rows = editing ? draft : hours.shifts;
  const canEdit = hours.canCustomerChange;

  return (
    <SettingsCard>
      <SettingsHeading
        title={ACCOUNT_SETTINGS_COPY.workingHours}
        trailing={
          canEdit ? (
            editing ? (
              <View className="flex-row gap-3">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setEditing(false);
                    setFormError(null);
                  }}
                >
                  <Text className="text-[13px] text-slate-500" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
                    {ACCOUNT_SETTINGS_COPY.cancel}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={() => {
                    const message = workingHoursError(draft);
                    if (message) {
                      setFormError(message);
                      return;
                    }
                    void onSave(draft)
                      .then(() => {
                        setEditing(false);
                        setFormError(null);
                      })
                      .catch(() => undefined);
                  }}
                >
                  <Text className="text-[13px] text-blue" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
                    {ACCOUNT_SETTINGS_COPY.save}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setDraft(hours.shifts.map((shift) => ({ ...shift })));
                  setFormError(null);
                  setEditing(true);
                }}
              >
                <Text className="text-[13px] text-blue" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
                  {ACCOUNT_SETTINGS_COPY.editWorkingHours}
                </Text>
              </Pressable>
            )
          ) : null
        }
      />

      {rows.length === 0 ? (
        <Text className="text-[13px] text-slate-500" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>
          {ACCOUNT_SETTINGS_COPY.noShifts}
        </Text>
      ) : (
        <View className="gap-2.5">
          {rows.map((shift, index) => (
            <View key={`${shift.start}-${shift.end}-${index}`} className="flex-row items-center gap-2">
              <Text className="w-[64px] text-[13px] text-slate-800" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                Shift {index + 1}
              </Text>
              {editing ? (
                <View className="flex-1 flex-row items-center gap-1">
                  <Pressable
                    className="rounded-lg border border-slate-200 px-2 py-1"
                    onPress={() => setPicker({ index, field: 'start' })}
                  >
                    <Text className="text-[12px] text-slate-800" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                      {shift.start}
                    </Text>
                  </Pressable>
                  <Text className="text-slate-400">–</Text>
                  <Pressable
                    className="rounded-lg border border-slate-200 px-2 py-1"
                    onPress={() => setPicker({ index, field: 'end' })}
                  >
                    <Text className="text-[12px] text-slate-800" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                      {shift.end}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setDraft((current) => current.filter((_, item) => item !== index))}
                  >
                    <Text className="text-[12px] text-red-600" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
                      Remove
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Text className="flex-1 text-[13px] text-slate-600" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>
                  {shift.start} – {shift.end}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {editing && draft.length < hours.maxShifts ? (
        <Pressable
          accessibilityRole="button"
          className="mt-3"
          onPress={() => setDraft((current) => [...current, { start: '09:00', end: '12:00' }])}
        >
          <Text className="text-[13px] text-blue" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
            Add shift
          </Text>
        </Pressable>
      ) : null}

      {formError ? (
        <Text className="mt-2 text-[12px] text-red-600" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>
          {formError}
        </Text>
      ) : null}

      {!canEdit ? (
        <Text className="mt-3 text-[12px] text-slate-400" style={{ fontFamily: 'PlusJakartaSans_400Regular' }}>
          {ACCOUNT_SETTINGS_COPY.hoursManagedByAdmin}
        </Text>
      ) : null}

      {picker ? (
        <DateTimePicker
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          mode="time"
          value={parseTimeToDate(draft[picker.index]?.[picker.field] ?? '00:00')}
          onChange={(event, date) => {
            if (event.type === 'dismissed' || !date) {
              setPicker(null);
              return;
            }
            const next = formatClock(date);
            setDraft((current) =>
              current.map((shift, index) =>
                index === picker.index ? { ...shift, [picker.field]: next } : shift,
              ),
            );
            if (Platform.OS === 'android') setPicker(null);
          }}
        />
      ) : null}
    </SettingsCard>
  );
}
