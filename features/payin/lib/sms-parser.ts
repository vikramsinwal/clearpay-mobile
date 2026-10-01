export type RawPaymentSms = {
  sender: string;
  body: string;
  receivedAt: string;
};

export type ParsedPaymentSms = {
  sender: string;
  receivedAt: string;
  rawMessageHash: string | null;
  amountMinor?: number;
  currency?: string;
  utr?: string;
  accountLast4?: string;
  transactionType: 'credit' | 'debit' | 'unknown';
  confidence: number;
};

/**
 * Extracts candidate payment fields. Matching is evidence only —
 * the backend decides whether an order is verified.
 */
export function parsePaymentSms(
  message: RawPaymentSms,
  rawMessageHash: string | null,
): ParsedPaymentSms | null {
  const sender = message.sender.trim().slice(0, 64);
  const body = message.body;
  if (!sender || !body.trim()) return null;

  const amountMinor = readAmountMinor(body);
  const utr = readUtr(body);
  const accountLast4 = readAccountLast4(body);
  const transactionType = readDirection(body);
  const currency = /(?:₹|Rs\.?|INR)/i.test(body) ? 'INR' : undefined;

  let confidence = 0;
  if (amountMinor != null) confidence += 0.25;
  if (utr) confidence += 0.35;
  if (accountLast4) confidence += 0.15;
  if (transactionType === 'credit') confidence += 0.15;
  if (sender) confidence += 0.1;
  confidence = Math.round(confidence * 100) / 100;

  if (amountMinor == null && !utr) return null;

  return {
    sender,
    receivedAt: message.receivedAt,
    rawMessageHash,
    ...(amountMinor != null ? { amountMinor } : {}),
    ...(currency ? { currency } : {}),
    ...(utr ? { utr } : {}),
    ...(accountLast4 ? { accountLast4 } : {}),
    transactionType,
    confidence,
  };
}

function readAmountMinor(body: string): number | null {
  const match = /(?:₹|Rs\.?|INR)\s*([0-9]{1,12}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?)/i.exec(
    body,
  );
  if (!match?.[1]) return null;
  const cleaned = match[1].replace(/,/g, '');
  const parts = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!parts?.[1]) return null;
  const whole = Number(parts[1]);
  const fraction = Number((parts[2] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(fraction)) return null;
  return whole * 100 + fraction;
}

function readUtr(body: string): string | null {
  const labeled = /(?:UTR|UPI\s*Ref(?:erence)?(?:\s*No)?|Ref(?:erence)?)\s*[:\-]?\s*([A-Z0-9]{10,22})/i.exec(
    body,
  );
  if (labeled?.[1]) return labeled[1].toUpperCase();
  const digits = /\b(\d{12})\b/.exec(body);
  return digits?.[1] ?? null;
}

function readAccountLast4(body: string): string | null {
  const match = /(?:A\/c|Acct|Account|a\/c).*?(\d{4})\b/i.exec(body);
  return match?.[1] ?? null;
}

function readDirection(body: string): 'credit' | 'debit' | 'unknown' {
  if (/\b(credited|received|credit)\b/i.test(body)) return 'credit';
  if (/\b(debited|sent|debit)\b/i.test(body)) return 'debit';
  return 'unknown';
}

export async function sha256Hex(value: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof TextEncoder === 'undefined') return null;
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
