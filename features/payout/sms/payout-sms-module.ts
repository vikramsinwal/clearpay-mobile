import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

import type { SmsAutomationPermission } from '@/features/payout/sms/resolve-outcome';
import type { PaymentCandidate, PaymentSmsVerdict } from '@/features/payout/types';

/**
 * Platform boundary for payout SMS detection.
 * iOS has no inbox capability here. Android emits extracted fields only.
 */

const EVENT = 'onPayoutPaymentCandidate';

type NativeModule = {
  getCapability: () => Promise<{ platform?: string; status?: string }>;
  requestPermissionIfSupported: () => Promise<string>;
  startPaymentDetection: () => Promise<string>;
  stopPaymentDetection: () => Promise<void>;
  getStatus: () => Promise<string>;
  addListener: (event: string, listener: (payload: unknown) => void) => { remove: () => void };
};

export type SmsCapability = {
  platform: 'android' | 'ios' | 'other';
  status: SmsAutomationPermission;
  manualFallback: true;
};

type CandidateListener = (candidate: PaymentCandidate) => void;

const PERMISSIONS = new Set<SmsAutomationPermission>([
  'SMS_AUTOMATION_UNAVAILABLE',
  'PERMISSION_REQUIRED',
  'PERMISSION_GRANTED',
  'PERMISSION_DENIED',
  'POLICY_RESTRICTED',
]);

let native: NativeModule | null | undefined;
let subscription: { remove: () => void } | null = null;
const listeners = new Set<CandidateListener>();

function platform(): SmsCapability['platform'] {
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'ios') return 'ios';
  return 'other';
}

function asPermission(value: unknown): SmsAutomationPermission {
  return typeof value === 'string' && PERMISSIONS.has(value as SmsAutomationPermission)
    ? (value as SmsAutomationPermission)
    : 'SMS_AUTOMATION_UNAVAILABLE';
}

function moduleOrNull(): NativeModule | null {
  if (native !== undefined) return native;
  if (Platform.OS !== 'android') {
    native = null;
    return null;
  }
  try {
    native = requireNativeModule<NativeModule>('AndroidPayoutSmsModule');
    return native;
  } catch {
    native = null;
    return null;
  }
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readCandidate(payload: unknown): PaymentCandidate | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  if ('body' in record || 'message' in record || 'sms' in record) return null;
  const senderHash = readString(record, 'senderHash');
  const timestamp = readString(record, 'timestamp');
  const dedupeKey = readString(record, 'dedupeKey');
  const amountMinor = record.amountMinor;
  if (!senderHash || !/^[a-f0-9]{64}$/i.test(senderHash) || !timestamp || !dedupeKey) return null;
  if (typeof amountMinor !== 'number' || !Number.isInteger(amountMinor) || amountMinor < 0) return null;
  const verdict = readString(record, 'verdict');
  if (verdict !== 'MATCH_CANDIDATE' && verdict !== 'UNKNOWN') return null;
  const direction = readString(record, 'direction');
  const transactionStatus = readString(record, 'transactionStatus');
  return {
    source: 'ANDROID_SMS',
    senderHash,
    amountMinor,
    currency: readString(record, 'currency') ?? '',
    transactionReference: readString(record, 'transactionReference'),
    timestamp,
    accountLast4: readString(record, 'accountLast4'),
    provider: readString(record, 'provider'),
    confidence: typeof record.confidence === 'number' ? record.confidence : 0,
    direction: direction === 'DEBIT' || direction === 'CREDIT' ? direction : null,
    transactionStatus:
      transactionStatus === 'SUCCESS' ||
      transactionStatus === 'PENDING' ||
      transactionStatus === 'FAILED' ||
      transactionStatus === 'UNKNOWN'
        ? transactionStatus
        : 'UNKNOWN',
    beneficiaryName: readString(record, 'beneficiaryName'),
    verdict: verdict as PaymentSmsVerdict,
    dedupeKey,
  };
}

function unavailable(): SmsCapability {
  return { platform: platform(), status: 'SMS_AUTOMATION_UNAVAILABLE', manualFallback: true };
}

export const PayoutSmsModule = {
  async getCapability(): Promise<SmsCapability> {
    if (Platform.OS !== 'android') return unavailable();
    const current = moduleOrNull();
    if (!current) return unavailable();
    try {
      const result = await current.getCapability();
      return { platform: 'android', status: asPermission(result.status), manualFallback: true };
    } catch {
      return unavailable();
    }
  },

  async requestPermissionIfSupported(): Promise<SmsAutomationPermission> {
    if (Platform.OS !== 'android') return 'SMS_AUTOMATION_UNAVAILABLE';
    const current = moduleOrNull();
    if (!current) return 'SMS_AUTOMATION_UNAVAILABLE';
    try {
      return asPermission(await current.requestPermissionIfSupported());
    } catch {
      return 'PERMISSION_DENIED';
    }
  },

  async startPaymentDetection(): Promise<SmsAutomationPermission> {
    if (Platform.OS !== 'android') return 'SMS_AUTOMATION_UNAVAILABLE';
    const current = moduleOrNull();
    if (!current) return 'SMS_AUTOMATION_UNAVAILABLE';
    try {
      const status = asPermission(await current.startPaymentDetection());
      if (status !== 'PERMISSION_GRANTED') return status;
      subscription?.remove();
      subscription = current.addListener(EVENT, (payload: unknown) => {
        const candidate = readCandidate(payload);
        if (!candidate) return;
        for (const listener of listeners) listener(candidate);
      });
      return status;
    } catch {
      return 'SMS_AUTOMATION_UNAVAILABLE';
    }
  },

  async stopPaymentDetection(): Promise<void> {
    subscription?.remove();
    subscription = null;
    const current = moduleOrNull();
    if (!current) return;
    try {
      await current.stopPaymentDetection();
    } catch {
      return;
    }
  },

  async getStatus(): Promise<SmsAutomationPermission> {
    if (Platform.OS !== 'android') return 'SMS_AUTOMATION_UNAVAILABLE';
    const current = moduleOrNull();
    if (!current) return 'SMS_AUTOMATION_UNAVAILABLE';
    try {
      return asPermission(await current.getStatus());
    } catch {
      return 'SMS_AUTOMATION_UNAVAILABLE';
    }
  },

  subscribe(listener: CandidateListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
