/** Customer receiving accounts. Identity and money come from the API. */

export type AccountKind = 'upi_bank' | 'gateway';

export type AccountChannel = 'payin' | 'payout';

export type ChannelActivationStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'PENDING'
  | 'SUSPENDED'
  | 'DISCONNECTED'
  | 'NOT_ELIGIBLE';

export type ConnectivityStatus =
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'error';

export type AccountListStatus =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'pending'
  | 'disconnected';

export type ChannelFilter = 'active' | 'inactive';

export type AccountActiveRef = {
  publicId: string;
  name: string;
};

export type AccountChannelState = {
  status: ChannelActivationStatus;
  canActivate: boolean;
  canDeactivate: boolean;
  unavailableReason: string | null;
};

export type ReceivingAccount = {
  publicId: string;
  name: string;
  provider: string;
  providerCode: string;
  kind: AccountKind;
  /** Display value. The API decides masking. */
  identifier: string | null;
  identifierLabel: string;
  phone: string | null;
  totalReceivedMinor: number | null;
  currency: string;
  acceptedTransactionCount: number | null;
  transactionLimit: number | null;
  /** Backend-computed. Never derived on the client. */
  conversionPercent: number | null;
  conversionSuccessful: number | null;
  conversionEligible: number | null;
  workState: string | null;
  connectivity: ConnectivityStatus;
  verificationStatus: string | null;
  verificationMessage: string | null;
  payin: AccountChannelState;
  payout: AccountChannelState;
  canCopyIdentifier: boolean;
  canReconnect: boolean;
};

export type AccountProviderCount = {
  id: string;
  label: string;
  count: number;
};

export type AccountsSummary = {
  total: number;
  inWork: number;
  inWorkPercent: number | null;
  activePayin: AccountActiveRef | null;
  activePayout: AccountActiveRef | null;
  counts: {
    all: number;
    active: number;
    inactive: number;
  };
  providers: AccountProviderCount[];
};

export type AccountsPage = {
  items: ReceivingAccount[];
  summary: AccountsSummary | null;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  nextCursor: string | null;
};

export type AccountListQuery = {
  kind: AccountKind;
  limit: number;
  page?: number;
  cursor?: string;
  search?: string;
  status?: AccountListStatus;
  provider?: string;
  payinStatus?: ChannelFilter;
  payoutStatus?: ChannelFilter;
  connectivity?: ConnectivityStatus;
  verification?: string;
};

export type AccountTransaction = {
  publicId: string;
  amountMinor: number | null;
  currency: string;
  status: string;
  createdAt: string | null;
};

export type ActivationHistoryEntry = {
  channel: AccountChannel | null;
  action: string;
  at: string | null;
};

export type AccountDetails = {
  account: ReceivingAccount;
  recentTransactions: AccountTransaction[];
  activationHistory: ActivationHistoryEntry[];
};

export type AccountFormFieldType = 'text' | 'tel' | 'select' | 'number';

export type AccountFormOption = {
  value: string;
  label: string;
};

export type AccountFormField = {
  key: string;
  label: string;
  required: boolean;
  type: AccountFormFieldType;
  placeholder: string | null;
  section: 'basic' | 'additional';
  options: AccountFormOption[];
};

export type AccountFormConfig = {
  kind: AccountKind;
  title: string;
  description: string | null;
  fields: AccountFormField[];
};

export type AccountProviderOption = {
  id: string;
  label: string;
  kind: AccountKind;
  payin: boolean;
  payout: boolean;
};
