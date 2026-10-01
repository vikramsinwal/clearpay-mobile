import * as FileSystem from 'expo-file-system/legacy';

export const SMS_CONSENT_VERSION = '1';

export const SMS_CONSENT_STATEMENT =
  'Clearpay may detect eligible payment SMS messages and submit matching payment proof automatically.';

export type SmsAutomationPreference = {
  enabled: boolean;
  consentVersion: string | null;
  acknowledgedAt: string | null;
};

const EMPTY: SmsAutomationPreference = {
  enabled: false,
  consentVersion: null,
  acknowledgedAt: null,
};

let memory: SmsAutomationPreference = { ...EMPTY };

function fileUri(): string | null {
  const root = FileSystem.documentDirectory;
  if (!root) return null;
  return `${root}clearpay-sms-automation.json`;
}

export function consentIsCurrent(preference: SmsAutomationPreference): boolean {
  return preference.enabled && preference.consentVersion === SMS_CONSENT_VERSION && Boolean(preference.acknowledgedAt);
}

export async function readAutomationPreference(): Promise<SmsAutomationPreference> {
  const uri = fileUri();
  if (!uri) return memory;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return memory;
    const raw = await FileSystem.readAsStringAsync(uri);
    const parsed = JSON.parse(raw) as Partial<SmsAutomationPreference>;
    memory = {
      enabled: parsed.enabled === true,
      consentVersion: typeof parsed.consentVersion === 'string' ? parsed.consentVersion : null,
      acknowledgedAt: typeof parsed.acknowledgedAt === 'string' ? parsed.acknowledgedAt : null,
    };
    return memory;
  } catch {
    return memory;
  }
}

export async function writeAutomationPreference(
  next: SmsAutomationPreference,
): Promise<SmsAutomationPreference> {
  memory = {
    enabled: next.enabled === true,
    consentVersion: next.consentVersion,
    acknowledgedAt: next.acknowledgedAt,
  };
  const uri = fileUri();
  if (!uri) return memory;
  try {
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(memory));
  } catch {
    return memory;
  }
  return memory;
}
