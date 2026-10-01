/** Customer payout orders. Amounts, deadlines, and status come from the server. */

export const PAYOUT_ORDER_STATUSES = [
  'CREATED',
  'ASSIGNED',
  'ACCEPTED',
  'ACTION_REQUIRED',
  'PAYMENT_IN_PROGRESS',
  'PROOF_UPLOADED',
  'PROOF_VALIDATING',
  'SUBMITTED',
  'UNDER_REVIEW',
  'COMPLETED',
  'FAILED',
  'EXPIRED',
  'CANCELLED',
  'DISPUTED',
] as const;

export type KnownPayoutOrderStatus = (typeof PAYOUT_ORDER_STATUSES)[number];

/** Server-defined. Known values are labels only — unknown states stay visible. */
export type PayoutOrderStatus = string;

export const PAYOUT_SUMMARY_STATUSES = [
  'ASSIGNED',
  'ACTION_REQUIRED',
  'PAYMENT_IN_PROGRESS',
  'UNDER_REVIEW',
  'COMPLETED',
  'EXPIRED',
] as const;

export type PayoutSummaryStatus = (typeof PAYOUT_SUMMARY_STATUSES)[number];

export const PAYOUT_PAYMENT_METHODS = ['UPI', 'IMPS', 'NEFT', 'BANK_TRANSFER'] as const;

export type PayoutPaymentMethod = (typeof PAYOUT_PAYMENT_METHODS)[number];

export const PAYOUT_UPI_APPS = ['DEFAULT', 'GPAY', 'PHONEPE', 'PAYTM'] as const;

export type PayoutUpiApp = (typeof PAYOUT_UPI_APPS)[number];

export const PAYOUT_HELP_REASONS = [
  'PAYMENT_ISSUE',
  'BENEFICIARY_ISSUE',
  'UPI_NOT_WORKING',
  'BANK_TRANSFER_ISSUE',
  'PROOF_REJECTED',
  'TIMER_ISSUE',
  'OTHER',
] as const;

export type PayoutHelpReason = (typeof PAYOUT_HELP_REASONS)[number];

export const PAYOUT_PRIORITIES = ['HIGH', 'NORMAL', 'LOW'] as const;

export type PayoutPriority = (typeof PAYOUT_PRIORITIES)[number];

export const PAYOUT_SLA_FILTERS = ['ON_TRACK', 'DUE_SOON', 'BREACHED'] as const;

export type PayoutSlaFilter = (typeof PAYOUT_SLA_FILTERS)[number];

/** Counts from `data.summary`. `byStatus` keys are order statuses such as `ASSIGNED`. */
export type PayoutOrderSummary = {
  total: number;
  byStatus: Record<string, number>;
};

export type PayoutRule = {
  code: string;
  label: string;
  durationSeconds: number;
  warningThresholdSeconds: number;
  enabled: boolean;
};

export type PayoutOrderCounts = Record<PayoutSummaryStatus, number>;

export type PayoutListFilters = {
  status?: PayoutSummaryStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: PayoutPaymentMethod;
};

export type PayoutOrderListItem = {
  publicId: string;
  displayId: string;
  status: PayoutOrderStatus;
  statusLabel: string;
  /** Integer minor units. `150000` INR is ₹1,500.00. */
  amount: number;
  currency: string;
  beneficiaryName: string;
  methodSummary: string | null;
  actionRequired: boolean;
  actionLabel: string | null;
  createdAt: string;
  deadlineAt: string | null;
  serverTime: string | null;
};

export type PayoutOrdersPage = {
  items: PayoutOrderListItem[];
  summary: PayoutOrderSummary;
  counts: PayoutOrderCounts;
  rules: PayoutRule[];
  serverTime: string | null;
  page: number;
  totalPages: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export type PayoutKycStatus = 'KYC_VERIFIED' | 'KYC_PENDING' | 'KYC_FAILED' | string;

export type PayoutBeneficiary = {
  name: string;
  kycStatus: PayoutKycStatus;
  kycLabel: string;
  paymentMethodLabel: string | null;
  upiId: string | null;
  accountNumber: string | null;
  accountNumberCopy: string | null;
  ifsc: string | null;
  ifscCopy: string | null;
  bankAndBranch: string | null;
  mobile: string | null;
  mobileCopy: string | null;
};

export type PayoutAdjustment = {
  label: string;
};

export type PayoutCollateral = {
  status: string;
  title: string;
  amountLabel: string;
  message: string | null;
  confirmed: boolean;
};

export type PayoutSla = {
  ruleCode: string | null;
  label: string | null;
  durationSeconds: number | null;
  acceptedAt: string | null;
  deadlineAt: string | null;
  remainingMs: number | null;
  warningTitle: string | null;
  warningDescription: string | null;
  penaltyDescription: string | null;
  allowLateSubmission: boolean;
};

export type PayoutAction = {
  label: string;
};

export type PayoutUploadConfig = {
  maxBytes: number;
  mimeTypes: string[];
};

export type PayoutReceiptStatus =
  | 'NONE'
  | 'UPLOADING'
  | 'VALIDATING'
  | 'READY'
  | 'FAILED'
  | string;

export type PayoutReceipt = {
  id: string | null;
  fileName: string | null;
  sizeBytes: number | null;
  mimeType: string | null;
  status: PayoutReceiptStatus;
  previewUrl: string | null;
  uploadedAt: string | null;
  failureMessage: string | null;
};

export type PayoutReference = {
  type: string;
  required: boolean;
  pattern: string | null;
  length: number | null;
  label: string;
  hint: string | null;
  value: string | null;
  matchesReceipt: boolean;
};

export type PayoutOcr = {
  utr: string | null;
  amountLabel: string | null;
  date: string | null;
  time: string | null;
  beneficiary: string | null;
  bank: string | null;
  sender: string | null;
  transactionStatus: string | null;
};

export type PayoutRejection = {
  code: string | null;
  message: string;
};

export type PayoutRealtime = {
  mode: 'poll' | 'websocket';
  pollIntervalMs: number | null;
  socketUrl: string | null;
};

export type PayoutOrderDetail = PayoutOrderListItem & {
  payable: boolean;
  proofId: string | null;
  availableActions: string[];
  canAccept: boolean;
  selectedMethod: PayoutPaymentMethod | null;
  availableMethods: PayoutPaymentMethod[];
  adjustment: PayoutAdjustment | null;
  collateral: PayoutCollateral | null;
  beneficiary: PayoutBeneficiary | null;
  sla: PayoutSla;
  action: PayoutAction | null;
  upload: PayoutUploadConfig | null;
  receipt: PayoutReceipt | null;
  reference: PayoutReference;
  ocr: PayoutOcr | null;
  rejection: PayoutRejection | null;
  securityNotice: string | null;
  proofStepLabel: string | null;
  verificationStatus: string | null;
  rules: PayoutRule[];
  realtime: PayoutRealtime;
  upiApps: PayoutUpiApp[];
};

export type PayoutPaymentIntent = {
  method: PayoutPaymentMethod;
  uri: string | null;
  amountMinor: number | null;
  currency: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  bankName: string | null;
};

export type PayoutProofUploadTicket = {
  uploadId: string;
  uploadUrl: string;
  expiresAt: string | null;
  requiredHeaders: Record<string, string>;
};

export type PayoutProofValidation = {
  valid: boolean;
  confidence: number | null;
  extracted: PayoutOcr;
  issues: string[];
};

export type PayoutSubmission = {
  orderId: string;
  status: string;
  proofStatus: string | null;
  reference: string | null;
};

export const PAYOUT_CANDIDATE_ACTIONS = ['IGNORE', 'REVIEW', 'READY_TO_SUBMIT', 'AUTO_SUBMIT'] as const;

export type PayoutCandidateAction = (typeof PAYOUT_CANDIDATE_ACTIONS)[number];

export const PAYMENT_SMS_VERDICTS = ['MATCH_CANDIDATE', 'NOT_RELEVANT', 'UNKNOWN'] as const;

export type PaymentSmsVerdict = (typeof PAYMENT_SMS_VERDICTS)[number];

/**
 * Fields extracted for one payment SMS. Integer money is `amountMinor`.
 * The raw message and sender address are not part of this object.
 */
export type PaymentCandidate = {
  source: 'ANDROID_SMS';
  senderHash: string;
  amountMinor: number;
  currency: string;
  transactionReference: string | null;
  timestamp: string;
  accountLast4: string | null;
  provider: string | null;
  confidence: number;
  direction: 'DEBIT' | 'CREDIT' | null;
  transactionStatus: 'SUCCESS' | 'PENDING' | 'FAILED' | 'UNKNOWN';
  /** Used only for on-device matching. Never sent to the API. */
  beneficiaryName: string | null;
  verdict: PaymentSmsVerdict;
  dedupeKey: string;
};

export type PayoutPaymentCandidate = PaymentCandidate;

export type PayoutCandidateResult = {
  matched: boolean;
  confidence: number | null;
  candidateId: string | null;
  action: PayoutCandidateAction;
  orderPublicId: string | null;
};

export type PayoutPushRegistration = {
  platform: 'android' | 'ios';
  pushToken: string;
  deviceId: string;
  appVersion: string;
};
