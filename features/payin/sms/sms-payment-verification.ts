import { DeviceEventEmitter, NativeModules, Platform, type EmitterSubscription } from 'react-native';

import { parsePaymentSms, sha256Hex, type ParsedPaymentSms, type RawPaymentSms } from '@/features/payin/lib/sms-parser';

/**
 * Platform boundary for payment-message evidence.
 * Android may attach an optional native listener. This module never requests
 * broad SMS access and never confirms a payment locally.
 * iOS has no silent SMS read — callers stay on manual verification.
 */

const SMS_EVENT = 'ClearpayPaymentSms';

export type SmsServiceStatus = {
  platform: 'android' | 'ios' | 'other';
  mode: 'unsupported' | 'consent_required' | 'listening' | 'manual_fallback' | 'stopped';
  listening: boolean;
};

type NativeSmsModule = {
  startListening?: () => Promise<void>;
  stopListening?: () => Promise<void>;
};

type EvidenceListener = (evidence: ParsedPaymentSms) => void;

let consented = false;
let listening = false;
let subscription: EmitterSubscription | null = null;
const listeners = new Set<EvidenceListener>();

function platform(): SmsServiceStatus['platform'] {
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'ios') return 'ios';
  return 'other';
}

function nativeModule(): NativeSmsModule | null {
  const candidate = NativeModules.SmsPaymentVerification as NativeSmsModule | undefined;
  if (!candidate || typeof candidate.startListening !== 'function') return null;
  return candidate;
}

export const SmsPaymentVerificationService = {
  getStatus(): SmsServiceStatus {
    const current = platform();
    if (current !== 'android') {
      return { platform: current, mode: 'unsupported', listening: false };
    }
    if (!consented) {
      return { platform: current, mode: 'consent_required', listening: false };
    }
    if (listening) {
      return { platform: current, mode: 'listening', listening: true };
    }
    if (!nativeModule()) {
      return { platform: current, mode: 'manual_fallback', listening: false };
    }
    return { platform: current, mode: 'stopped', listening: false };
  },

  async startListening(options: { consented: boolean }): Promise<SmsServiceStatus> {
    consented = options.consented;
    if (platform() !== 'android' || !options.consented) {
      listening = false;
      return this.getStatus();
    }
    const native = nativeModule();
    if (!native?.startListening) {
      listening = false;
      return this.getStatus();
    }
    await native.startListening();
    subscription?.remove();
    subscription = DeviceEventEmitter.addListener(SMS_EVENT, (payload: unknown) => {
      const message = readRawSms(payload);
      if (message) {
        void this.onPaymentSmsReceived(message);
      }
    });
    listening = true;
    return this.getStatus();
  },

  async stopListening(): Promise<SmsServiceStatus> {
    listening = false;
    subscription?.remove();
    subscription = null;
    const native = nativeModule();
    if (native?.stopListening) {
      await native.stopListening();
    }
    return this.getStatus();
  },

  async onPaymentSmsReceived(message: RawPaymentSms): Promise<void> {
    if (!consented || platform() !== 'android') return;
    const hash = await sha256Hex(`${message.sender}\n${message.body}`);
    const evidence = parsePaymentSms(message, hash);
    if (!evidence) return;
    for (const listener of listeners) {
      listener(evidence);
    }
  },

  subscribe(listener: EvidenceListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

function readRawSms(payload: unknown): RawPaymentSms | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const sender = typeof record.sender === 'string' ? record.sender : '';
  const body = typeof record.body === 'string' ? record.body : '';
  const receivedAt = typeof record.receivedAt === 'string' ? record.receivedAt : '';
  if (!sender || !body || Number.isNaN(Date.parse(receivedAt))) return null;
  return { sender, body, receivedAt };
}
