export type DashboardSummary = {
  score: {
    value: number;
    trend?: number | null;
  };
  balance: {
    netBalance: number;
    netBalanceMinor: number;
    /** INR major from the server quote. 0 when no exchange rate is configured. */
    stakedDeposit: number;
    /** INR paise. Format only — do not multiply by the exchange rate again. */
    stakedDepositMinor: number;
    usdtBalance: number;
    usdtBalanceMinor: number;
    cryptoAmount: number;
    cryptoCurrency: string;
    /** INR major per 1 USDT. Null until the server has a rate. */
    exchangeRate: number | null;
    exchangeRateMinor: number | null;
    /** INR major. Null when `exchangeRate` is null. */
    fiatAmount: number | null;
    /** INR paise. This is the value the home card formats. */
    fiatAmountMinor: number | null;
    fiatCurrency: string;
    currency: string;
    usdtCurrency: string;
  };
  cryptoSettlement: {
    enabled: boolean;
    label: string;
    bestRate: boolean | null;
  };
  statistics: {
    totalPayins: number;
    totalPayouts: number;
    conversionRate: number;
    totalTransactions: number;
  };
  activity: {
    activePayins: number;
    successfulPayins: number;
    pendingPayouts: number;
    completedPayouts: number;
  };
};

export type DashboardSummaryResponse = {
  summary: DashboardSummary;
};

export type NotificationType =
  | 'INFO'
  | 'WARNING'
  | 'SUCCESS'
  | 'ERROR'
  | 'SYSTEM'
  | 'ANNOUNCEMENT'
  | 'PAYMENT'
  | 'SECURITY';

export type NotificationActionType = 'NAVIGATE' | 'DEEP_LINK' | 'EXTERNAL_URL';

export type NotificationAction = {
  label: string;
  type: NotificationActionType;
  target: string;
};

export type CustomerNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  isRead: boolean;
  isNew: boolean;
  action?: NotificationAction;
  createdAt: string;
  readAt?: string | null;
};

export type NotificationCount = {
  total: number;
  unread: number;
};

export type NotificationsListResult = {
  items: CustomerNotification[];
  unreadCount: number;
  /** Server total when `meta.total` or `data.total` is present. */
  total: number | null;
  page: number;
  limit: number;
  totalPages: number | null;
  nextCursor: string | null;
  hasMore: boolean;
};

export type DashboardEarnings = {
  period: 'today' | '7d' | '30d' | 'custom';
  from: string;
  to: string;
  timezone: string;
  earnings: number;
  earningsMinor: number;
  currency: string;
  payinSuccessRate: number;
};

export type DashboardEarningsResponse = DashboardEarnings;
