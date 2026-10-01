import {
  DEPOSIT_CURRENCY,
  formatDepositAmountUsdt,
} from '@/constants/deposit';
import { MIN_DEPOSIT_USDT } from '@/constants/home';

/**
 * Deposit proof (Step 2) presentation copy.
 *
 * API: POST /api/v1/customer/deposits/sessions/:id/proof
 * Body includes txid + receiptBase64 (PNG/JPG/PDF ≤ 10MB).
 * Status: FUNDS_CLAIMED → PROOF_SUBMITTED → COMPLETED | REJECTED (admin).
 *
 * PRODUCT CONTENT GATE — trust lines with `requiresProductVerification: true`
 * must be product-approved before production.
 */

export const DEPOSIT_PROOF_COPY = {
  flowBadge: 'Deposit Flow',
  title: 'Submit Deposit Proof',
  stepLabel: 'Step 2 of 2',
  stepDone: 'Transfer Sent',
  stepCurrent: 'Proof Verification',
  overviewLabel: 'Deposit Overview',
  statusAwaiting: 'Awaiting Proof',
  amountLabel: 'Amount Expected',
  asset: DEPOSIT_CURRENCY,
  network: 'TRC-20',
  recipientLabel: 'Recipient Address',
  copy: 'Copy',
  copied: 'Copied!',
  txidLabel: 'Transaction Hash / TXID',
  required: 'Required',
  optional: 'Optional',
  txidPlaceholder: 'Enter 64-character TXID or reference number',
  paste: 'Paste',
  txidHelp: 'Locate the TXID in your wallet or exchange withdrawal history.',
  receiptLabel: 'Payment Receipt / Screenshot',
  fileAttached: '1 File Attached',
  uploadTitle: 'Tap to upload screenshot',
  uploadHint: 'PNG, JPG or PDF up to 10MB',
  pickScreenshot: 'Choose screenshot',
  pickPdf: 'Choose PDF',
  takePhoto: 'Take photo',
  replace: 'Replace',
  fileComplete: 'Complete',
  exchangeLabel: 'Sender Wallet / Exchange',
  exchangePlaceholder: 'e.g. Binance, OKX, Personal Wallet',
  exchangeChips: ['Binance', 'Trust Wallet', 'Bybit', 'OKX'] as const,
  submit: 'Submit for Review',
  cancel: 'Cancel and return to deposit',
  submitUnavailableTitle: 'Could not submit proof',
  submitUnavailableBody:
    'We could not send your deposit proof. Check your connection and try again.',
  maxFileBytes: 10 * 1024 * 1024,
  acceptedMimeTypes: [
    'image/png',
    'image/jpeg',
    'application/pdf',
  ] as const,
} as const;

export function getDepositProofOverview(options?: {
  recipientAddress?: string | null;
  networkLabel?: string | null;
  amountUsdt?: number;
  amountDisplay?: string;
}) {
  const amountUsdt = options?.amountUsdt ?? MIN_DEPOSIT_USDT;
  return {
    amountDisplay:
      options?.amountDisplay ??
      amountUsdt.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    amountUsdt,
    currency: DEPOSIT_CURRENCY,
    /** Display label — prefer session network when hydrated from API. */
    network: (options?.networkLabel?.trim() || 'TRC-20') as string,
    /** Never invent a wallet — empty until hydrated from the active session. */
    recipientAddress: options?.recipientAddress?.trim() || '',
    requiresApiBacking: true as const,
  };
}

export const DEPOSIT_PROOF_TRUST_STAMP = {
  text: 'Encrypted & Protected by Clearpay Institutional Trust Protocol',
  requiresProductVerification: true,
} as const;

export function formatDepositProofNoticeAmount(
  amountDisplay = formatDepositAmountUsdt(MIN_DEPOSIT_USDT),
  asset: string = DEPOSIT_CURRENCY,
): string {
  return `Ensure your screenshot clearly shows the sent amount (${amountDisplay} ${asset}), recipient address, and transaction timestamp for immediate automated clearance.`;
}
