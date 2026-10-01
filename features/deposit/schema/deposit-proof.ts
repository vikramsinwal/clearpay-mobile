import { z } from 'zod';

import { DEPOSIT_PROOF_COPY } from '@/constants/deposit-proof';

const MAX_BYTES = DEPOSIT_PROOF_COPY.maxFileBytes;

export const depositProofReceiptSchema = z.object({
  uri: z.string().min(1),
  name: z.string().min(1),
  /** May be 0 when the OS picker does not report size; API re-checks decoded bytes. */
  size: z.number().int().nonnegative().max(MAX_BYTES, {
    message: 'File must be 10MB or smaller',
  }),
  mimeType: z.string().optional(),
});

export const depositProofSchema = z.object({
  txid: z
    .string()
    .trim()
    .min(8, 'Enter a valid transaction hash or reference')
    .max(128, 'TXID is too long'),
  receipt: depositProofReceiptSchema,
  senderExchange: z.string().trim().max(80).optional(),
});

export type DepositProofValues = z.infer<typeof depositProofSchema>;
export type DepositProofReceipt = z.infer<typeof depositProofReceiptSchema>;
