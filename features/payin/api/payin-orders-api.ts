import { apiRequestEnvelope } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/errors';
import { getAccessToken } from '@/lib/auth/secure-tokens';

import { isHttpsUrl } from '@/features/payin/lib/format';
import type {
  DisputeReason,
  OcrStatus,
  PayinListQuery,
  PayinListTotals,
  PayinOrderCounts,
  PayinOrderDetail,
  PayinOrderListItem,
  PayinOrderStatus,
  PayinOrdersPage,
  PayinPaymentInstruction,
  PayinReleaseStatus,
  PayinSummaryStatus,
  PayinTimelineEvent,
  PayinVerification,
  PaymentSlip,
  SmsEvidenceInput,
  SmsEvidenceResult,
  VerificationCheck,
  VerificationCheckStatus,
  VerificationStatus,
} from '@/features/payin/types';
import {
  CHECK_STATUSES,
  DISPUTE_REASONS,
  OCR_STATUSES,
  PAYIN_ORDER_STATUSES,
  PAYIN_SUMMARY_STATUSES,
  VERIFICATION_STATUSES,
} from '@/features/payin/types';

/**
 * Customer PayIn orders.
 * /api/v1/customer/payin-orders
 * Amounts are integer minor units. Release eligibility, verification, and
 * collateral state are copied from the server. This module never sends
 * verified, releaseEligible, or paymentStatus.
 */

const ORDER_ID = /^pio_[A-Za-z0-9]+$/;
const ORDER_NUMBER = /^[A-Za-z0-9-]{4,40}$/;
const MONGO_ID = /^[a-f0-9]{24}$/i;
const ORDER_STATUS = new Set<string>(PAYIN_ORDER_STATUSES);
const VERIFICATION = new Set<string>(VERIFICATION_STATUSES);
const OCR = new Set<string>(OCR_STATUSES);
const CHECK = new Set<string>(CHECK_STATUSES);
const DISPUTE = new Set<string>(DISPUTE_REASONS);
const OPEN_DISPUTE = new Set(['OPEN', 'UNDER_REVIEW']);

const SUMMARY_MATCH: Record<PayinSummaryStatus, readonly PayinOrderStatus[]> = {
  pending: ['PENDING_PAYMENT'],
  processing: [
    'PAYMENT_DETECTED',
    'PENDING_VERIFICATION',
    'VERIFIED',
    'RELEASE_PENDING',
    'RELEASING',
  ],
  completed: ['COMPLETED'],
  failed: ['FAILED', 'CANCELLED'],
  disputed: ['DISPUTED'],
  expired: ['EXPIRED'],
};

const ACTION_REQUIRED = new Set<PayinOrderStatus>([
  'PENDING_VERIFICATION',
  'VERIFIED',
  'RELEASE_PENDING',
]);

const CHECK_TITLE: Record<string, string> = {
  AMOUNT_MATCH: 'Amount match',
  UTR_MATCH: 'UTR match',
  MERCHANT_ACCOUNT_MATCH: 'Merchant account match',
  TIMESTAMP_VALID: 'Timestamp',
  DIRECTION_VALID: 'Direction',
  OCR_RECEIPT_MATCH: 'Receipt OCR',
  SMS_EVIDENCE_MATCH: 'SMS evidence',
  BANK_LEDGER_MATCH: 'Bank ledger',
};

function loadError(message: string): never {
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

function readString(record: Record<string, unknown> | null, key: string): string | null {
  if (!record) return null;
  const value = record[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readBool(record: Record<string, unknown> | null, key: string): boolean | null {
  if (!record) return null;
  const value = record[key];
  return typeof value === 'boolean' ? value : null;
}

function readInt(record: Record<string, unknown> | null, key: string): number | null {
  if (!record) return null;
  const value = record[key];
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  return value;
}

function readMinor(record: Record<string, unknown> | null, keys: string[]): number | null {
  for (const key of keys) {
    const value = readInt(record, key);
    if (value != null && value >= 0) return value;
  }
  return null;
}

function readIso(record: Record<string, unknown> | null, key: string): string | null {
  const value = readString(record, key);
  if (!value || Number.isNaN(Date.parse(value))) return null;
  return value;
}

export function isPayinOrderId(value: string | null | undefined): value is string {
  return typeof value === 'string' && ORDER_ID.test(value);
}

function orderPath(orderId: string): string {
  if (!isPayinOrderId(orderId)) {
    throw new ApiClientError({
      code: 'VALIDATION_ERROR',
      message: 'That PayIn order could not be found.',
      status: 400,
    });
  }
  return `/payin-orders/${encodeURIComponent(orderId)}`;
}

const STATUS_ALIAS: Record<string, PayinOrderStatus> = {
  SUCCESS: 'COMPLETED',
  SUCCESSFUL: 'COMPLETED',
  REVIEW: 'PENDING_VERIFICATION',
  IN_REVIEW: 'PENDING_VERIFICATION',
};

function readStatus(value: string | null): PayinOrderStatus | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (ORDER_STATUS.has(normalized)) return normalized as PayinOrderStatus;
  return STATUS_ALIAS[normalized] ?? null;
}

function readVerificationStatus(value: string | null): VerificationStatus | null {
  if (!value || !VERIFICATION.has(value)) return null;
  return value as VerificationStatus;
}

function emptyCounts(): PayinOrderCounts {
  return {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    disputed: 0,
    expired: 0,
  };
}

function fallbackMeta(
  itemCount: number,
  limit: number,
): Pick<PayinOrdersPage, 'page' | 'limit' | 'total' | 'totalPages' | 'nextCursor' | 'hasMore'> {
  return {
    page: 1,
    limit,
    total: itemCount,
    totalPages: itemCount > 0 ? 1 : 0,
    nextCursor: null,
    hasMore: false,
  };
}

function mapSummary(value: unknown): PayinOrderCounts | null {
  const record = asRecord(value);
  if (!record) return null;
  const counts = {} as PayinOrderCounts;
  for (const bucket of PAYIN_SUMMARY_STATUSES) {
    const direct = readInt(record, bucket);
    if (direct != null && direct >= 0) {
      counts[bucket] = direct;
      continue;
    }
    let sum = 0;
    let saw = false;
    for (const status of SUMMARY_MATCH[bucket]) {
      const count = readInt(record, status);
      if (count == null) continue;
      if (count < 0) return null;
      saw = true;
      sum += count;
    }
    counts[bucket] = saw ? sum : 0;
  }
  return counts;
}

function mapTotals(value: unknown, currencyFallback: string | null): PayinListTotals {
  const record = asRecord(value);
  const amounts = asRecord(record?.amounts) ?? record;
  return {
    todayAmountMinor: readMinor(amounts, [
      'todayAmountMinor',
      'todayPayinAmountMinor',
      'todayTotalMinor',
    ]),
    totalAmountMinor: readMinor(amounts, [
      'totalAmountMinor',
      'totalPayinAmountMinor',
      'lifetimeAmountMinor',
    ]),
    currency: readString(amounts, 'currency') ?? currencyFallback,
  };
}

function mapInstructions(value: unknown): PayinPaymentInstruction[] {
  if (!Array.isArray(value)) {
    const text = typeof value === 'string' ? value.trim() : '';
    return text ? [{ title: null, body: text }] : [];
  }
  return value
    .map((item) => {
      if (typeof item === 'string' && item.trim()) return { title: null, body: item.trim() };
      const record = asRecord(item);
      const body = readString(record, 'body') ?? readString(record, 'text') ?? readString(record, 'instruction');
      if (!body) return null;
      return { title: readString(record, 'title') ?? readString(record, 'label'), body };
    })
    .filter((item): item is PayinPaymentInstruction => item !== null);
}

function mapTimeline(value: unknown): PayinTimelineEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = asRecord(item);
      const key =
        readString(record, 'key') ??
        readString(record, 'type') ??
        readString(record, 'event') ??
        readString(record, 'id');
      const label =
        readString(record, 'label') ??
        readString(record, 'title') ??
        readString(record, 'name') ??
        key;
      if (!key || !label) return null;
      return {
        key,
        label,
        at: readIso(record, 'at') ?? readIso(record, 'occurredAt') ?? readIso(record, 'timestamp'),
      };
    })
    .filter((item): item is PayinTimelineEvent => item !== null);
}

function mapMeta(meta: unknown): Pick<
  PayinOrdersPage,
  'page' | 'limit' | 'total' | 'totalPages' | 'nextCursor' | 'hasMore'
> | null {
  const record = asRecord(meta);
  if (!record) return null;
  const page = readInt(record, 'page') ?? 1;
  const limit = readInt(record, 'limit') ?? 20;
  const total = readInt(record, 'total') ?? 0;
  const totalPages = readInt(record, 'totalPages') ?? 0;
  const nextCursor = readString(record, 'nextCursor');
  if (page < 1 || limit < 1 || total < 0 || totalPages < 0) return null;
  return {
    page,
    limit,
    total,
    totalPages,
    nextCursor,
    hasMore: Boolean(nextCursor) || page < totalPages,
  };
}

function shortOrderId(publicId: string): string {
  const compact = publicId.replace(/^pio_/, '');
  if (compact.length <= 12) return compact;
  return `${compact.slice(0, 4)}…${compact.slice(-4)}`;
}

function mapListItem(value: unknown, serverTime: string | null): PayinOrderListItem | null {
  const record = asRecord(value);
  if (!record) return null;
  const publicId = readString(record, 'id') ?? readString(record, 'publicId') ?? readString(record, 'orderId');
  const rawDisplay = (readString(record, 'orderNumber') ?? readString(record, 'displayId'))?.replace(
    /^#/,
    '',
  );
  const status = readStatus(readString(record, 'status') ?? readString(record, 'orderStatus'));
  const createdAt = readIso(record, 'createdAt') ?? readIso(record, 'created_at') ?? '';
  const expiresAt = readIso(record, 'expiresAt') ?? createdAt;
  const amountMinor = readMinor(record, [
    'amountMinor',
    'expectedInboundAmountMinor',
    'expectedInboundAmount',
    'amount',
  ]);
  const currency = readString(record, 'currency') ?? 'INR';
  const remitter = asRecord(record.remitter);
  const merchant = asRecord(record.merchantAccount) ?? asRecord(record.account) ?? asRecord(record.receivingAccount);
  const remitterName =
    readString(remitter, 'name') ??
    readString(record, 'remitterName') ??
    readString(merchant, 'name') ??
    readString(record, 'accountName') ??
    '—';
  const verification = asRecord(record.verification);
  const verificationStatus =
    readVerificationStatus(readString(record, 'verificationStatus')) ??
    readVerificationStatus(readString(verification, 'overallStatus')) ??
    'PENDING';
  const smsRaw = readBool(record, 'smsReceived') ?? readBool(verification, 'smsReceived');
  if (
    !publicId ||
    MONGO_ID.test(publicId) ||
    publicId.length < 4 ||
    publicId.length > 64 ||
    !status ||
    !expiresAt ||
    amountMinor == null
  ) {
    return null;
  }
  const displayId =
    rawDisplay && ORDER_NUMBER.test(rawDisplay) && !MONGO_ID.test(rawDisplay)
      ? rawDisplay
      : shortOrderId(publicId);
  return {
    publicId,
    displayId,
    status,
    expiresAt,
    serverTime: readIso(record, 'serverNow') ?? readIso(record, 'serverTime') ?? serverTime,
    transactionType: readString(record, 'transactionType') ?? 'PAYIN',
    expectedInboundAmountMinor: amountMinor,
    currency,
    remitterName,
    utr: readString(record, 'utr') ?? readString(record, 'upiRef'),
    assignedAccountLabel:
      readString(merchant, 'name') ??
      readString(record, 'assignedAccountLabel') ??
      readString(record, 'accountName'),
    assignedAccountId:
      readString(merchant, 'id') ??
      readString(merchant, 'publicId') ??
      readString(record, 'assignedAccountId'),
    paymentMethod:
      readString(record, 'paymentMethod') ??
      readString(record, 'method') ??
      readString(merchant, 'provider') ??
      readString(record, 'bank'),
    createdAt,
    verificationStatus,
    actionRequired:
      readBool(record, 'actionRequired') === true || ACTION_REQUIRED.has(status),
    earningMinor: readMinor(record, ['traderEarningMinor', 'earningMinor', 'earnedMinor', 'commissionMinor']),
    accountPhone:
      readString(merchant, 'phone') ??
      readString(record, 'phone') ??
      readString(remitter, 'phone'),
    bankLabel:
      readString(record, 'bank') ??
      readString(merchant, 'bank') ??
      readString(merchant, 'provider') ??
      readString(record, 'provider'),
    smsReceived: smsRaw,
    matchNote:
      readString(record, 'matchNote') ??
      readString(record, 'matchedBy') ??
      readString(verification, 'source'),
  };
}

function mapCheck(value: unknown): VerificationCheck | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = readString(record, 'id');
  const type = readString(record, 'type');
  const status = readString(record, 'status');
  if (!id || !type || !status || !CHECK.has(status)) return null;
  const expected = readInt(record, 'expected');
  const observed = readInt(record, 'observed');
  const details =
    expected != null && observed != null ? `expected ${expected} · observed ${observed}` : null;
  return {
    id,
    type,
    title: readString(record, 'title') ?? CHECK_TITLE[type] ?? type,
    status: status as VerificationCheckStatus,
    details: readString(record, 'details') ?? details,
    verifiedAt: readIso(record, 'verifiedAt'),
    source: readString(record, 'source'),
  };
}

function mapChecks(value: unknown): VerificationCheck[] {
  if (!Array.isArray(value)) return [];
  return value.map(mapCheck).filter((item): item is VerificationCheck => item !== null);
}

function mapRealtime(value: unknown) {
  const record = asRecord(value);
  const socketUrl = readString(record, 'socketUrl');
  const safeSocket = socketUrl?.startsWith('wss://') ? socketUrl : null;
  const mode = readString(record, 'mode') === 'websocket' && safeSocket ? 'websocket' : 'poll';
  return { mode, socketUrl: safeSocket } as const;
}

function mapDetail(data: unknown): PayinOrderDetail | null {
  const root = asRecord(data);
  if (!root) return null;
  const order = asRecord(root.order) ?? root;
  const serverNow =
    readIso(root, 'serverNow') ?? readIso(root, 'serverTime') ?? readIso(order, 'serverNow');
  const base = mapListItem(order, serverNow);
  if (!base) return null;
  const verification = asRecord(root.verification) ?? asRecord(order.verification);
  const checks = mapChecks(verification?.checks);
  const overall =
    readVerificationStatus(readString(verification, 'overallStatus')) ?? base.verificationStatus;
  const verifiedCount = readInt(verification, 'verifiedCount') ?? checks.filter((item) => item.status === 'VERIFIED').length;
  const totalChecks = readInt(verification, 'totalChecks') ?? checks.length;
  const eligibility = asRecord(root.releaseEligibility) ?? asRecord(order.releaseEligibility);
  const eligible = readBool(eligibility, 'eligible') ?? readBool(eligibility, 'canRelease');
  if (eligible == null) return null;
  const reasonsRaw = eligibility?.reasons;
  const reasons = Array.isArray(reasonsRaw)
    ? reasonsRaw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  const collateralRecord = asRecord(root.collateral) ?? asRecord(order.collateral);
  let collateral: PayinOrderDetail['collateral'] = null;
  if (collateralRecord) {
    const amountMinor = readMinor(collateralRecord, ['amountMinor', 'collateralAmount']);
    const currency = readString(collateralRecord, 'currency');
    const status = readString(collateralRecord, 'status');
    if (amountMinor == null || !currency || !status) return null;
    collateral = {
      amountMinor,
      currency,
      status,
      releaseEligibility:
        readBool(collateralRecord, 'releaseEligibility') == null
          ? null
          : String(readBool(collateralRecord, 'releaseEligibility')),
      message: readString(collateralRecord, 'message'),
    };
  }
  const receiptRecord = root.receipt === null ? null : asRecord(root.receipt) ?? asRecord(order.receipt);
  const ocrRaw = readString(receiptRecord, 'ocrStatus');
  const ocrStatus: OcrStatus =
    ocrRaw && OCR.has(ocrRaw) ? (ocrRaw as OcrStatus) : receiptRecord ? 'PROCESSING' : 'NO_RECEIPT';
  const confidence = receiptRecord?.ocrConfidence;
  const ocrConfidence =
    typeof confidence === 'number' && Number.isFinite(confidence) && confidence >= 0 && confidence <= 100
      ? confidence
      : null;
  const imageUrl = readString(receiptRecord, 'imageUrl');
  const remitter = asRecord(order.remitter);
  const merchant = asRecord(root.merchantAccount) ?? asRecord(order.merchantAccount);
  const dispute = asRecord(root.dispute);
  const disputeStatus = readString(dispute, 'status');
  const commission = order.commissionPercentage;
  const feeMinor = readMinor(order, ['feeMinor', 'payinFeeMinor']) ?? readMinor(root, ['feeMinor']);
  const netAmountMinor = readMinor(order, ['netAmountMinor', 'netMinor']) ?? readMinor(root, ['netAmountMinor']);
  return {
    ...base,
    serverTime: serverNow,
    verificationStatus: overall,
    tier: readString(order, 'tier'),
    traderEarningMinor: readMinor(order, ['traderEarningMinor', 'traderEarning']),
    traderCommissionPercentage:
      typeof commission === 'number' && Number.isFinite(commission) && commission >= 0 && commission <= 100
        ? commission
        : null,
    feeMinor,
    netAmountMinor,
    remitterVerified: readBool(remitter, 'verified') === true,
    remitterPhone: readString(remitter, 'phone'),
    merchantProvider: readString(merchant, 'provider'),
    merchantVirtualAddress: readString(merchant, 'upiId'),
    assignedAccountName: readString(merchant, 'name'),
    assignedAccountType: readString(merchant, 'type') ?? readString(merchant, 'kind') ?? readString(merchant, 'accountType'),
    assignedAccountStatus: readString(merchant, 'status') ?? readString(merchant, 'activationStatus'),
    assignedAccountConnectivity: readString(merchant, 'connectivity'),
    assignedAccountMasked:
      readString(merchant, 'maskedIdentifier') ??
      readString(merchant, 'identifier') ??
      readString(merchant, 'upiId'),
    paymentInstructions: mapInstructions(
      root.paymentInstructions ?? order.paymentInstructions ?? root.instructions ?? order.instructions,
    ),
    timeline: mapTimeline(root.timeline ?? order.timeline ?? root.events ?? order.events),
    failureReason:
      readString(order, 'failureReason') ??
      readString(root, 'failureReason') ??
      readString(asRecord(root.failure), 'reason') ??
      readString(asRecord(order.failure), 'reason'),
    completedAt: readIso(order, 'completedAt') ?? readIso(root, 'completedAt'),
    ocrStatus,
    ocrConfidence,
    receipt: receiptRecord
      ? {
          statusLabel: readString(receiptRecord, 'statusLabel'),
          payeeName: readString(receiptRecord, 'payeeName'),
          payeeDetail: readString(receiptRecord, 'payeeDetail'),
          settlementLabel: readString(receiptRecord, 'settlementLabel'),
          amountMinor: readMinor(receiptRecord, ['amountMinor', 'amount']),
          currency: readString(receiptRecord, 'currency'),
          upiRef: readString(receiptRecord, 'upiRef') ?? readString(receiptRecord, 'utr'),
          fromAccount: readString(receiptRecord, 'fromAccount'),
          timestamp: readIso(receiptRecord, 'timestamp'),
          previewUrl: null,
          fullImageUrl: isHttpsUrl(imageUrl) ? imageUrl : null,
        }
      : null,
    verificationChecks: checks,
    verifiedCount,
    totalChecks,
    collateral,
    releaseEligibility: { canRelease: eligible, reasons },
    releaseStatus: readString(order, 'releaseStatus'),
    transactionId: readString(order, 'transactionId'),
    disputeOpen: disputeStatus != null && OPEN_DISPUTE.has(disputeStatus),
    realtime: mapRealtime(root.realtime ?? order.realtime),
  };
}

function mapVerification(data: unknown): PayinVerification | null {
  const root = asRecord(data);
  const record = asRecord(root?.verification) ?? root;
  if (!record) return null;
  const overallStatus = readVerificationStatus(readString(record, 'overallStatus'));
  if (!overallStatus) return null;
  const checks = mapChecks(record.checks);
  const verifiedCount = readInt(record, 'verifiedCount') ?? checks.filter((item) => item.status === 'VERIFIED').length;
  const totalChecks = readInt(record, 'totalChecks') ?? checks.length;
  const remaining = readInt(record, 'remainingChecks');
  return {
    overallStatus,
    checks,
    verifiedCount,
    totalChecks,
    remainingChecks: remaining ?? Math.max(0, totalChecks - verifiedCount),
  };
}

export async function fetchPayinOrders(query: PayinListQuery): Promise<PayinOrdersPage> {
  const accessToken = await requireAccessToken();
  const params = new URLSearchParams();
  params.set('limit', String(query.limit ?? 20));
  if (query.cursor) params.set('cursor', query.cursor);
  else if (query.page != null) params.set('page', String(query.page));
  if (query.status && ORDER_STATUS.has(query.status)) params.set('status', query.status);
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.dateFrom) params.set('dateFrom', query.dateFrom);
  if (query.dateTo) params.set('dateTo', query.dateTo);
  const envelope = await apiRequestEnvelope<unknown>(`/payin-orders?${params.toString()}`, {
    method: 'GET',
    accessToken,
  });
  const root = asRecord(envelope.data);
  const rawItems = Array.isArray(envelope.data)
    ? envelope.data
    : root?.items ?? root?.orders ?? root?.payinOrders;
  if (!Array.isArray(rawItems)) {
    loadError('Unable to load PayIn orders. Please try again.');
  }
  const serverTime = readIso(root, 'serverNow') ?? readIso(root, 'serverTime');
  const counts =
    mapSummary(root?.summary) ??
    mapSummary(root?.counts) ??
    mapSummary(root?.statusCounts) ??
    emptyCounts();
  const limit = query.limit ?? 20;
  const meta =
    mapMeta(envelope.meta) ??
    mapMeta(root?.pagination) ??
    mapMeta(root?.meta) ??
    fallbackMeta(rawItems.length, limit);
  const items = rawItems
    .map((item) => mapListItem(item, serverTime))
    .filter((item): item is PayinOrderListItem => item !== null);
  const totals = mapTotals(root?.summary ?? root?.totals ?? root?.counts, items[0]?.currency ?? null);
  return { items, counts, totals, serverTime: serverTime ?? '', ...meta };
}

export async function fetchPayinOrder(orderId: string): Promise<PayinOrderDetail> {
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>(orderPath(orderId), {
    method: 'GET',
    accessToken,
  });
  const order = mapDetail(envelope.data);
  if (!order) loadError('Unable to load this PayIn order. Please try again.');
  return order;
}

export async function fetchPayinVerification(orderId: string): Promise<PayinVerification> {
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>(`${orderPath(orderId)}/verification`, {
    method: 'GET',
    accessToken,
  });
  const verification = mapVerification(envelope.data);
  if (!verification) loadError('Unable to load verification for this order.');
  return verification;
}

export async function fetchPayinReleaseStatus(orderId: string): Promise<PayinReleaseStatus> {
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>(`${orderPath(orderId)}/release-status`, {
    method: 'GET',
    accessToken,
  });
  const root = asRecord(envelope.data);
  const status = root ? readString(root, 'status') : null;
  if (!root || !status) loadError('Unable to load the release status.');
  return {
    status,
    transactionId: readString(root, 'transactionId'),
    customerCreditStatus: readString(root, 'customerCreditStatus'),
    collateralReleaseStatus: readString(root, 'collateralReleaseStatus'),
    failureReason: readString(root, 'failureReason'),
  };
}

export async function fetchPayinReceipt(orderId: string): Promise<PaymentSlip> {
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>(`${orderPath(orderId)}/receipt`, {
    method: 'GET',
    accessToken,
  });
  return readTemporaryUrl(envelope.data, 'The receipt could not be prepared. Please try again.');
}

export async function fetchPayinSlip(orderId: string): Promise<PaymentSlip> {
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>(`${orderPath(orderId)}/payment-slip`, {
    method: 'GET',
    accessToken,
  });
  return readTemporaryUrl(envelope.data, 'The payment slip could not be prepared. Please try again.');
}

function readTemporaryUrl(data: unknown, message: string): PaymentSlip {
  const root = asRecord(data);
  const downloadUrl =
    (root && (readString(root, 'downloadUrl') ?? readString(root, 'imageUrl') ?? readString(root, 'url'))) ??
    null;
  if (!isHttpsUrl(downloadUrl)) loadError(message);
  return { downloadUrl, expiresAt: root ? readIso(root, 'expiresAt') : null };
}

export async function submitPayinEvidence(
  orderId: string,
  evidence: SmsEvidenceInput,
): Promise<SmsEvidenceResult> {
  if (!/^[a-f0-9]{64}$/i.test(evidence.evidenceHash)) {
    throw new ApiClientError({
      code: 'VALIDATION_ERROR',
      message: 'Payment evidence could not be sent.',
      status: 400,
    });
  }
  const accessToken = await requireAccessToken();
  await apiRequestEnvelope<unknown>(`${orderPath(orderId)}/verification/evidence`, {
    method: 'POST',
    accessToken,
    body: {
      source: 'SMS',
      receivedAt: evidence.receivedAt,
      evidenceHash: evidence.evidenceHash,
      ...(evidence.amountMinor != null ? { amountMinor: evidence.amountMinor } : {}),
      ...(evidence.utr ? { utr: evidence.utr } : {}),
      ...(evidence.accountLast4 ? { accountLast4: evidence.accountLast4 } : {}),
      ...(evidence.transactionTimestamp
        ? { transactionTimestamp: evidence.transactionTimestamp }
        : {}),
      ...(evidence.direction ? { direction: evidence.direction } : {}),
    },
  });
  return { accepted: true };
}

export async function disputePayinOrder(input: {
  orderId: string;
  reason: DisputeReason;
  description?: string;
  evidenceIds?: string[];
}): Promise<PayinOrderDetail> {
  if (!DISPUTE.has(input.reason)) {
    throw new ApiClientError({
      code: 'VALIDATION_ERROR',
      message: 'Choose a dispute reason.',
      status: 400,
    });
  }
  const evidenceIds = (input.evidenceIds ?? []).filter((id) => /^evd_[A-Za-z0-9]+$/.test(id));
  const accessToken = await requireAccessToken();
  const description = input.description?.trim();
  const envelope = await apiRequestEnvelope<unknown>(`${orderPath(input.orderId)}/dispute`, {
    method: 'POST',
    accessToken,
    body: {
      reason: input.reason,
      evidenceIds,
      ...(description ? { description } : {}),
    },
  });
  const order = mapDetail(envelope.data);
  if (!order) loadError('The dispute could not be submitted. Please try again.');
  return order;
}

export function createPayinIdempotencyKey(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `payin.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 12)}`;
}

export async function releasePayinOrder(
  orderId: string,
  idempotencyKey: string,
): Promise<PayinOrderDetail | null> {
  if (!/^[A-Za-z0-9._:-]{8,80}$/.test(idempotencyKey)) {
    throw new ApiClientError({
      code: 'VALIDATION_ERROR',
      message: 'This payment could not be released. Please try again.',
      status: 400,
    });
  }
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>(`${orderPath(orderId)}/release`, {
    method: 'POST',
    accessToken,
    headers: { 'Idempotency-Key': idempotencyKey },
    body: { confirmation: true, idempotencyKey },
  });
  return mapDetail(envelope.data);
}

export async function cancelPayinOrder(orderId: string): Promise<PayinOrderDetail | null> {
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>(`${orderPath(orderId)}/cancel`, {
    method: 'POST',
    accessToken,
    body: {},
  });
  return mapDetail(envelope.data);
}
