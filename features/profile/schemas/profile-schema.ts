import { z } from 'zod';

import { PROFILE_COUNTRY_CODES } from '@/constants/profile';

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Full name is required')
  .max(160, 'Name is too long')
  .refine((value) => /^[\p{L}\p{M}\s.'’-]+$/u.test(value), {
    message: 'Enter a valid name',
  });

export const nationalNumberSchema = z
  .string()
  .trim()
  .min(1, 'Mobile number is required')
  .regex(/^[0-9]{6,14}$/, 'Enter a valid mobile number');

export const upiIdSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(
    z.union([
      z.literal(''),
      z
        .string()
        .regex(
          /^[a-z0-9.\-_]{2,256}@[a-z][a-z0-9.\-]{1,63}$/,
          'Use a valid UPI ID like username@bank',
        ),
    ]),
  );

const telegramUsernameOptionalSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^@+/, ''))
  .pipe(
    z.union([
      z.literal(''),
      z
        .string()
        .min(5, 'Username must be at least 5 characters')
        .max(32, 'Username must be at most 32 characters')
        .regex(
          /^[A-Za-z][A-Za-z0-9_]*$/,
          'Use letters, numbers, and underscores only',
        ),
    ]),
  );

export const profileFormSchema = z.object({
  name: nameSchema,
  countryCode: z.string().min(2),
  nationalNumber: nationalNumberSchema,
  upiId: upiIdSchema,
  telegramUsername: telegramUsernameOptionalSchema,
});

export type ProfileFormValues = z.output<typeof profileFormSchema>;

/** Build compact phone for PATCH `/me` (matches backend isValidMobile). */
export function toCompactPhone(
  countryCode: string,
  nationalNumber: string,
): string {
  const digits = nationalNumber.replace(/\D/g, '');
  const code = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
  return `${code}${digits}`;
}

export function splitPhone(
  phone: string | null | undefined,
  fallbackCode = '+91',
): { countryCode: string; nationalNumber: string } {
  const compact = (phone ?? '').trim().replace(/[\s()-]/g, '');
  if (!compact) {
    return { countryCode: fallbackCode, nationalNumber: '' };
  }

  const sorted = [...PROFILE_COUNTRY_CODES].sort(
    (a, b) => b.code.length - a.code.length,
  );
  for (const item of sorted) {
    if (compact.startsWith(item.code)) {
      return {
        countryCode: item.code,
        nationalNumber: compact.slice(item.code.length),
      };
    }
  }

  if (compact.startsWith('+')) {
    return {
      countryCode: fallbackCode,
      nationalNumber: compact.replace(/^\+/, ''),
    };
  }

  return { countryCode: fallbackCode, nationalNumber: compact };
}
