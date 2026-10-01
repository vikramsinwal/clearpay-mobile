import * as FileSystem from 'expo-file-system/legacy';

import { apiRequest } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/errors';
import { getAccessToken } from '@/lib/auth/secure-tokens';
import { DEPOSIT_PROOF_COPY } from '@/constants/deposit-proof';

import type { DepositNetwork } from '@/constants/deposit';
import {
  normalizeDepositNetwork,
  type DepositPaymentSession,
} from '@/features/deposit/lib/deposit-session';
import type { DepositUnderReviewSubmission } from '@/stores/deposit-flow-store';

export type ApiDepositSession = {
  publicId: string;
  amountUsdt: number;
  amountDisplay: string;
  currency: 'USDT';
  network: DepositNetwork | string;
  networkLabel: string;
  walletAddress: string;
  /** Optional multi-network wallets when the API exposes them. */
  walletAddresses?: Partial<Record<DepositNetwork, string>>;
  /** Admin-configured active networks for the Deposit USDT sheet switch. */
  networks?: Array<{
    network: DepositNetwork | string;
    walletAddress: string;
    qrCode: string | null;
    label: string;
    instructions: string;
  }>;
  /** OPEN | FUNDS_CLAIMED | PROOF_SUBMITTED | COMPLETED | REJECTED | EXPIRED | CANCELLED */
  status: string;
  expiresAt: string;
  expiresAtMs: number;
  txid: string | null;
  senderExchange: string | null;
  receiptFileName: string | null;
  receiptMimeType: string | null;
  receiptSizeBytes: number | null;
  hasReceipt: boolean;
  proofSubmittedAt: string | null;
  fundsClaimedAt: string | null;
};

export type DepositStatusPayload = {
  status: {
    depositRequired: boolean;
    unlocked: boolean;
    minAmountUsdt: number;
    currency: 'USDT';
    network: DepositNetwork | string;
    netBalanceUsdt: number;
    activeSession: ApiDepositSession | null;
  };
};

async function requireAccessToken(): Promise<string> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new ApiClientError({
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Your session expired. Please sign in again.',
    });
  }
  return accessToken;
}

/**
 * Rehydrates the "Deposit Under Review" dashboard from the server's
 * PROOF_SUBMITTED session so the screen persists across app restarts /
 * other devices, not just for the tab that performed the local submit.
 * The receipt has no local file `uri` in this case (it lives server-side),
 * so the dashboard falls back to showing the file name instead of a preview.
 */
export function mapApiSessionToUnderReviewSubmission(
  session: ApiDepositSession,
): DepositUnderReviewSubmission {
  return {
    amountUsdt: session.amountUsdt,
    amountDisplay: session.amountDisplay,
    currency: session.currency,
    networkLabel: 'TRC-20 (Tron)',
    txid: session.txid ?? '',
    receipt: {
      uri: '',
      name: session.receiptFileName ?? 'deposit-receipt',
      size: session.receiptSizeBytes ?? 0,
      mimeType: session.receiptMimeType ?? undefined,
    },
    senderExchange: session.senderExchange ?? undefined,
    submittedAtIso:
      session.proofSubmittedAt ?? session.fundsClaimedAt ?? new Date().toISOString(),
    confirmationsDone: 0,
    confirmationsTotal: 19,
    source: 'api',
  };
}

function mapSession(session: ApiDepositSession): DepositPaymentSession {
  const network = normalizeDepositNetwork(session.network);
  const walletAddresses: Partial<Record<DepositNetwork, string>> = {
    ...(session.walletAddresses ?? {}),
    [network]: session.walletAddress,
  };

  const networks =
    session.networks
      ?.map((item) => {
        const itemNetwork = normalizeDepositNetwork(item.network, network);
        const wallet = item.walletAddress.trim();
        if (!wallet) return null;
        walletAddresses[itemNetwork] = wallet;
        return {
          network: itemNetwork,
          walletAddress: wallet,
          qrCode: item.qrCode,
          label: item.label,
          instructions: item.instructions,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null) ?? [];

  return {
    publicId: session.publicId,
    amountUsdt: session.amountUsdt,
    amountDisplay: session.amountDisplay,
    currency: 'USDT',
    network,
    networkLabel:
      session.networkLabel ||
      (network === 'BEP20' ? 'BSC NETWORK' : 'TRON NETWORK'),
    walletAddress: session.walletAddress,
    walletAddresses,
    networks,
    expiresAtMs: session.expiresAtMs || Date.parse(session.expiresAt),
    source: 'api',
  };
}

/** GET /api/v1/customer/deposit/networks */
export async function fetchDepositNetworks() {
  const accessToken = await requireAccessToken();
  return apiRequest<{
    networks: Array<{
      network: DepositNetwork | string;
      walletAddress: string;
      qrCode: string | null;
      label: string;
      instructions: string;
    }>;
  }>('/deposit/networks', {
    method: 'GET',
    accessToken,
  });
}

/** GET /api/v1/customer/deposit/status */
export async function fetchDepositStatus() {
  const accessToken = await requireAccessToken();
  return apiRequest<DepositStatusPayload>('/deposit/status', {
    method: 'GET',
    accessToken,
  });
}

/** POST /api/v1/customer/deposits/sessions */
export async function createDepositSession(): Promise<DepositPaymentSession> {
  const accessToken = await requireAccessToken();
  const data = await apiRequest<{ session: ApiDepositSession }>(
    '/deposits/sessions',
    {
      method: 'POST',
      accessToken,
      body: {},
    },
  );
  return mapSession(data.session);
}

/** POST /api/v1/customer/deposits/sessions/:id/confirm-sent — OPEN → FUNDS_CLAIMED */
export async function confirmDepositFundsSent(session: {
  publicId: string;
  network?: DepositNetwork;
  walletAddress?: string;
  amountUsdt?: number;
}): Promise<DepositPaymentSession> {
  const accessToken = await requireAccessToken();
  const data = await apiRequest<{ session: ApiDepositSession }>(
    `/deposits/sessions/${encodeURIComponent(session.publicId)}/confirm-sent`,
    {
      method: 'POST',
      accessToken,
      body: session.network ? { network: session.network } : {},
    },
  );
  return mapSession(data.session);
}

export type SubmitDepositProofInput = {
  publicId: string;
  txid: string;
  senderExchange?: string;
  receiptUri: string;
  receiptName?: string;
  receiptMimeType?: string;
  receiptSizeBytes?: number;
};

/**
 * POST /api/v1/customer/deposits/sessions/:id/proof
 * Sends TXID + receiptBase64 (PNG/JPG/PDF ≤ 10MB) for admin review.
 * Status → PROOF_SUBMITTED until approve (COMPLETED) / reject (REJECTED).
 */
export async function submitDepositProof(
  input: SubmitDepositProofInput,
): Promise<DepositPaymentSession> {
  const accessToken = await requireAccessToken();

  const receipt = await readReceiptAsBase64(input.receiptUri);
  const mimeType =
    input.receiptMimeType ??
    guessMimeType(input.receiptName) ??
    'image/jpeg';
  const fileName = input.receiptName ?? `deposit-receipt.${extForMime(mimeType)}`;
  const sizeBytes = input.receiptSizeBytes ?? receipt.byteLength;

  if (sizeBytes > DEPOSIT_PROOF_COPY.maxFileBytes) {
    throw new ApiClientError({
      code: 'VALIDATION_ERROR',
      status: 400,
      message: 'Receipt must be a PNG, JPG, or PDF up to 10MB.',
    });
  }

  const data = await apiRequest<{ session: ApiDepositSession }>(
    `/deposits/sessions/${encodeURIComponent(input.publicId)}/proof`,
    {
      method: 'POST',
      accessToken,
      body: {
        txid: input.txid.trim(),
        ...(input.senderExchange?.trim()
          ? { senderExchange: input.senderExchange.trim() }
          : {}),
        receiptFileName: fileName,
        receiptMimeType: mimeType,
        receiptSizeBytes: sizeBytes,
        receiptBase64: receipt.base64,
      },
    },
  );
  return mapSession(data.session);
}

async function readReceiptAsBase64(
  uri: string,
): Promise<{ base64: string; byteLength: number }> {
  try {
    // Native / file:// — prefer expo-file-system.
    if (!uri.startsWith('blob:') && !uri.startsWith('http')) {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && 'size' in info && typeof info.size === 'number') {
        if (info.size > DEPOSIT_PROOF_COPY.maxFileBytes) {
          throw new ApiClientError({
            code: 'VALIDATION_ERROR',
            status: 400,
            message: 'Receipt must be a PNG, JPG, or PDF up to 10MB.',
          });
        }
      }

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const byteLength = Math.floor((base64.length * 3) / 4);
      if (byteLength > DEPOSIT_PROOF_COPY.maxFileBytes) {
        throw new ApiClientError({
          code: 'VALIDATION_ERROR',
          status: 400,
          message: 'Receipt must be a PNG, JPG, or PDF up to 10MB.',
        });
      }
      return { base64, byteLength };
    }

    // Expo web / blob: URIs — FileSystem often cannot read these.
    const response = await fetch(uri);
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > DEPOSIT_PROOF_COPY.maxFileBytes) {
      throw new ApiClientError({
        code: 'VALIDATION_ERROR',
        status: 400,
        message: 'Receipt must be a PNG, JPG, or PDF up to 10MB.',
      });
    }
    return {
      base64: uint8ToBase64(new Uint8Array(buffer)),
      byteLength: buffer.byteLength,
    };
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError({
      code: 'VALIDATION_ERROR',
      status: 400,
      message: 'Unable to read the receipt file. Try another screenshot.',
    });
  }
}

function uint8ToBase64(bytes: Uint8Array): string {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    const triplet = (a << 16) | (b << 8) | c;
    output += alphabet[(triplet >> 18) & 63];
    output += alphabet[(triplet >> 12) & 63];
    output +=
      i + 1 < bytes.length ? alphabet[(triplet >> 6) & 63] : '=';
    output += i + 2 < bytes.length ? alphabet[triplet & 63] : '=';
  }
  return output;
}

function guessMimeType(name?: string): string | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return undefined;
}

function extForMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'application/pdf') return 'pdf';
  return 'jpg';
}
