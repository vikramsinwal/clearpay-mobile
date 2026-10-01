import {
  DEPOSIT_CURRENCY,
  DEPOSIT_NETWORK,
  DEPOSIT_NETWORK_META,
  DEPOSIT_SESSION_TTL_SECONDS,
  formatDepositAmountUsdt,
  isDepositNetwork,
  type DepositNetwork,
} from '@/constants/deposit';
import { MIN_DEPOSIT_USDT } from '@/constants/home';

export type DepositSessionSource = 'presentation' | 'api';

export type DepositNetworkConfig = {
  network: DepositNetwork;
  walletAddress: string;
  qrCode: string | null;
  label: string;
  instructions: string;
};

export type DepositPaymentSession = {
  /** Present when session came from Clearpay REST (`deps_…`). */
  publicId?: string;
  amountUsdt: number;
  amountDisplay: string;
  currency: typeof DEPOSIT_CURRENCY;
  /** Network the server opened this session on. */
  network: DepositNetwork;
  networkLabel: string;
  walletAddress: string;
  /**
   * Per-network receive addresses from admin-configured active networks.
   * Used by the Network switch for QR / copy.
   */
  walletAddresses?: Partial<Record<DepositNetwork, string>>;
  /** Full active network metadata from the API (label / instructions / QR). */
  networks?: DepositNetworkConfig[];
  expiresAtMs: number;
  source: DepositSessionSource;
};

export function normalizeDepositNetwork(
  value: string | null | undefined,
  fallback: DepositNetwork = DEPOSIT_NETWORK,
): DepositNetwork {
  if (value && isDepositNetwork(value)) {
    return value;
  }
  return fallback;
}

/**
 * Resolve the receive address to show for a selected network.
 * Prefer session multi-address map → session primary when networks match.
 * Never invents a wallet address.
 */
export function resolveDepositWalletAddress(
  session: DepositPaymentSession | null | undefined,
  network: DepositNetwork,
): string | null {
  const fromNetworks = session?.networks?.find(
    (item) => item.network === network,
  )?.walletAddress;
  if (fromNetworks?.trim()) {
    return fromNetworks.trim();
  }

  const fromMap = session?.walletAddresses?.[network]?.trim();
  if (fromMap) {
    return fromMap;
  }

  if (session?.network === network && session.walletAddress.trim()) {
    return session.walletAddress.trim();
  }

  return null;
}

export function resolveDepositNetworkMeta(
  session: DepositPaymentSession | null | undefined,
  network: DepositNetwork,
): {
  label: string;
  qrCaption: string;
  addressLabel: string;
  instructions: string;
  qrCode: string | null;
} {
  const fromApi = session?.networks?.find((item) => item.network === network);
  const fallback = DEPOSIT_NETWORK_META[network];
  return {
    label: fromApi?.label || fallback.label,
    qrCaption: fallback.qrCaption,
    addressLabel: fallback.addressLabel,
    instructions: fromApi?.instructions ?? '',
    qrCode: fromApi?.qrCode ?? null,
  };
}

export function listSelectableDepositNetworks(
  session: DepositPaymentSession | null | undefined,
): DepositNetwork[] {
  if (session?.networks?.length) {
    return session.networks
      .map((item) => item.network)
      .filter((network) => Boolean(resolveDepositWalletAddress(session, network)));
  }

  return (Object.keys(session?.walletAddresses ?? {}) as DepositNetwork[]).filter(
    (network) => Boolean(resolveDepositWalletAddress(session, network)),
  );
}

/**
 * Local presentation session — only for offline tooling.
 * Production sheet uses createDepositSession() and never invents wallets.
 */
export function buildPresentationDepositSession(
  nowMs = Date.now(),
): DepositPaymentSession {
  return {
    amountUsdt: MIN_DEPOSIT_USDT,
    amountDisplay: formatDepositAmountUsdt(MIN_DEPOSIT_USDT),
    currency: DEPOSIT_CURRENCY,
    network: DEPOSIT_NETWORK,
    networkLabel: DEPOSIT_NETWORK_META.TRC20.label,
    walletAddress: '',
    walletAddresses: {},
    networks: [],
    expiresAtMs: nowMs + DEPOSIT_SESSION_TTL_SECONDS * 1000,
    source: 'presentation',
  };
}
