import { apiRequest, apiRequestEnvelope } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/errors';
import { getAccessToken } from '@/lib/auth/secure-tokens';
import {
  providerLabel,
  providerMatchesKind,
  providerSupports,
} from '@/features/accounts/lib/providers';

import type {
  AccountChannel,
  AccountChannelState,
  AccountDetails,
  AccountKind,
  AccountListQuery,
  AccountListStatus,
  AccountsPage,
  AccountsSummary,
  ChannelActivationStatus,
  ChannelFilter,
  ConnectivityStatus,
  ReceivingAccount,
} from '@/features/accounts/types';

/**
 * Customer payment accounts.
 * /api/v1/customer/accounts
 * Ownership, rails, limits, and totals come from the API. This module maps
 * the envelope and never sends server-controlled fields.
 */

const PUBLIC_ID = /^[a-z]{2,12}_[A-Za-z0-9]+$/;

const ACCOUNT_STATUS = new Set([
  'PENDING',
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'DISCONNECTED',
]);

const STATUS_QUERY: Record<AccountListStatus, string> = {
  active: 'ACTIVE',
  inactive: 'INACTIVE',
  suspended: 'SUSPENDED',
  pending: 'PENDING',
  disconnected: 'DISCONNECTED',
};

const CHANNEL_QUERY: Record<ChannelFilter, string> = {
  active: 'ACTIVE',
  inactive: 'INACTIVE',
};

const CONNECTIVITY_QUERY: Record<ConnectivityStatus, string> = {
  connected: 'CONNECTED',
  disconnected: 'DISCONNECTED',
  connecting: 'CONNECTING',
  error: 'ERROR',
};

const VERIFICATION_QUERY: Record<string, string> = {
  verified: 'VERIFIED',
  pending: 'PENDING',
  rejected: 'REJECTED',
};

function loadError(message = 'Unable to load accounts. Please try again.'): never {
  throw new ApiClientError({
    code: 'UNKNOWN',
    message,
    status: 502,
  });
}

async function requireAccessToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new ApiClientError({
      code: 'UNAUTHORIZED',
      message: 'Your session expired. Please sign in again.',
      status: 401,
    });
  }
  return token;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readBool(record: Record<string, unknown>, key: string): boolean | null {
  const value = record[key];
  if (typeof value === 'boolean') return value;
  const nested = asRecord(value);
  if (!nested) return null;
  const supported = nested.supported ?? nested.eligible ?? nested.enabled;
  return typeof supported === 'boolean' ? supported : null;
}

/**
 * Provider catalog decides whether a rail exists. A false API capability
 * only means that rail is not the active one, so PayIn must stay usable
 * when the provider accepts PayIn.
 */
function railSupported(
  providerCode: string,
  channel: 'payin' | 'payout',
  apiFlag: boolean | null,
): boolean | null {
  const catalog = providerSupports(providerCode, channel);
  if (catalog != null) return catalog;
  return apiFlag;
}

function readInt(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  return value;
}

function readPublicId(value: unknown): string | null {
  if (typeof value !== 'string' || !PUBLIC_ID.test(value)) return null;
  return value;
}

function accountPath(publicId: string): string {
  const id = readPublicId(publicId);
  if (!id) {
    throw new ApiClientError({
      code: 'VALIDATION_ERROR',
      message: 'That account could not be found.',
      status: 400,
    });
  }
  return `/accounts/${encodeURIComponent(id)}`;
}

function mapKind(value: unknown): AccountKind {
  return value === 'GATEWAY' ? 'gateway' : 'upi_bank';
}

function mapConnectivity(value: unknown): ConnectivityStatus {
  switch (typeof value === 'string' ? value.trim().toUpperCase() : '') {
    case 'CONNECTED':
      return 'connected';
    case 'CONNECTING':
      return 'connecting';
    case 'ERROR':
      return 'error';
    default:
      return 'disconnected';
  }
}

function mapRail(
  statusRaw: string | null,
  supported: boolean | null,
  accountStatus: string,
  unsupportedReason: string,
): AccountChannelState {
  const active = statusRaw === 'ACTIVE';
  if (supported === false) {
    return {
      status: 'NOT_ELIGIBLE',
      canActivate: false,
      canDeactivate: false,
      unavailableReason: unsupportedReason,
    };
  }
  if (accountStatus === 'SUSPENDED') {
    return {
      status: active ? 'ACTIVE' : 'SUSPENDED',
      canActivate: false,
      canDeactivate: active,
      unavailableReason: 'Suspended accounts cannot be activated.',
    };
  }
  const status: ChannelActivationStatus = active ? 'ACTIVE' : 'INACTIVE';
  return {
    status,
    canActivate: !active,
    canDeactivate: active,
    unavailableReason: null,
  };
}

function mapAccount(value: unknown): ReceivingAccount | null {
  const record = asRecord(value);
  if (!record) return null;
  const publicId = readPublicId(record.id);
  const name = readString(record, 'name');
  if (!publicId || !name) return null;

  const providerCode = readString(record, 'provider') ?? '';
  const metrics = asRecord(record.metrics);
  const capabilities = asRecord(record.capabilities);
  const payinFromApi = capabilities ? readBool(capabilities, 'payin') : null;
  const payoutFromApi = capabilities ? readBool(capabilities, 'payout') : null;
  const payinSupported = railSupported(providerCode, 'payin', payinFromApi);
  const payoutSupported = railSupported(providerCode, 'payout', payoutFromApi);
  const accountStatus = readString(record, 'status') ?? '';
  const status = ACCOUNT_STATUS.has(accountStatus) ? accountStatus : null;

  const upiId = readString(record, 'upiId');
  const gateway = asRecord(record.gatewayDetails);
  const merchantId = gateway ? readString(gateway, 'merchantId') : null;
  const bank = asRecord(record.bankDetails);
  const maskedNumber = bank ? readString(bank, 'accountNumber') : null;

  let identifier: string | null = null;
  let identifierLabel = 'Account';
  let canCopyIdentifier = false;
  if (upiId) {
    identifier = upiId;
    identifierLabel = 'UPI ID';
    canCopyIdentifier = true;
  } else if (merchantId) {
    identifier = merchantId;
    identifierLabel = 'Merchant ID';
    canCopyIdentifier = true;
  } else if (maskedNumber) {
    identifier = maskedNumber;
    identifierLabel = 'Account';
  }

  const connectivity = mapConnectivity(record.connectivityStatus);
  const limit =
    (metrics ? readInt(metrics, 'transactionLimit') : null) ??
    readInt(record, 'transactionLimit');

  return {
    publicId,
    name,
    provider: providerCode ? providerLabel(providerCode) : '',
    providerCode,
    kind: mapKind(record.type),
    identifier,
    identifierLabel,
    phone: readString(record, 'phone'),
    totalReceivedMinor: metrics ? readInt(metrics, 'totalReceived') : null,
    currency: 'INR',
    acceptedTransactionCount: metrics ? readInt(metrics, 'acceptedTransactions') : null,
    transactionLimit: limit,
    conversionPercent: metrics ? readInt(metrics, 'conversionRate') : null,
    conversionSuccessful: metrics ? readInt(metrics, 'conversionNumerator') : null,
    conversionEligible: metrics ? readInt(metrics, 'conversionDenominator') : null,
    workState: status || null,
    connectivity,
    verificationStatus: readString(record, 'verificationStatus'),
    verificationMessage: null,
    payin: mapRail(
      readString(record, 'payinStatus'),
      payinSupported,
      accountStatus,
      'This account does not support PayIn.',
    ),
    payout: mapRail(
      readString(record, 'payoutStatus'),
      payoutSupported,
      accountStatus,
      'This account does not support PayOut.',
    ),
    canCopyIdentifier,
    canReconnect:
      accountStatus !== 'SUSPENDED' &&
      (connectivity === 'disconnected' || connectivity === 'error'),
  };
}

function mapSummary(
  value: unknown,
  accounts: ReceivingAccount[],
): AccountsSummary | null {
  const record = asRecord(value);
  if (!record) return null;
  const total = readInt(record, 'total');
  const inWork = readInt(record, 'inWork');
  const active = readInt(record, 'active');
  const inactive = readInt(record, 'inactive');
  if (total == null || inWork == null || active == null || inactive == null) {
    return null;
  }

  const nameFor = (id: string | null) => {
    if (!id) return null;
    const match = accounts.find((account) => account.publicId === id);
    return { publicId: id, name: match?.name ?? id };
  };

  return {
    total,
    inWork,
    inWorkPercent: total > 0 ? Math.round((inWork / total) * 100) : 0,
    activePayin: nameFor(readPublicId(record.payinActiveAccountId)),
    activePayout: nameFor(readPublicId(record.payoutActiveAccountId)),
    counts: { all: total, active, inactive },
    providers: [],
  };
}

function mapPageMeta(pagination: unknown, meta: unknown) {
  const record = asRecord(pagination) ?? asRecord(meta);
  if (!record) loadError();
  const page = readInt(record, 'page') ?? 1;
  const limit = readInt(record, 'limit');
  const total = readInt(record, 'total');
  const totalPages = readInt(record, 'totalPages');
  if (limit == null || total == null || totalPages == null) loadError();
  const nextCursor = readString(record, 'nextCursor');
  return { page, limit, total, totalPages, nextCursor };
}

function listQueryString(query: AccountListQuery): string {
  const params = new URLSearchParams();
  params.set('type', query.kind === 'gateway' ? 'GATEWAY' : 'UPI_BANK');
  params.set('limit', String(query.limit));
  params.set('sort', 'createdAt');
  params.set('order', 'desc');
  if (query.cursor) {
    params.set('cursor', query.cursor);
  } else {
    params.set('page', String(query.page ?? 1));
  }

  const search = query.search?.trim().slice(0, 80);
  const optional: [string, string | undefined][] = [
    ['search', search || undefined],
    ['status', query.status ? STATUS_QUERY[query.status] : undefined],
    ['provider', query.provider],
    ['payinStatus', query.payinStatus ? CHANNEL_QUERY[query.payinStatus] : undefined],
    ['payoutStatus', query.payoutStatus ? CHANNEL_QUERY[query.payoutStatus] : undefined],
    [
      'connectivityStatus',
      query.connectivity ? CONNECTIVITY_QUERY[query.connectivity] : undefined,
    ],
    [
      'verificationStatus',
      query.verification ? VERIFICATION_QUERY[query.verification] : undefined,
    ],
  ];
  for (const [key, value] of optional) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

export async function fetchCustomerAccounts(
  query: AccountListQuery,
): Promise<AccountsPage> {
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>(
    `/accounts?${listQueryString(query)}`,
    { method: 'GET', accessToken },
  );
  const root = asRecord(envelope.data);
  const rawItems = root?.accounts;
  if (!Array.isArray(rawItems)) loadError();
  const items = rawItems
    .map(mapAccount)
    .filter((item): item is ReceivingAccount => item !== null);
  const page = mapPageMeta(root?.pagination, envelope.meta);
  return {
    items,
    summary: mapSummary(root?.summary, items),
    ...page,
  };
}

export async function fetchAccountDetails(publicId: string): Promise<AccountDetails> {
  const accessToken = await requireAccessToken();
  const data = await apiRequest<unknown>(accountPath(publicId), {
    method: 'GET',
    accessToken,
  });
  const root = asRecord(data);
  const account = mapAccount(root?.account ?? data);
  if (!account) {
    throw new ApiClientError({
      code: 'UNKNOWN',
      message: 'Unable to load account details. Please try again.',
      status: 502,
    });
  }
  return { account, recentTransactions: [], activationHistory: [] };
}

function readField(fields: Record<string, string>, key: string): string {
  const value = fields[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readLimit(fields: Record<string, string>): number | undefined {
  const raw = readField(fields, 'transactionLimit');
  if (!raw) return undefined;
  if (!/^\d+$/.test(raw)) {
    throw new ApiClientError({
      code: 'VALIDATION_ERROR',
      message: 'Enter a whole number of paise.',
      status: 400,
    });
  }
  return Number(raw);
}

export async function createCustomerAccount(input: {
  kind: AccountKind;
  fields: Record<string, string>;
}): Promise<ReceivingAccount> {
  const provider = readField(input.fields, 'provider');
  if (!providerMatchesKind(provider, input.kind)) {
    throw new ApiClientError({
      code: 'VALIDATION_ERROR',
      message: 'Select a provider for this account type.',
      status: 400,
    });
  }

  const transactionLimit = readLimit(input.fields);
  const body: Record<string, unknown> = {
    name: readField(input.fields, 'name'),
    type: input.kind === 'gateway' ? 'GATEWAY' : 'UPI_BANK',
    provider,
  };
  if (transactionLimit !== undefined) body.transactionLimit = transactionLimit;

  if (input.kind === 'gateway') {
    const gatewayDetails: Record<string, string> = {
      merchantId: readField(input.fields, 'merchantId'),
    };
    const displayName = readField(input.fields, 'displayName');
    if (displayName) gatewayDetails.displayName = displayName;
    body.gatewayDetails = gatewayDetails;
  } else {
    body.upiId = readField(input.fields, 'upiId').toLowerCase();
    const phone = readField(input.fields, 'phone');
    if (phone) body.phone = phone;
    const accountHolderName = readField(input.fields, 'accountHolderName');
    const accountNumber = readField(input.fields, 'accountNumber');
    const ifsc = readField(input.fields, 'ifsc');
    const bankName = readField(input.fields, 'bankName');
    if (accountHolderName || accountNumber || ifsc || bankName) {
      body.bankDetails = { accountHolderName, accountNumber, ifsc, bankName };
    }
  }

  const accessToken = await requireAccessToken();
  const data = await apiRequest<unknown>('/accounts', {
    method: 'POST',
    accessToken,
    body,
  });
  const account = mapAccount(asRecord(data)?.account ?? data);
  if (!account) {
    throw new ApiClientError({
      code: 'UNKNOWN',
      message: 'Unable to add this account. Please try again.',
      status: 502,
    });
  }
  return account;
}

async function postRail(
  publicId: string,
  action:
    | 'activate-payin'
    | 'activate-payout'
    | 'deactivate-payin'
    | 'deactivate-payout',
): Promise<void> {
  const accessToken = await requireAccessToken();
  await apiRequest<unknown>(`${accountPath(publicId)}/${action}`, {
    method: 'POST',
    accessToken,
    body: {},
  });
}

export async function activateAccountChannel(
  publicId: string,
  channel: AccountChannel,
): Promise<void> {
  await postRail(
    publicId,
    channel === 'payin' ? 'activate-payin' : 'activate-payout',
  );
}

export async function deactivateAccountChannel(
  publicId: string,
  channel: AccountChannel,
): Promise<void> {
  await postRail(
    publicId,
    channel === 'payin' ? 'deactivate-payin' : 'deactivate-payout',
  );
}

export async function reconnectAccount(publicId: string): Promise<void> {
  const accessToken = await requireAccessToken();
  await apiRequest<unknown>(`${accountPath(publicId)}/reconnect`, {
    method: 'POST',
    accessToken,
    body: {},
  });
}

export async function deleteCustomerAccount(publicId: string): Promise<void> {
  const accessToken = await requireAccessToken();
  await apiRequest<unknown>(accountPath(publicId), {
    method: 'DELETE',
    accessToken,
  });
}
