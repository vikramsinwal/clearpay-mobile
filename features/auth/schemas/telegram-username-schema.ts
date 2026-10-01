import { z } from 'zod';

/**
 * Telegram username client validation.
 *
 * Backend contract: none documented in API_CUSTOMER_AUTH.md as of this screen.
 * Until the backend publishes a field schema, use Telegram-compatible basics:
 * - optional leading "@" (stripped in the field UI)
 * - 5–32 characters
 * - starts with a letter
 * - letters, digits, underscores only
 *
 * Prefer backend `VALIDATION_ERROR` details when the API is available.
 */
export const telegramUsernameSchema = z.object({
  telegramUsername: z
    .string()
    .trim()
    .min(1, 'Telegram username is required')
    .superRefine((value, ctx) => {
      const normalized = value.replace(/^@+/, '');
      if (normalized.length < 5) {
        ctx.addIssue({
          code: 'custom',
          message: 'Username must be at least 5 characters',
        });
        return;
      }
      if (normalized.length > 32) {
        ctx.addIssue({
          code: 'custom',
          message: 'Username must be at most 32 characters',
        });
        return;
      }
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(normalized)) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Use letters, numbers, and underscores only (start with a letter)',
        });
      }
    })
    .transform((value) => value.replace(/^@+/, '')),
});

export type TelegramUsernameFormValues = z.output<typeof telegramUsernameSchema>;
