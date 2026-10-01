/** Shapes returned by the customer account-settings API. */

export type PerformancePeriod = '7d' | '30d' | '90d' | 'custom';

export type CustomerTelegram = {
  connected: boolean;
  username: string | null;
};

export type CustomerAccountProfile = {
  name: string;
  email: string;
  mobile: string | null;
  mobileVerified: boolean;
  telegram: CustomerTelegram | null;
  upiId: string | null;
};

export type ProfilePatch = {
  name?: string;
  mobile?: string;
  upiId?: string;
};

export type SpeedSample = {
  averageMs: number | null;
  sampleCount: number;
};

export type PercentSample = {
  percent: number | null;
  successful?: number;
  eligible?: number;
  posted?: number;
  total?: number;
  autoConfirmed?: number;
  completed?: number;
};

export type DailyTurnover = {
  currency: string;
  totalAmountMinor: number;
  averageAmountMinor: number;
  days: { date: string; amountMinor: number }[];
};

export type AccountPerformance = {
  period: string;
  from: string;
  to: string;
  timezone: string;
  traderScore: { value: number | null; trend: number | null };
  payoutSpeed: SpeedSample;
  payinSpeed: SpeedSample;
  conversionRate: PercentSample;
  settlementPerformance: PercentSample;
  statementPerformance: PercentSample;
  autoConfirmPerformance: PercentSample;
  dailyTurnover: DailyTurnover;
};

export type AccountStatus = {
  status: string;
  label: string;
  message: string;
  canCustomerChange: boolean;
  updatedAt: string;
};

export type WorkingShift = {
  start: string;
  end: string;
};

export type WorkingHours = {
  shifts: WorkingShift[];
  maxShifts: number;
  canCustomerChange: boolean;
};

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';

export type AccountEmployee = {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  role: string;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeListQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: EmployeeStatus;
};

export type EmployeeList = {
  items: AccountEmployee[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type EmployeeDraft = {
  name: string;
  email?: string | null;
  mobile?: string | null;
  role?: string;
};

export type FeeStructure = {
  payinFee: number;
  payoutFee: number;
  unit: string;
  source: { payinFee: string; payoutFee: string };
};

export type TwoFactorStatus = {
  enabled: boolean;
  method: string | null;
  enrollmentAvailable: boolean;
};

export type AccountApps = {
  androidAppUrl: string;
  forwarderAppUrl: string;
};

export type PasswordChangeResult = {
  changed: boolean;
  sessionsRevoked: boolean;
  message: string | null;
};
