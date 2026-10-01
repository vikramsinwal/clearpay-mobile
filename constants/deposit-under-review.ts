/**
 * Deposit Under Review — home dashboard after proof submit.
 *
 * Presentation until Clearpay publishes deposit-status / confirmations on the
 * customer REST API. Do not treat confirmations or ETA as ledger authority.
 */

export const DEPOSIT_UNDER_REVIEW_COPY = {
  flowBadge: 'Deposit Flow',
  statusPill: 'Deposit Under Review',
  /** Home hero (portal dashboard) while PROOF_SUBMITTED. */
  homeStatusPill: 'Awaiting Admin Approval • Est. 10–30 mins',
  homeTitle: 'Deposit Under Review',
  homeBodyPrefix: 'Your',
  homeBodySuffix:
    'deposit verification has been submitted to the admin. You will be notified once your verification is completed, after which you can begin accepting pay-in and pay-out requests.',
  homeLockedCta: 'Trading Unlocks After Approval',
  homeCollateralLabel: 'Collateral Submitted:',
  notificationProof: (amountLabel: string, networkLabel: string) =>
    `Deposit proof submitted (${amountLabel} ${networkLabel}) — Admin review in progress.`,
  notificationTelegram: (handle: string) =>
    `You will receive an instant alert on Telegram (${handle}) when approved.`,
  earningsPendingLabel: (amountLabel: string) => `Pending: ${amountLabel}`,
  earningsUnderReviewHint: '(Collateral Under Review)',
  title: 'Deposit Sent for Review',
  body: 'Your deposit is currently being reviewed by our verification team. Once verified (usually within 10–30 minutes), your collateral balance will be updated and you can begin accepting pay-in and pay-out requests.',
  estLabel: 'Est. Confirmation',
  estValue: '10 – 30 mins',
  detailsTitle: 'Submitted Details',
  instantMatch: 'Instant Match',
  amountLabel: 'Amount',
  networkLabel: 'Network',
  networkValue: 'TRC-20 (Tron)',
  txidLabel: 'TXID',
  proofLabel: 'Payment Proof',
  proofCount: '1 screenshot',
  submittedLabel: 'Submitted Time',
  nextTitle: 'What happens next',
  step1Title: 'Funds sent & proof submitted',
  step2Title: 'Blockchain & admin verification',
  step2Detail: 'Checking network confirmations',
  step3Title: 'Balance credited & Orders unlocked',
  step3Detail: 'Ready to process live merchant volume',
  telegramPrefix: 'We will notify you on your linked Telegram account (',
  telegramSuffix: ') as soon as your deposit is approved.',
  telegramFallbackHandle: 'your Telegram',
  backToDashboard: 'Back to Dashboard',
  contactSupport: 'Contact Telegram Support',
  supportUnavailableTitle: 'Support link unavailable',
  supportUnavailableBody:
    'Set EXPO_PUBLIC_TELEGRAM_BOT_URL to open Telegram support from this screen.',
  proofPreviewTitle: 'Uploaded Voucher Receipt',
  copyTxid: 'Copy TXID',
  copied: 'Copied',
} as const;

export function truncateTxid(txid: string, head = 8, tail = 6): string {
  const value = txid.trim();
  if (value.length <= head + tail + 3) {
    return value;
  }
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export function formatSubmittedLocalTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  if (sameDay) {
    return `Today, ${time}`;
  }

  return `${date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })}, ${time}`;
}

export function formatSubmittedUtcTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
  return `Received on ${time} UTC`;
}
