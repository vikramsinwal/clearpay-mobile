import * as FileSystem from 'expo-file-system/legacy';

import { PAYOUT_COPY } from '@/constants/payout';
import { apiRequestEnvelope } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/errors';
import { getAccessToken } from '@/lib/auth/secure-tokens';
import { formatPayoutAmount } from '@/features/payout/lib/presentation';

import type {
  PayoutCandidateAction,
  PayoutCandidateResult,
  PayoutHelpReason,
  PayoutListFilters,
  PayoutOrderCounts,
  PayoutOrderDetail,
  PayoutOrderListItem,
  PayoutOrderSummary,
  PayoutOrdersPage,
  PayoutPaymentCandidate,
  PayoutPaymentIntent,
  PayoutPaymentMethod,
  PayoutProofUploadTicket,
  PayoutPushRegistration,
  PayoutRule,
  PayoutSubmission,
  PayoutUpiApp,
} from '@/features/payout/types';
import {
  PAYOUT_CANDIDATE_ACTIONS,
  PAYOUT_HELP_REASONS,
  PAYOUT_ORDER_STATUSES,
  PAYOUT_PAYMENT_METHODS,
  PAYOUT_SUMMARY_STATUSES,
  PAYOUT_UPI_APPS,
} from '@/features/payout/types';

/**
 * Customer payout orders.
 * /api/v1/customer/payout-orders
 * Amounts, beneficiaries, deadlines, and proof checks stay on the server.
 */

const ORDER_ID = /^[A-Za-z0-9_-]{4,80}$/;
const MONGO_ID = /^[a-f0-9]{24}$/i;
const DISPLAY_ID = /^[A-Za-z0-9-]{4,40}$/;
const METHODS = new Set<string>(PAYOUT_PAYMENT_METHODS);
const SUMMARY = new Set<string>(PAYOUT_SUMMARY_STATUSES);
const HELP = new Set<string>(PAYOUT_HELP_REASONS);
const KNOWN_STATUS = new Set<string>(PAYOUT_ORDER_STATUSES);
const CANDIDATE_ACTIONS = new Set<string>(PAYOUT_CANDIDATE_ACTIONS);
const UPI_APPS = new Set<string>(PAYOUT_UPI_APPS);
const SUPPORTED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']);
const MAX_PROOF_BYTES = 10 * 1024 * 1024;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{8,80}$/;

let registeredDeviceId: string | null = null;

function idempotencyKey(): string {
  const key = `payout.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 12)}`;
  if (!IDEMPOTENCY_KEY.test(key)) loadError(PAYOUT_COPY.submitFailed);
  return key;
}

function idempotencyHeaders(): Record<string, string> {
  return { 'Idempotency-Key': idempotencyKey() };
}

function loadError(message: string): never {
  throw new ApiClientError({ code: 'UNKNOWN', message, status: 200 });
}

async function requireAccessToken(): Promise<string> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new ApiClientError({
      code: 'UNAUTHORIZED',
      message: 'Your session expired. Please sign in again.',
      status: 401,
    });
  }
  return accessToken;
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
  return typeof record[key] === 'boolean' ? record[key] : null;
}

function readInt(record: Record<string, unknown> | null, key: string): number | null {
  if (!record) return null;
  const value = record[key];
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function readIso(record: Record<string, unknown> | null, key: string): string | null {
  const value = readString(record, key);
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return value;
}

export function isPayoutOrderId(value: string | null | undefined): value is string {
  return Boolean(value && ORDER_ID.test(value) && !MONGO_ID.test(value));
}

function orderPath(orderId: string): string {
  return `/payout-orders/${encodeURIComponent(orderId)}`;
}

function assertOrderId(orderId: string, message: string): string {
  if (!isPayoutOrderId(orderId)) loadError(message);
  return orderId;
}

function statusLabel(status: string, record: Record<string, unknown>): string {
  return (
    readString(record, 'statusLabel') ??
    (KNOWN_STATUS.has(status)
      ? status
          .toLowerCase()
          .split('_')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ')
      : status.replace(/_/g, ' '))
  );
}

function mapMethod(value: unknown): PayoutPaymentMethod | null {
  return typeof value === 'string' && METHODS.has(value) ? (value as PayoutPaymentMethod) : null;
}

function mapSummary(value: unknown): PayoutOrderSummary | null {
  const record = asRecord(value);
  if (!record) return null;
  const total = readInt(record, 'total');
  if (total == null) return null;
  const aliases: Record<string, string> = {
    actionRequired: 'ACTION_REQUIRED',
    pending: 'PENDING',
    processing: 'PROCESSING',
    completed: 'COMPLETED',
    expired: 'EXPIRED',
    assigned: 'ASSIGNED',
  };
  const byStatus: Record<string, number> = {};
  for (const [key, raw] of Object.entries(record)) {
    if (key === 'total' || typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0) continue;
    byStatus[aliases[key] ?? key] = raw;
  }
  return { total, byStatus };
}

function statusCount(summary: PayoutOrderSummary, ...keys: string[]): number {
  return keys.reduce((total, key) => total + (summary.byStatus[key] ?? 0), 0);
}

function countsFromSummary(summary: PayoutOrderSummary): PayoutOrderCounts {
  return {
    ASSIGNED: statusCount(summary, 'ASSIGNED'),
    ACTION_REQUIRED: statusCount(summary, 'ACTION_REQUIRED'),
    PAYMENT_IN_PROGRESS: statusCount(summary, 'PAYMENT_IN_PROGRESS'),
    UNDER_REVIEW: statusCount(summary, 'UNDER_REVIEW'),
    COMPLETED: statusCount(summary, 'COMPLETED'),
    EXPIRED: statusCount(summary, 'EXPIRED'),
  };
}

function mapRules(value: unknown): PayoutRule[] {
  if (!Array.isArray(value)) return [];
  const rules: PayoutRule[] = [];
  for (const item of value) {
    const record = asRecord(item);
    const code = readString(record, 'code');
    const durationSeconds = readInt(record, 'durationSeconds');
    if (!code || durationSeconds == null || durationSeconds <= 0) continue;
    rules.push({
      code,
      label: readString(record, 'label') ?? code,
      durationSeconds,
      warningThresholdSeconds: readInt(record, 'warningThresholdSeconds') ?? 0,
      enabled: readBool(record, 'enabled') !== false,
    });
  }
  return rules;
}

function readServerNow(...records: Array<Record<string, unknown> | null>): string | null {
  for (const record of records) {
    const value = readIso(record, 'serverNow') ?? readIso(record, 'serverTime');
    if (value) return value;
  }
  return null;
}

function mapListItem(value: unknown, fallbackServerTime: string | null): PayoutOrderListItem | null {
  const record = asRecord(value);
  const order = asRecord(record?.order) ?? record;
  if (!order) return null;
  const publicId = readString(order, 'id') ?? readString(order, 'publicId');
  const displayId = readString(order, 'orderNumber') ?? readString(order, 'displayId');
  const status = readString(order, 'status') ?? readString(record, 'currentState');
  const amount = readInt(order, 'amountMinor') ?? readInt(order, 'amount');
  const currency = readString(order, 'currency');
  const beneficiary = asRecord(record?.beneficiary) ?? asRecord(order.beneficiary);
  const beneficiaryName = readString(order, 'beneficiaryName') ?? readString(beneficiary, 'name');
  const createdAt = readIso(order, 'createdAt') ?? readIso(record, 'createdAt');
  const sla = asRecord(record?.sla) ?? asRecord(order.sla);
  const serverTime = readServerNow(sla, order, record) ?? fallbackServerTime;
  if (!publicId || !isPayoutOrderId(publicId) || !displayId || !DISPLAY_ID.test(displayId)) return null;
  if (!status || amount == null || !currency) return null;
  const action = readString(order, 'actionLabel') ?? readString(asRecord(order.action), 'label');
  return {
    publicId,
    displayId,
    status,
    statusLabel: statusLabel(status, order),
    amount,
    currency,
    beneficiaryName: beneficiaryName ?? '—',
    methodSummary: readString(order, 'methodSummary') ?? readString(order, 'paymentMethod'),
    actionRequired: readBool(order, 'actionRequired') === true || status === 'ACTION_REQUIRED',
    actionLabel: action,
    createdAt: createdAt ?? '',
    deadlineAt: readIso(order, 'deadlineAt') ?? readIso(sla, 'deadlineAt'),
    serverTime,
  };
}

function kycLabel(status: string, record: Record<string, unknown>): string {
  const fromServer = readString(record, 'kycLabel');
  if (fromServer) return fromServer;
  if (status === 'VERIFIED' || status === 'KYC_VERIFIED') return 'KYC Verified';
  if (status === 'FAILED' || status === 'KYC_FAILED') return 'KYC Failed';
  if (status === 'PENDING' || status === 'KYC_PENDING') return 'KYC Pending';
  return status;
}

function mapBeneficiary(value: unknown) {
  const record = asRecord(value);
  if (!record) return null;
  const name = readString(record, 'name');
  if (!name) return null;
  const bank = asRecord(record.bank);
  const bankName = readString(bank, 'bankName');
  const branch = readString(bank, 'branch');
  const kycStatus = readString(record, 'kycStatus') ?? 'PENDING';
  return {
    name,
    kycStatus,
    kycLabel: kycLabel(kycStatus, record),
    paymentMethodLabel: readString(record, 'paymentMethodLabel'),
    upiId: readString(record, 'upiId'),
    accountNumber: readString(bank, 'accountNumberMasked') ?? readString(record, 'accountNumber'),
    accountNumberCopy: null,
    ifsc: readString(bank, 'ifsc') ?? readString(record, 'ifsc'),
    ifscCopy: readString(bank, 'ifsc') ?? readString(record, 'ifsc'),
    bankAndBranch: [bankName, branch].filter(Boolean).join(', ') || readString(record, 'bankAndBranch'),
    mobile: readString(record, 'mobileMasked') ?? readString(record, 'mobile'),
    mobileCopy: null,
  };
}

function mapUpload(value: unknown) {
  const record = asRecord(value);
  const maxBytes = readInt(record, 'maxFileSize') ?? readInt(record, 'maxBytes') ?? MAX_PROOF_BYTES;
  const raw = record?.allowedMimeTypes ?? record?.mimeTypes;
  const mimeTypes = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === 'string' && SUPPORTED_MIME.has(item))
    : [];
  return {
    maxBytes,
    mimeTypes: mimeTypes.length > 0 ? mimeTypes : ['image/jpeg', 'image/png', 'application/pdf'],
  };
}

function mapReference(requirements: unknown, paymentReference: unknown) {
  const record = asRecord(requirements);
  const stored = asRecord(paymentReference);
  const pattern = readString(record, 'referencePattern') ?? readString(record, 'pattern');
  return {
    type: readString(record, 'referenceType') ?? readString(stored, 'type') ?? readString(record, 'type') ?? 'UTR',
    required: readBool(record, 'referenceRequired') ?? readBool(record, 'required') ?? true,
    pattern,
    length: readInt(record, 'length'),
    label: readString(record, 'label') ?? 'UTR / Transaction Reference',
    hint: readString(record, 'hint'),
    value: readString(stored, 'value') ?? readString(record, 'value'),
    matchesReceipt: readBool(record, 'matchesReceipt') === true,
  };
}

function mapOcr(value: unknown) {
  const record = asRecord(value);
  if (!record) return null;
  const amount = readInt(record, 'amountMinor');
  const currency = readString(record, 'currency') ?? 'INR';
  return {
    utr: readString(record, 'utr') ?? readString(record, 'reference'),
    amountLabel: readString(record, 'amountLabel') ?? (amount != null ? formatPayoutAmount(amount, currency) : null),
    date: readString(record, 'transactionDate') ?? readString(record, 'date'),
    time: readString(record, 'time'),
    beneficiary: readString(record, 'beneficiary'),
    bank: readString(record, 'bank'),
    sender: readString(record, 'sender'),
    transactionStatus: readString(record, 'status') ?? readString(record, 'transactionStatus'),
  };
}

function mapFees(value: unknown) {
  const record = asRecord(value);
  const label = readString(record, 'label') ?? (typeof value === 'string' ? value : null);
  return label ? { label } : null;
}

function mapCollateral(value: unknown) {
  const record = asRecord(value);
  if (!record) return null;
  const status = readString(record, 'status') ?? '';
  const confirmed = status === 'RELEASED' || status === 'CREDITED';
  const amount = readInt(record, 'amount');
  const currency = readString(record, 'currency') ?? 'USDT';
  return {
    status,
    title: confirmed ? readString(record, 'title') ?? 'Net Collateral Released' : 'Net Collateral',
    amountLabel:
      readString(record, 'amountLabel') ??
      (amount != null && currency === 'INR' ? formatPayoutAmount(amount, currency) : amount != null ? `${amount} ${currency}` : ''),
    message: readString(record, 'message'),
    confirmed,
  };
}

function mapDetail(data: unknown, fallbackServerTime: string | null): PayoutOrderDetail | null {
  const root = asRecord(data);
  if (!root) return null;
  const orderRecord = asRecord(root.order) ?? root;
  const sla = asRecord(root.sla);
  const serverNow = readServerNow(sla, orderRecord, root) ?? fallbackServerTime;
  const base = mapListItem({ ...root, order: orderRecord }, serverNow);
  if (!base) return null;
  const actions = Array.isArray(root.availableActions)
    ? root.availableActions.filter((item): item is string => typeof item === 'string')
    : [];
  const methods = Array.isArray(root.paymentMethods)
    ? root.paymentMethods.map(mapMethod).filter((item): item is PayoutPaymentMethod => item !== null)
    : [];
  const proof = asRecord(root.proofRequirements);
  const instructions = asRecord(root.paymentInstructions);
  const beneficiary = mapBeneficiary(root.beneficiary) ?? mapBeneficiary(instructions);
  const apps = Array.isArray(root.upiApps)
    ? root.upiApps.filter((item): item is PayoutUpiApp => typeof item === 'string' && UPI_APPS.has(item) && item !== 'DEFAULT')
    : (['GPAY', 'PHONEPE', 'PAYTM'] as PayoutUpiApp[]);
  const currentStatus = readString(root, 'currentState') ?? readString(root, 'currentStatus');
  const rejection = asRecord(root.rejection);
  const rules = mapRules(root.rules);
  const rule = rules.find((item) => item.code === readString(sla, 'ruleCode') && item.enabled);
  const verification = root.verification;
  const verificationStatus =
    typeof verification === 'string'
      ? verification
      : readString(asRecord(verification), 'status') ?? readString(asRecord(verification), 'result');
  const selectedMethod = mapMethod(orderRecord.paymentMethod) ?? mapMethod(root.paymentMethod);
  return {
    ...base,
    serverTime: serverNow,
    status: currentStatus ?? base.status,
    statusLabel: currentStatus ? statusLabel(currentStatus, orderRecord) : base.statusLabel,
    payable: actions.some((action) => action === 'PAY' || action === 'SUBMIT_PROOF' || action === 'UPLOAD_PROOF'),
    proofId: readString(asRecord(root.proof), 'id') ?? readString(asRecord(root.proof), 'uploadId'),
    availableActions: actions,
    canAccept: actions.includes('ACCEPT'),
    selectedMethod,
    availableMethods: methods.length > 0 ? methods : selectedMethod ? [selectedMethod] : [],
    adjustment: mapFees(root.fees),
    collateral: mapCollateral(root.collateral),
    beneficiary: beneficiary
      ? {
          ...beneficiary,
          upiId: beneficiary.upiId ?? readString(instructions, 'upiId'),
        }
      : null,
    sla: {
      ruleCode: readString(sla, 'ruleCode'),
      label: readString(sla, 'label') ?? rule?.label ?? null,
      durationSeconds: readInt(sla, 'durationSeconds') ?? rule?.durationSeconds ?? null,
      acceptedAt: readIso(sla, 'acceptedAt'),
      deadlineAt: readIso(sla, 'deadlineAt') ?? base.deadlineAt,
      remainingMs: readInt(sla, 'remainingMs'),
      warningTitle: readString(sla, 'warningTitle'),
      warningDescription: readString(sla, 'warningDescription'),
      penaltyDescription: null,
      allowLateSubmission: false,
    },
    action: base.actionLabel ? { label: base.actionLabel } : actions.includes('SUBMIT_PROOF') ? { label: 'Action Required: Send & Upload Proof' } : null,
    upload: mapUpload(proof),
    receipt: mapReceipt(asRecord(root.proof)),
    reference: mapReference(proof, root.paymentReference),
    ocr: mapOcr(asRecord(root.ocr)?.extracted ?? asRecord(root.verification)?.extracted ?? null),
    rejection: rejection
      ? { code: readString(rejection, 'code'), message: readString(rejection, 'message') ?? PAYOUT_COPY.submitFailed }
      : null,
    securityNotice: readString(root, 'securityNotice'),
    proofStepLabel: readString(root, 'proofStepLabel'),
    verificationStatus,
    rules,
    realtime: {
      mode: 'poll' as const,
      pollIntervalMs: null,
      socketUrl: null,
    },
    upiApps: apps,
  };
}

function mapReceipt(record: Record<string, unknown> | null) {
  if (!record) return null;
  const fileName = readString(record, 'fileName');
  if (!fileName && !readString(record, 'id')) return null;
  return {
    id: readString(record, 'id'),
    fileName,
    sizeBytes: readInt(record, 'fileSize') ?? readInt(record, 'sizeBytes'),
    mimeType: readString(record, 'contentType') ?? readString(record, 'mimeType'),
    status: readString(record, 'status') ?? 'READY',
    previewUrl: readHttps(readString(record, 'previewUrl')),
    uploadedAt: readIso(record, 'uploadedAt'),
    failureMessage: readString(record, 'failureMessage'),
  };
}

function readHttps(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

function listQuery(filters: PayoutListFilters & { limit: number; cursor?: string | null; page?: number }): string {
  const params = new URLSearchParams();
  params.set('limit', String(filters.limit));
  if (filters.page != null) params.set('page', String(filters.page));
  if (filters.cursor) params.set('cursor', filters.cursor);
  if (filters.status && SUMMARY.has(filters.status) && KNOWN_STATUS.has(filters.status)) {
    params.set('status', filters.status);
  }
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.minAmount != null) params.set('minAmount', String(filters.minAmount * 100));
  if (filters.maxAmount != null) params.set('maxAmount', String(filters.maxAmount * 100));
  if (filters.paymentMethod && METHODS.has(filters.paymentMethod)) {
    params.set('paymentMethod', filters.paymentMethod);
  }
  return params.toString();
}

export async function fetchPayoutOrders(
  query: PayoutListFilters & { limit: number; cursor?: string | null; page?: number },
): Promise<PayoutOrdersPage> {
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>(`/payout-orders?${listQuery(query)}`, {
    method: 'GET',
    accessToken,
  });
  const root = asRecord(envelope.data);
  const meta = asRecord(envelope.meta);
  if (!root || !Array.isArray(root.items)) loadError(PAYOUT_COPY.loadFailed);
  const summary = mapSummary(root.summary);
  if (!summary) loadError(PAYOUT_COPY.loadFailed);
  const serverTime = readServerNow(root);
  const items = root.items
    .map((item) => mapListItem(item, serverTime))
    .filter((item): item is PayoutOrderListItem => item !== null);
  const page = readInt(meta, 'page') ?? query.page ?? 1;
  const totalPages = readInt(meta, 'totalPages') ?? 0;
  const nextCursor = readString(meta, 'nextCursor');
  return {
    items,
    summary,
    counts: countsFromSummary(summary),
    rules: mapRules(root.rules),
    serverTime: serverTime ?? items.find((item) => item.serverTime)?.serverTime ?? null,
    page,
    totalPages,
    nextCursor,
    hasMore: Boolean(nextCursor) || (totalPages > 0 && page < totalPages),
  };
}

export async function fetchPayoutOrder(orderId: string): Promise<PayoutOrderDetail> {
  assertOrderId(orderId, PAYOUT_COPY.detailFailed);
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>(orderPath(orderId), {
    method: 'GET',
    accessToken,
  });
  const order = mapDetail(envelope.data, readServerNow(asRecord(envelope.data)));
  if (!order) loadError(PAYOUT_COPY.detailFailed);
  return order;
}

export async function acceptPayoutOrder(orderId: string): Promise<PayoutOrderDetail> {
  assertOrderId(orderId, PAYOUT_COPY.paymentUnavailable);
  const accessToken = await requireAccessToken();
  await apiRequestEnvelope(`${orderPath(orderId)}/accept`, {
    method: 'POST',
    accessToken,
    body: {},
    headers: idempotencyHeaders(),
  });
  return fetchPayoutOrder(orderId);
}

export async function requestPayoutPaymentIntent(
  orderId: string,
  method: PayoutPaymentMethod,
): Promise<PayoutPaymentIntent> {
  assertOrderId(orderId, PAYOUT_COPY.paymentUnavailable);
  if (!METHODS.has(method)) loadError(PAYOUT_COPY.paymentUnavailable);
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>(`${orderPath(orderId)}/payment-intent`, {
    method: 'POST',
    accessToken,
    body: { method },
    headers: idempotencyHeaders(),
  });
  const data = asRecord(envelope.data);
  const intent = asRecord(data?.intent) ?? data;
  const returned = mapMethod(intent?.method) ?? mapMethod(data?.method) ?? method;
  const uri = readString(intent, 'upiUri');
  if (returned === 'UPI' && (!uri || !uri.startsWith('upi://'))) loadError(PAYOUT_COPY.paymentUnavailable);
  const bank = asRecord(intent?.bank) ?? asRecord(data?.bank);
  return {
    method: returned,
    uri,
    amountMinor: readInt(intent, 'amountMinor') ?? readInt(data, 'amountMinor'),
    currency: readString(intent, 'currency') ?? readString(data, 'currency'),
    accountNumber: readString(intent, 'accountNumber') ?? readString(bank, 'accountNumber'),
    ifsc: readString(intent, 'ifsc') ?? readString(bank, 'ifsc'),
    bankName: readString(intent, 'bankName') ?? readString(bank, 'bankName'),
  };
}

function mimeTypeFor(contentType: string): string {
  return contentType === 'image/jpg' ? 'image/jpeg' : contentType;
}

function extensionMatches(fileName: string, mimeType: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (mimeType === 'image/png') return extension === 'png';
  if (mimeType === 'image/jpeg') return extension === 'jpg' || extension === 'jpeg';
  if (mimeType === 'application/pdf') return extension === 'pdf';
  return false;
}

export async function createPayoutProofUpload(input: {
  orderId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}): Promise<PayoutProofUploadTicket> {
  assertOrderId(input.orderId, PAYOUT_COPY.receiptFailed);
  const mimeType = mimeTypeFor(input.contentType);
  if (!SUPPORTED_MIME.has(mimeType) || input.fileSize <= 0 || input.fileSize > MAX_PROOF_BYTES) {
    throw new ApiClientError({ code: 'VALIDATION_ERROR', message: PAYOUT_COPY.uploadType, status: 400 });
  }
  if (!extensionMatches(input.fileName, mimeType)) {
    throw new ApiClientError({ code: 'VALIDATION_ERROR', message: PAYOUT_COPY.uploadType, status: 400 });
  }
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>(`${orderPath(input.orderId)}/proof/upload-url`, {
    method: 'POST',
    accessToken,
    body: {
      fileName: input.fileName,
      mimeType,
      size: input.fileSize,
    },
  });
  const root = asRecord(envelope.data);
  const uploadId = readString(root, 'uploadId');
  const uploadUrl = readString(root, 'uploadUrl');
  const method = readString(root, 'method');
  if (!uploadId || !uploadUrl || !uploadUrl.startsWith('https://') || (method && method !== 'PUT')) {
    loadError(PAYOUT_COPY.receiptFailed);
  }
  const headers = asRecord(root?.headers) ?? asRecord(root?.requiredHeaders);
  const requiredHeaders: Record<string, string> = {};
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string' && key.trim()) requiredHeaders[key] = value;
    }
  }
  if (!requiredHeaders['Content-Type'] && !requiredHeaders['content-type']) {
    requiredHeaders['Content-Type'] = mimeType;
  }
  return {
    uploadId,
    uploadUrl,
    expiresAt: readIso(root, 'expiresAt'),
    requiredHeaders,
  };
}

export async function uploadPayoutProofFile(input: {
  uploadUrl: string;
  fileUri: string;
  contentType: string;
  requiredHeaders: Record<string, string>;
  onProgress?: (percent: number) => void;
}): Promise<void> {
  if (!input.uploadUrl.startsWith('https://')) loadError(PAYOUT_COPY.receiptFailed);
  const task = FileSystem.createUploadTask(
    input.uploadUrl,
    input.fileUri,
    {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        'Content-Type': input.contentType === 'image/jpg' ? 'image/jpeg' : input.contentType,
        ...input.requiredHeaders,
      },
    },
    (progress) => {
      if (!input.onProgress || progress.totalBytesExpectedToSend <= 0) return;
      const percent = Math.round((progress.totalBytesSent / progress.totalBytesExpectedToSend) * 100);
      input.onProgress(Math.max(0, Math.min(100, percent)));
    },
  );
  const result = await task.uploadAsync();
  if (!result || result.status < 200 || result.status >= 300) loadError(PAYOUT_COPY.receiptFailed);
}

export async function completePayoutProofUpload(input: {
  orderId: string;
  uploadId: string;
}): Promise<{ proofId: string | null }> {
  assertOrderId(input.orderId, PAYOUT_COPY.receiptFailed);
  if (!isPayoutOrderId(input.uploadId)) loadError(PAYOUT_COPY.receiptFailed);
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>(`${orderPath(input.orderId)}/proof/confirm`, {
    method: 'POST',
    accessToken,
    body: { uploadId: input.uploadId },
  });
  const root = asRecord(envelope.data);
  return { proofId: readString(root, 'proofId') ?? readString(asRecord(root?.proof), 'id') ?? input.uploadId };
}

export async function uploadPayoutReceipt(input: {
  orderId: string;
  uri: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  maxBytes: number;
  onProgress?: (percent: number) => void;
}): Promise<PayoutOrderDetail> {
  if (input.sizeBytes > input.maxBytes) {
    throw new ApiClientError({ code: 'VALIDATION_ERROR', message: PAYOUT_COPY.uploadTooLarge, status: 400 });
  }
  const ticket = await createPayoutProofUpload({
    orderId: input.orderId,
    fileName: input.fileName,
    contentType: input.mimeType,
    fileSize: input.sizeBytes,
  });
  await uploadPayoutProofFile({
    uploadUrl: ticket.uploadUrl,
    fileUri: input.uri,
    contentType: input.mimeType,
    requiredHeaders: ticket.requiredHeaders,
    onProgress: input.onProgress,
  });
  await completePayoutProofUpload({
    orderId: input.orderId,
    uploadId: ticket.uploadId,
  });
  return fetchPayoutOrder(input.orderId);
}

export async function submitPayoutReference(
  orderId: string,
  input: { value: string; amountMinor: number },
): Promise<void> {
  assertOrderId(orderId, PAYOUT_COPY.submitFailed);
  const value = input.value.trim();
  if (!value || !Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0) {
    loadError(PAYOUT_COPY.submitFailed);
  }
  const accessToken = await requireAccessToken();
  await apiRequestEnvelope(`${orderPath(orderId)}/proof/reference`, {
    method: 'POST',
    accessToken,
    body: { value, amountMinor: input.amountMinor },
  });
}

export async function submitPayoutProof(orderId: string): Promise<PayoutSubmission> {
  assertOrderId(orderId, PAYOUT_COPY.submitFailed);
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>(`${orderPath(orderId)}/submit-proof`, {
    method: 'POST',
    accessToken,
    body: {},
    headers: idempotencyHeaders(),
  });
  const root = asRecord(envelope.data);
  const order = asRecord(root?.order);
  const status =
    readString(root, 'status') ?? readString(root, 'currentState') ?? readString(order, 'status');
  if (!status || status === 'COMPLETED') {
    const refreshed = await fetchPayoutOrder(orderId);
    return {
      orderId: refreshed.publicId,
      status: refreshed.status,
      proofStatus: refreshed.verificationStatus,
      reference: refreshed.reference.value,
    };
  }
  return {
    orderId: readString(root, 'orderId') ?? readString(order, 'id') ?? orderId,
    status,
    proofStatus: readString(root, 'proofStatus') ?? readString(root, 'verification'),
    reference: readString(asRecord(root?.paymentReference), 'value') ?? readString(root, 'reference'),
  };
}

export async function submitPayoutPaymentCandidate(
  orderId: string,
  candidate: PayoutPaymentCandidate,
): Promise<PayoutCandidateResult> {
  assertOrderId(orderId, PAYOUT_COPY.paymentUnavailable);
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>(`${orderPath(orderId)}/payment-candidates`, {
    method: 'POST',
    accessToken,
    body: {
      source: candidate.source,
      senderHash: candidate.senderHash,
      amountMinor: candidate.amountMinor,
      ...(candidate.transactionReference ? { reference: candidate.transactionReference } : {}),
      timestamp: candidate.timestamp,
      ...(candidate.accountLast4 ? { accountLast4: candidate.accountLast4 } : {}),
    },
  });
  const root = asRecord(envelope.data);
  const action = readString(root, 'action');
  return {
    matched: readBool(root, 'matched') === true,
    confidence: typeof root?.confidence === 'number' ? root.confidence : null,
    candidateId: readString(root, 'candidateId'),
    action: action && CANDIDATE_ACTIONS.has(action) ? (action as PayoutCandidateAction) : 'IGNORE',
    orderPublicId: orderId,
  };
}

export async function autoSubmitPayoutCandidate(orderId: string, candidateId: string): Promise<PayoutSubmission> {
  assertOrderId(orderId, PAYOUT_COPY.submitFailed);
  if (!ORDER_ID.test(candidateId)) loadError(PAYOUT_COPY.submitFailed);
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>(
    `${orderPath(orderId)}/payment-candidates/${encodeURIComponent(candidateId)}/auto-submit`,
    { method: 'POST', accessToken, body: {}, headers: idempotencyHeaders() },
  );
  const root = asRecord(envelope.data);
  const status = readString(root, 'status') ?? 'UNDER_REVIEW';
  return {
    orderId: readString(root, 'orderId') ?? orderId,
    status,
    proofStatus: readString(root, 'proofStatus'),
    reference: readString(root, 'reference'),
  };
}

export async function createPayoutSupportTicket(input: {
  orderId: string;
  category: PayoutHelpReason;
  message: string;
}): Promise<void> {
  assertOrderId(input.orderId, PAYOUT_COPY.helpFailed);
  if (!HELP.has(input.category) || !input.message.trim()) loadError(PAYOUT_COPY.helpFailed);
  const accessToken = await requireAccessToken();
  await apiRequestEnvelope(`${orderPath(input.orderId)}/support`, {
    method: 'POST',
    accessToken,
    body: { category: input.category, message: input.message.trim(), attachments: [] },
  });
}

export async function registerPayoutPushDevice(input: PayoutPushRegistration): Promise<void> {
  const accessToken = await requireAccessToken();
  await apiRequestEnvelope('/devices', {
    method: 'POST',
    accessToken,
    body: {
      platform: input.platform,
      pushToken: input.pushToken,
      deviceId: input.deviceId,
      appVersion: input.appVersion,
    },
  });
  registeredDeviceId = input.deviceId;
}

export async function unregisterCurrentPushDevice(): Promise<void> {
  const deviceId = registeredDeviceId;
  if (!deviceId || !ORDER_ID.test(deviceId)) return;
  const accessToken = await getAccessToken();
  if (!accessToken) return;
  try {
    await apiRequestEnvelope(`/devices/${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
      accessToken,
    });
  } catch {
    return;
  } finally {
    registeredDeviceId = null;
  }
}
