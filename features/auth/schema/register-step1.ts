import { z } from 'zod';

export const strongPassword = z
  .string()
  .min(8, 'At least 8 characters')
  .refine(
    (value) => /[A-Z]/.test(value) && /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value),
    {
      message:
        'Use at least 8 characters with an uppercase letter and a number or symbol.',
    },
  );

export const registerStep1Schema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Enter a valid email address'),
    fullName: z.string().trim().min(1, 'Full name is required').max(160),
    password: strongPassword,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterStep1Values = z.infer<typeof registerStep1Schema>;
