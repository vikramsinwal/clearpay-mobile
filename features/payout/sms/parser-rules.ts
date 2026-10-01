/**
 * Configurable payment-SMS rules. The Android module applies the same patterns
 * natively and never forwards the message body.
 */
export type PaymentParserRule = {
  id: string;
  kind:
    | 'amount'
    | 'reference'
    | 'account'
    | 'debit'
    | 'credit'
    | 'success'
    | 'failed'
    | 'pending'
    | 'beneficiary'
    | 'otp';
  pattern: string;
};

export const PAYMENT_SMS_RULES: readonly PaymentParserRule[] = [
  {
    id: 'amount-inr',
    kind: 'amount',
    pattern: '(?:₹|Rs\\.?|INR)\\s*([0-9]{1,9}(?:,[0-9]{2,3})*(?:\\.[0-9]{1,2})?)',
  },
  {
    id: 'reference-labeled',
    kind: 'reference',
    pattern: '(?:UTR|UPI\\s*Ref(?:erence)?|Ref(?:erence)?|Txn(?:\\s*ID)?)\\s*[:\\-]?\\s*([A-Z0-9]{10,22})',
  },
  {
    id: 'reference-digits',
    kind: 'reference',
    pattern: '\\b(\\d{12})\\b',
  },
  {
    id: 'account-last4',
    kind: 'account',
    pattern: '(?:A/c|Acct|Account|a/c)\\s*(?:no\\.?)?\\s*(?:XX|X+)?(\\d{4})\\b',
  },
  {
    id: 'debit',
    kind: 'debit',
    pattern: '\\b(debited|debit|sent|paid|transferred|withdrawn)\\b',
  },
  {
    id: 'credit',
    kind: 'credit',
    pattern: '\\b(credited|credit|received)\\b',
  },
  {
    id: 'failed',
    kind: 'failed',
    pattern: '\\b(failed|reversed|declined|unsuccessful)\\b',
  },
  {
    id: 'pending',
    kind: 'pending',
    pattern: '\\b(pending|processing)\\b',
  },
  {
    id: 'success',
    kind: 'success',
    pattern: '\\b(successful|success|completed)\\b',
  },
  {
    id: 'beneficiary',
    kind: 'beneficiary',
    pattern: '(?:paid to|sent to|to|towards)\\s+([A-Za-z][A-Za-z .]{2,40})',
  },
  {
    id: 'otp',
    kind: 'otp',
    pattern: '\\b(otp|one time password|verification code)\\b',
  },
];

export const BANK_SENDER_PROVIDERS: Readonly<Record<string, string>> = {
  HDFC: 'HDFC',
  SBI: 'SBI',
  ICICI: 'ICICI',
  AXIS: 'AXIS',
  KOTAK: 'KOTAK',
  PNB: 'PNB',
  YESBNK: 'YES',
  IDFC: 'IDFC',
  PAYTM: 'PAYTM',
  PHONEPE: 'PHONEPE',
};
