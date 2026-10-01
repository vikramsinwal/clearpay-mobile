import { z } from 'zod';

import { accountNameSchema } from '@/features/profile/schemas/account-settings';
import { accountProvidersFor } from '@/features/accounts/lib/providers';
import type { AccountKind } from '@/features/accounts/types';

const UPI_ID =
  /^[a-z0-9.\-_]{2,256}@[a-z][a-z0-9.\-]{1,63}$/;

const limitField = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true;
    if (!/^\d+$/.test(value)) return false;
    return Number(value) <= 99_999_999_999;
  }, 'Enter a whole number of paise up to 99999999999.');

function providerField(kind: AccountKind) {
  const ids = new Set(accountProvidersFor(kind).map((provider) => provider.id));
  return z.string().trim().refine((value) => ids.has(value), 'Select a provider.');
}

const phoneField = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || /^\+?[0-9]{10,15}$/.test(value),
    'Enter a valid phone number.',
  );

const upiSchema = z
  .object({
    name: accountNameSchema,
    provider: providerField('upi_bank'),
    upiId: z
      .string()
      .trim()
      .min(1, 'UPI ID is required.')
      .refine(
        (value) => UPI_ID.test(value.toLowerCase()),
        'Use a valid UPI ID like username@bank',
      ),
    phone: phoneField,
    accountHolderName: z.string().trim(),
    accountNumber: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || /^\d{9,18}$/.test(value),
        'Enter 9–18 digits.',
      ),
    ifsc: z.string().trim(),
    bankName: z.string().trim(),
    transactionLimit: limitField,
  })
  .superRefine((value, ctx) => {
    const parts: [string, string][] = [
      ['accountHolderName', value.accountHolderName],
      ['accountNumber', value.accountNumber],
      ['ifsc', value.ifsc],
      ['bankName', value.bankName],
    ];
    if (!parts.some(([, part]) => part.length > 0)) return;
    for (const [path, part] of parts) {
      if (part.length > 0) continue;
      ctx.addIssue({
        code: 'custom',
        path: [path],
        message: 'Complete every bank field, or leave them all empty.',
      });
    }
  });

const gatewaySchema = z.object({
  name: accountNameSchema,
  provider: providerField('gateway'),
  merchantId: z.string().trim().min(1, 'Merchant ID is required.').max(64),
  displayName: z.string().trim().max(160),
  transactionLimit: limitField,
});

export function createAccountSchema(kind: AccountKind) {
  return kind === 'gateway' ? gatewaySchema : upiSchema;
}

export type AccountFormValues = Record<string, string>;
