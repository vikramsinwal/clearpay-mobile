/** Customer PayIn orders. Display only — release and verification stay on the server. */

export const PAYIN_ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAYMENT_DETECTED',
  'PENDING_VERIFICATION',
  'VERIFIED',
  'RELEASE_PENDING',
  'RELEASING',
  'COMPLETED',
  'DISPUTED',
  'EXPIRED',
  'CANCELLED',
  'FAILED',
] as const;

export type PayinOrderStatus = (typeof PAYIN_ORDER_STATUSES)[number];

export const PAYIN_SUMMARY_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'disputed',
  'expired',
] as const;

export type PayinSummaryStatus = (typeof PAYIN_SUMMARY_STATUSES)[number];

export const PAYIN_LIST_TABS = [
  'all',
  'action_required',
  'pending',
  'processing',
  'completed',
  'failed',
  'expired',
] as const;

export type PayinListTab = (typeof PAYIN_LIST_TABS)[number];

export const VERIFICATION_STATUSES = [
  'PENDING',
  'PARTIALLY_VERIFIED',
  'VERIFIED',
  'FAILED',
  'MANUAL_REVIEW',
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const OCR_STATUSES = [
  'VERIFIED',
  'PARTIAL',
  'FAILED',
  'PROCESSING',
  'NO_RECEIPT',
] as const;

export type OcrStatus = (typeof OCR_STATUSES)[number];

export const CHECK_STATUSES = ['VERIFIED', 'PENDING', 'FAILED'] as const;

export type VerificationCheckStatus = (typeof CHECK_STATUSES)[number];

export type ExpiryPhase = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';

export type PayinOrderCounts = Record<PayinSummaryStatus, number>;

/** Backend-provided list totals. Never summed on the client. */
export type PayinListTotals = {
  todayAmountMinor: number | null;
  totalAmountMinor: number | null;
  currency: string | null;
};

export type PayinTimelineEvent = {
  key: string;
  label: string;
  at: string | null;
};

export type PayinPaymentInstruction = {
  title: string | null;
  body: string;
};

export type PayinOrderListItem = {
  publicId: string;
  displayId: string;
  status: PayinOrderStatus;
  expiresAt: string;
  serverTime: string | null;
  transactionType: string;
  expectedInboundAmountMinor: number;
  currency: string;
  remitterName: string;
  utr: string | null;
  assignedAccountLabel: string | null;
  assignedAccountId: string | null;
  paymentMethod: string | null;
  createdAt: string;
  verificationStatus: VerificationStatus;
  actionRequired: boolean;
  earningMinor: number | null;
  accountPhone: string | null;
  bankLabel: string | null;
  smsReceived: boolean | null;
  matchNote: string | null;
};

export type PayinOrdersPage = {
  items: PayinOrderListItem[];
  counts: PayinOrderCounts;
  totals: PayinListTotals;
  serverTime: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export type VerificationCheck = {
  id: string;
  type: string;
  title: string;
  status: VerificationCheckStatus;
  details: string | null;
  verifiedAt: string | null;
  source: string | null;
};

export type ReceiptPreview = {
  statusLabel: string | null;
  payeeName: string | null;
  payeeDetail: string | null;
  settlementLabel: string | null;
  amountMinor: number | null;
  currency: string | null;
  upiRef: string | null;
  fromAccount: string | null;
  timestamp: string | null;
  previewUrl: string | null;
  fullImageUrl: string | null;
};

export type Collateral = {
  amountMinor: number;
  currency: string;
  status: string;
  releaseEligibility: string | null;
  message: string | null;
};

export type ReleaseEligibility = {
  canRelease: boolean;
  reasons: string[];
};

export type PayinOrderDetail = PayinOrderListItem & {
  tier: string | null;
  traderEarningMinor: number | null;
  traderCommissionPercentage: number | null;
  feeMinor: number | null;
  netAmountMinor: number | null;
  remitterVerified: boolean;
  remitterPhone: string | null;
  merchantProvider: string | null;
  merchantVirtualAddress: string | null;
  assignedAccountName: string | null;
  assignedAccountType: string | null;
  assignedAccountStatus: string | null;
  assignedAccountConnectivity: string | null;
  assignedAccountMasked: string | null;
  paymentInstructions: PayinPaymentInstruction[];
  timeline: PayinTimelineEvent[];
  failureReason: string | null;
  completedAt: string | null;
  ocrStatus: OcrStatus;
  ocrConfidence: number | null;
  receipt: ReceiptPreview | null;
  verificationChecks: VerificationCheck[];
  verifiedCount: number;
  totalChecks: number;
  collateral: Collateral | null;
  releaseEligibility: ReleaseEligibility;
  releaseStatus: string | null;
  transactionId: string | null;
  disputeOpen: boolean;
  realtime: {
    mode: 'poll' | 'websocket';
    socketUrl: string | null;
  };
};

export const DISPUTE_REASONS = [
  'PAYMENT_NOT_REFLECTED',
  'PARTIAL_AMOUNT',
  'INCORRECT_AMOUNT',
  'FRAUDULENT_RECEIPT',
  'DUPLICATE_PAYMENT',
  'OTHER',
] as const;

export type DisputeReason = (typeof DISPUTE_REASONS)[number];

export type PaymentSlip = {
  downloadUrl: string;
  expiresAt: string | null;
};

export type SmsEvidenceInput = {
  source: 'SMS';
  amountMinor?: number;
  utr?: string;
  accountLast4?: string;
  transactionTimestamp?: string;
  receivedAt: string;
  evidenceHash: string;
  direction?: 'CREDIT' | 'DEBIT';
};

export type PayinVerification = {
  overallStatus: VerificationStatus;
  checks: VerificationCheck[];
  verifiedCount: number;
  totalChecks: number;
  remainingChecks: number;
};

export type PayinReleaseStatus = {
  status: string;
  transactionId: string | null;
  customerCreditStatus: string | null;
  collateralReleaseStatus: string | null;
  failureReason: string | null;
};

export type PayinListQuery = {
  status?: PayinOrderStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  cursor?: string;
};

export type SmsEvidenceResult = {
  accepted: boolean;
};
