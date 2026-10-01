/** Home / trader portal presentation constants (non-secret). */

export const HOME_PORTAL_SUBTITLE = 'Clearpay Trader Portal';

/**
 * Minimum initial deposit copy from the product home design.
 * Backend does not yet expose a customer deposit-create or min-deposit config
 * endpoint — treat as product presentation until the API publishes it.
 */
export const MIN_DEPOSIT_USDT = 2000;

export const DEPOSIT_REQUIRED_COPY = {
  title: 'Deposit Required',
  subtitle: 'Functionality is unavailable until first deposit',
  body: 'Access to dashboard functionality is blocked until you make your first USDT deposit.',
  bannerBody:
    'Make an initial deposit to unlock your trader account and start working',
  requiredAmountLabel: 'Required Amount',
  networks: '(TRC-20 / ERC-20)',
  trustNote: 'Funds secured in your verified collateral balance',
  cta: 'Make Deposit',
  makePaymentCta: 'Make Payment',
  dismiss: 'Return to Dashboard',
  withdrawDisabled: 'Withdraw',
  netBalanceLabel: 'Net Balance',
} as const;

export function formatMinDepositUsdt(amount = MIN_DEPOSIT_USDT): string {
  return `${amount.toLocaleString('en-US')} USDT`;
}

export type EarningsPeriod = 'today' | '7d' | '30d' | 'custom';

export const EARNINGS_PERIODS: { key: EarningsPeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: 'custom', label: 'Custom' },
];
