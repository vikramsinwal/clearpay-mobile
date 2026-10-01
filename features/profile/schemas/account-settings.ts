import { z } from 'zod';

import { strongPassword } from '@/features/auth/schema/register-step1';
import type { WorkingShift } from '@/features/profile/types/account';

/** Profile name: starts with a letter; letters, numbers, spaces, `.`, `'`, `-`. */
export const accountNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(160, 'Name is too long')
  .regex(/^[\p{L}][\p{L}\p{N} .'-]*$/u, 'Enter a valid name');

export const accountMobileSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/, 'Enter a valid mobile number');

export const accountUpiSchema = z
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

const optionalEmail = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(z.union([z.literal(''), z.string().email('Enter a valid email')]));

const optionalMobile = z
  .string()
  .trim()
  .pipe(z.union([z.literal(''), accountMobileSchema]));

export const employeeDraftSchema = z
  .object({
    name: accountNameSchema,
    email: optionalEmail,
    mobile: optionalMobile,
    role: z.string().trim().max(40, 'Role is too long'),
  })
  .superRefine((value, ctx) => {
    if (!value.email && !value.mobile) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter an email or a mobile number',
        path: ['email'],
      });
    }
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: strongPassword,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'Choose a password that is different from the current one',
    path: ['newPassword'],
  });

function minutes(hhmm: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Client check before PATCH. The server remains authoritative. */
export function workingHoursError(shifts: WorkingShift[]): string | null {
  const windows = shifts.map((shift) => ({
    start: minutes(shift.start),
    end: minutes(shift.end),
  }));
  if (windows.some((window) => window.start == null || window.end == null)) {
    return 'Use 24-hour times like 09:00.';
  }
  const sorted = windows
    .map((window) => ({ start: window.start as number, end: window.end as number }))
    .sort((a, b) => a.start - b.start);
  for (const window of sorted) {
    if (window.start >= window.end) {
      return 'Each shift must end after it starts.';
    }
  }
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (!previous || !current || current.start < previous.end) {
      return 'Shifts cannot overlap.';
    }
  }
  return null;
}
