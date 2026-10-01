import { MIN_DEPOSIT_USDT } from '@/constants/home';

/**
 * Deposit payment presentation until Clearpay publishes a customer
 * deposit-session REST contract (create / poll / confirm).
 *
 * Customers still cannot create ledger payments via `/api/v1/customer/*`
 * (see clearpay-web docs/API_CUSTOMER.md).
 */

/** Design default TTL (~58:48) until API returns `expiresAt`. */
export const DEPOSIT_SESSION_TTL_SECONDS = 58 * 60 + 48;

export const DEPOSIT_NETWORKS = ['TRC20', 'BEP20'] as const;
export type DepositNetwork = (typeof DEPOSIT_NETWORKS)[number];

export const DEPOSIT_NETWORK = 'TRC20' as const satisfies DepositNetwork;
export const DEPOSIT_NETWORK_LABEL = 'TRON NETWORK' as const;
export const DEPOSIT_CURRENCY = 'USDT' as const;

export const DEPOSIT_NETWORK_META: Record<
  DepositNetwork,
  { label: string; qrCaption: string; addressLabel: string }
> = {
  TRC20: {
    label: 'TRON NETWORK',
    qrCaption: 'Scan to send TRC20 USDT',
    addressLabel: 'TRC20 Wallet Address',
  },
  BEP20: {
    label: 'BSC NETWORK',
    qrCaption: 'Scan to send BEP20 USDT',
    addressLabel: 'BEP20 Wallet Address',
  },
};

/**
 * Presentation TRC20/BEP20 addresses are no longer hard-coded.
 * Wallets come from Admin Settings → Accounts (API). Server env
 * `CUSTOMER_DEPOSIT_TRC20_ADDRESS` remains a temporary backend fallback only.
 */

export const DEPOSIT_USDT_COPY = {
  title: 'Deposit USDT',
  subtitle: 'Add USDT to your balance',
  timeRemaining: 'Time Remaining:',
  amountToSend: 'Amount To Send',
  networkLabel: 'Network',
  networkWarning:
    'Make sure the network matches exactly, otherwise funds may be lost.',
  qrCaption: 'Scan to send TRC20 USDT',
  addressLabel: 'TRC20 Wallet Address',
  instructionsTitle: 'Instructions',
  cancel: 'Cancel deposit',
  sentFunds: 'I sent funds',
  copyAddress: 'Copy Address to clipboard',
  close: 'Close dialog',
  confirmUnavailableTitle: 'Confirmation unavailable',
  confirmUnavailableBody:
    'Unable to confirm funds sent. Check your connection and try again.',
  missingAddressTitle: 'Deposit wallet not configured',
  missingAddressBody:
    'No active deposit wallet is available. Ask Clearpay admin to configure USDT Deposit Accounts.',
  missingBep20AddressBody:
    'BEP20 is not enabled. Ask Clearpay admin to configure and activate BEP20 under Settings → Accounts.',
  noNetworksBody:
    'No deposit networks are active. Ask Clearpay admin to enable TRC20 or BEP20 under Settings → Accounts.',
} as const;

export function formatDepositAmountUsdt(amount = MIN_DEPOSIT_USDT): string {
  return amount.toFixed(6);
}

export function isDepositNetwork(value: string): value is DepositNetwork {
  return (DEPOSIT_NETWORKS as readonly string[]).includes(value);
}
