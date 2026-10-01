import { BANK_SENDER_PROVIDERS, PAYMENT_SMS_RULES } from '@/features/payout/sms/parser-rules';
import type { PaymentCandidate, PaymentSmsVerdict } from '@/features/payout/types';

export type PaymentSmsInput = {
  sender: string;
  body: string;
  timestamp: string;
};

export type PaymentParseResult = {
  verdict: PaymentSmsVerdict;
  candidate: PaymentCandidate | null;
};

type HashSender = (sender: string) => string;
type PaymentParserRuleKind = (typeof PAYMENT_SMS_RULES)[number]['kind'];

function rule(kind: PaymentParserRuleKind): RegExp | null {
  const found = PAYMENT_SMS_RULES.find((item) => item.kind === kind && item.id !== 'reference-digits');
  if (!found) return null;
  return new RegExp(found.pattern, 'i');
}

function firstMatch(kind: PaymentParserRuleKind, source: string): string | null {
  return rule(kind)?.exec(source)?.[1]?.trim() ?? null;
}

function amountMinor(body: string): number | null {
  const raw = firstMatch('amount', body);
  if (!raw) return null;
  const cleaned = raw.replace(/,/g, '');
  const [wholeRaw, fractionRaw = ''] = cleaned.split('.');
  const whole = Number(wholeRaw);
  const fraction = Number(fractionRaw.padEnd(2, '0').slice(0, 2));
  if (!Number.isInteger(whole) || !Number.isInteger(fraction) || whole < 0 || whole > 50_000_000) {
    return null;
  }
  return whole * 100 + fraction;
}

function reference(body: string): string | null {
  const labeled = firstMatch('reference', body);
  if (labeled && /^[A-Z0-9]{10,22}$/i.test(labeled)) return labeled.toUpperCase();
  const digits = PAYMENT_SMS_RULES.find((item) => item.id === 'reference-digits');
  if (!digits) return null;
  const match = new RegExp(digits.pattern).exec(body);
  return match?.[1] ?? null;
}

function accountLast4(body: string): string | null {
  const value = firstMatch('account', body);
  return value && /^\d{4}$/.test(value) ? value : null;
}

function providerFromSender(sender: string): string | null {
  const compact = sender.toUpperCase().replace(/[^A-Z]/g, '');
  for (const [token, provider] of Object.entries(BANK_SENDER_PROVIDERS)) {
    if (compact.includes(token)) return provider;
  }
  return null;
}

function beneficiary(body: string): string | null {
  const value = firstMatch('beneficiary', body);
  if (!value) return null;
  const cleaned = value.replace(/\s+/g, ' ').replace(/\b(on|avl|available|ref|utr)\b.*$/i, '').trim();
  if (cleaned.length < 3 || /^\d+$/.test(cleaned)) return null;
  return cleaned.slice(0, 40);
}

function has(kind: PaymentParserRuleKind, body: string): boolean {
  const found = PAYMENT_SMS_RULES.find((item) => item.kind === kind);
  if (!found) return false;
  return new RegExp(found.pattern, 'i').test(body);
}

/**
 * Reference parser for tests and rule review.
 * Production Android detection extracts these fields in the native module.
 */
export function parsePaymentSms(message: PaymentSmsInput, hashSender: HashSender): PaymentParseResult {
  const sender = message.sender.trim();
  const body = message.body;
  if (!sender || !body.trim() || !message.timestamp) {
    return { verdict: 'NOT_RELEVANT', candidate: null };
  }

  const personalSender = /^\+?\d{10,15}$/.test(sender);
  const otp = has('otp', body);
  const debit = has('debit', body);
  const credit = has('credit', body);
  const minor = amountMinor(body);
  const utr = reference(body);
  const last4 = accountLast4(body);

  if (otp && !debit) return { verdict: 'NOT_RELEVANT', candidate: null };
  if (!debit && !credit) return { verdict: 'NOT_RELEVANT', candidate: null };
  if (personalSender && !debit && !credit) return { verdict: 'NOT_RELEVANT', candidate: null };
  if (credit && !debit) return { verdict: 'NOT_RELEVANT', candidate: null };
  if (minor == null) return { verdict: 'NOT_RELEVANT', candidate: null };

  const failed = has('failed', body);
  const pending = has('pending', body);
  const success = has('success', body) || (!failed && !pending);
  const transactionStatus = failed ? 'FAILED' : pending ? 'PENDING' : success ? 'SUCCESS' : 'UNKNOWN';
  const bank = providerFromSender(sender);
  const name = beneficiary(body);

  let confidence = 0.2;
  if (utr) confidence += 0.25;
  if (last4) confidence += 0.15;
  if (debit) confidence += 0.15;
  if (bank) confidence += 0.1;
  if (transactionStatus === 'SUCCESS') confidence += 0.1;
  if (name) confidence += 0.05;
  confidence = Math.round(confidence * 100) / 100;

  const currency = /(?:₹|Rs\.?|INR)/i.test(body) ? 'INR' : '';
  let verdict: PaymentSmsVerdict = 'UNKNOWN';
  if (!currency || transactionStatus !== 'SUCCESS' || (!utr && !last4)) {
    verdict = 'UNKNOWN';
  } else if (debit && minor != null && (utr || last4)) {
    verdict = 'MATCH_CANDIDATE';
  }

  const senderHash = hashSender(sender);
  const candidate: PaymentCandidate = {
    source: 'ANDROID_SMS',
    senderHash,
    amountMinor: minor,
    currency,
    transactionReference: utr,
    timestamp: message.timestamp,
    accountLast4: last4,
    provider: bank,
    confidence,
    direction: 'DEBIT',
    transactionStatus,
    beneficiaryName: name,
    verdict,
    dedupeKey: hashSender(`${senderHash}|${minor}|${utr ?? ''}|${message.timestamp}`),
  };

  return { verdict, candidate };
}
