import { apiRequest, apiRequestEnvelope } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/errors';
import { getAccessToken } from '@/lib/auth/secure-tokens';

import type {
  AccountApps,
  AccountEmployee,
  AccountPerformance,
  AccountStatus,
  CustomerAccountProfile,
  CustomerTelegram,
  DailyTurnover,
  EmployeeDraft,
  EmployeeList,
  EmployeeListQuery,
  EmployeeStatus,
  FeeStructure,
  PasswordChangeResult,
  PercentSample,
  PerformancePeriod,
  ProfilePatch,
  SpeedSample,
  TwoFactorStatus,
  WorkingHours,
  WorkingShift,
} from '@/features/profile/types/account';

/**
 * Customer account settings.
 * Identity comes from the Bearer session. Never send customerId.
 *
 * GET/PATCH  /profile
 * GET        /profile/performance
 * GET        /profile/status
 * GET/PATCH  /working-hours
 * GET/POST   /employees
 * PATCH      /employees/:id
 * PATCH      /employees/:id/status
 * POST       /security/change-password
 * GET        /security/2fa
 * GET        /fees
 * GET        /app-config
 * GET        /telegram/status
 * POST       /telegram/connect
 * POST       /telegram/disconnect
 */

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

function unexpected(): never {
  throw new ApiClientError({
    code: 'UNKNOWN',
    message: 'Unexpected response from Clearpay.',
    status: 200,
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) unexpected();
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string') unexpected();
  return value;
}

function readNullableString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  if (value == null) return null;
  if (typeof value !== 'string') unexpected();
  return value;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  if (typeof value !== 'boolean') unexpected();
  return value;
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) unexpected();
  return value;
}

function readNullableNumber(
  record: Record<string, unknown>,
  key: string,
): number | null {
  const value = record[key];
  if (value == null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) unexpected();
  return value;
}

function mapTelegram(value: unknown): CustomerTelegram | null {
  if (value == null) return null;
  const record = asRecord(value);
  return {
    connected: readBoolean(record, 'connected'),
    username: readNullableString(record, 'username'),
  };
}

function mapProfile(data: unknown): CustomerAccountProfile {
  const root = asRecord(data);
  const profile = asRecord(root.profile);
  const mobile = readNullableString(profile, 'mobile');
  return {
    name: readString(profile, 'name'),
    email: readString(profile, 'email'),
    mobile: mobile === '' ? null : mobile,
    mobileVerified: readBoolean(profile, 'mobileVerified'),
    telegram: mapTelegram(profile.telegram),
    upiId: readNullableString(profile, 'upiId'),
  };
}

function mapSpeed(value: unknown): SpeedSample {
  const record = asRecord(value);
  return {
    averageMs: readNullableNumber(record, 'averageMs'),
    sampleCount: readNumber(record, 'sampleCount'),
  };
}

function mapPercent(value: unknown): PercentSample {
  const record = asRecord(value);
  return {
    percent: readNullableNumber(record, 'percent'),
    ...(typeof record.successful === 'number' ? { successful: record.successful } : {}),
    ...(typeof record.eligible === 'number' ? { eligible: record.eligible } : {}),
    ...(typeof record.posted === 'number' ? { posted: record.posted } : {}),
    ...(typeof record.total === 'number' ? { total: record.total } : {}),
    ...(typeof record.autoConfirmed === 'number'
      ? { autoConfirmed: record.autoConfirmed }
      : {}),
    ...(typeof record.completed === 'number' ? { completed: record.completed } : {}),
  };
}

function mapTurnover(value: unknown): DailyTurnover {
  const record = asRecord(value);
  const days = record.days;
  if (!Array.isArray(days)) unexpected();
  return {
    currency: readString(record, 'currency'),
    totalAmountMinor: readNumber(record, 'totalAmountMinor'),
    averageAmountMinor: readNumber(record, 'averageAmountMinor'),
    days: days.map((day) => {
      const item = asRecord(day);
      return {
        date: readString(item, 'date'),
        amountMinor: readNumber(item, 'amountMinor'),
      };
    }),
  };
}

function mapPerformance(data: unknown): AccountPerformance {
  const root = asRecord(data);
  const performance = asRecord(root.performance);
  const score = asRecord(performance.traderScore);
  return {
    period: readString(performance, 'period'),
    from: readString(performance, 'from'),
    to: readString(performance, 'to'),
    timezone: readString(performance, 'timezone'),
    traderScore: {
      value: readNullableNumber(score, 'value'),
      trend: readNullableNumber(score, 'trend'),
    },
    payoutSpeed: mapSpeed(performance.payoutSpeed),
    payinSpeed: mapSpeed(performance.payinSpeed),
    conversionRate: mapPercent(performance.conversionRate),
    settlementPerformance: mapPercent(performance.settlementPerformance),
    statementPerformance: mapPercent(performance.statementPerformance),
    autoConfirmPerformance: mapPercent(performance.autoConfirmPerformance),
    dailyTurnover: mapTurnover(performance.dailyTurnover),
  };
}

function mapStatus(data: unknown): AccountStatus {
  const root = asRecord(data);
  const status = asRecord(root.status);
  return {
    status: readString(status, 'status'),
    label: readString(status, 'label'),
    message: readString(status, 'message'),
    canCustomerChange: readBoolean(status, 'canCustomerChange'),
    updatedAt: readString(status, 'updatedAt'),
  };
}

function mapShift(value: unknown): WorkingShift {
  const record = asRecord(value);
  return {
    start: readString(record, 'start'),
    end: readString(record, 'end'),
  };
}

function mapWorkingHours(data: unknown): WorkingHours {
  const root = asRecord(data);
  const hours = asRecord(root.workingHours);
  const shifts = hours.shifts;
  if (!Array.isArray(shifts)) unexpected();
  return {
    shifts: shifts.map(mapShift),
    maxShifts: readNumber(hours, 'maxShifts'),
    canCustomerChange: readBoolean(hours, 'canCustomerChange'),
  };
}

function mapEmployee(value: unknown): AccountEmployee {
  const record = asRecord(value);
  const status = readString(record, 'status');
  if (status !== 'ACTIVE' && status !== 'INACTIVE') unexpected();
  return {
    id: readString(record, 'id'),
    name: readString(record, 'name'),
    email: readNullableString(record, 'email'),
    mobile: readNullableString(record, 'mobile'),
    role: readString(record, 'role'),
    status,
    createdAt: readString(record, 'createdAt'),
    updatedAt: readString(record, 'updatedAt'),
  };
}

function mapListMeta(meta: unknown): Pick<EmployeeList, 'page' | 'limit' | 'total' | 'totalPages'> {
  const record = asRecord(meta);
  return {
    page: readNumber(record, 'page'),
    limit: readNumber(record, 'limit'),
    total: readNumber(record, 'total'),
    totalPages: readNumber(record, 'totalPages'),
  };
}

function employeePath(id: string): string {
  if (!/^emp_[A-Za-z0-9]+$/.test(id)) {
    throw new ApiClientError({
      code: 'VALIDATION_ERROR',
      message: 'That employee could not be found.',
      status: 400,
    });
  }
  return `/employees/${encodeURIComponent(id)}`;
}

export async function fetchAccountProfile(): Promise<CustomerAccountProfile> {
  const accessToken = await requireAccessToken();
  const data = await apiRequest<unknown>('/profile', { method: 'GET', accessToken });
  return mapProfile(data);
}

export async function updateAccountProfile(
  input: ProfilePatch,
): Promise<CustomerAccountProfile> {
  const accessToken = await requireAccessToken();
  const body: Record<string, string> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.mobile !== undefined) body.mobile = input.mobile;
  if (input.upiId !== undefined) body.upiId = input.upiId;
  if (Object.keys(body).length === 0) {
    throw new ApiClientError({
      code: 'VALIDATION_ERROR',
      message: 'Change a profile field before saving.',
      status: 400,
    });
  }
  const data = await apiRequest<unknown>('/profile', {
    method: 'PATCH',
    accessToken,
    body,
  });
  return mapProfile(data);
}

export async function fetchAccountPerformance(options: {
  period: PerformancePeriod;
  startDate?: string;
  endDate?: string;
}): Promise<AccountPerformance> {
  const accessToken = await requireAccessToken();
  const query = new URLSearchParams();
  if (options.period === 'custom') {
    if (!options.startDate || !options.endDate) {
      throw new ApiClientError({
        code: 'VALIDATION_ERROR',
        message: 'Choose a start and end date.',
        status: 400,
      });
    }
    query.set('startDate', options.startDate);
    query.set('endDate', options.endDate);
  } else {
    query.set('period', options.period);
  }
  const data = await apiRequest<unknown>(`/profile/performance?${query.toString()}`, {
    method: 'GET',
    accessToken,
  });
  return mapPerformance(data);
}

export async function fetchAccountStatus(): Promise<AccountStatus> {
  const accessToken = await requireAccessToken();
  const data = await apiRequest<unknown>('/profile/status', {
    method: 'GET',
    accessToken,
  });
  return mapStatus(data);
}

export async function fetchWorkingHours(): Promise<WorkingHours> {
  const accessToken = await requireAccessToken();
  const data = await apiRequest<unknown>('/working-hours', {
    method: 'GET',
    accessToken,
  });
  return mapWorkingHours(data);
}

export async function updateWorkingHours(shifts: WorkingShift[]): Promise<WorkingHours> {
  const accessToken = await requireAccessToken();
  const data = await apiRequest<unknown>('/working-hours', {
    method: 'PATCH',
    accessToken,
    body: { shifts },
  });
  return mapWorkingHours(data);
}

export async function fetchEmployees(query: EmployeeListQuery): Promise<EmployeeList> {
  const accessToken = await requireAccessToken();
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('limit', String(query.limit));
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.status) params.set('status', query.status);
  const envelope = await apiRequestEnvelope<{ items: unknown[] }>(
    `/employees?${params.toString()}`,
    { method: 'GET', accessToken },
  );
  const root = asRecord(envelope.data);
  const items = root.items;
  if (!Array.isArray(items)) unexpected();
  const meta = mapListMeta(envelope.meta);
  return { items: items.map(mapEmployee), ...meta };
}

export async function createEmployee(input: EmployeeDraft): Promise<AccountEmployee> {
  const accessToken = await requireAccessToken();
  const body: Record<string, string> = { name: input.name.trim() };
  if (input.email) body.email = input.email.trim().toLowerCase();
  if (input.mobile) body.mobile = input.mobile.trim();
  if (input.role?.trim()) body.role = input.role.trim();
  const data = await apiRequest<unknown>('/employees', {
    method: 'POST',
    accessToken,
    body,
  });
  return mapEmployee(asRecord(data).employee);
}

export async function updateEmployee(
  id: string,
  patch: EmployeeDraft,
): Promise<AccountEmployee> {
  const accessToken = await requireAccessToken();
  const body: Record<string, string | null> = {};
  if (patch.name !== undefined) body.name = patch.name.trim();
  if (patch.email !== undefined) body.email = patch.email ? patch.email.trim().toLowerCase() : null;
  if (patch.mobile !== undefined) body.mobile = patch.mobile ? patch.mobile.trim() : null;
  if (patch.role !== undefined) body.role = patch.role.trim();
  const data = await apiRequest<unknown>(employeePath(id), {
    method: 'PATCH',
    accessToken,
    body,
  });
  return mapEmployee(asRecord(data).employee);
}

export async function updateEmployeeStatus(
  id: string,
  status: EmployeeStatus,
): Promise<AccountEmployee> {
  const accessToken = await requireAccessToken();
  const data = await apiRequest<unknown>(`${employeePath(id)}/status`, {
    method: 'PATCH',
    accessToken,
    body: { status },
  });
  return mapEmployee(asRecord(data).employee);
}

export async function fetchFeeStructure(): Promise<FeeStructure> {
  const accessToken = await requireAccessToken();
  const data = await apiRequest<unknown>('/fees', { method: 'GET', accessToken });
  const fees = asRecord(asRecord(data).fees);
  const source = asRecord(fees.source);
  return {
    payinFee: readNumber(fees, 'payinFee'),
    payoutFee: readNumber(fees, 'payoutFee'),
    unit: readString(fees, 'unit'),
    source: {
      payinFee: readString(source, 'payinFee'),
      payoutFee: readString(source, 'payoutFee'),
    },
  };
}

export async function fetchTwoFactorStatus(): Promise<TwoFactorStatus> {
  const accessToken = await requireAccessToken();
  const data = await apiRequest<unknown>('/security/2fa', {
    method: 'GET',
    accessToken,
  });
  const twoFactor = asRecord(asRecord(data).twoFactor);
  return {
    enabled: readBoolean(twoFactor, 'enabled'),
    method: readNullableString(twoFactor, 'method'),
    enrollmentAvailable: readBoolean(twoFactor, 'enrollmentAvailable'),
  };
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<PasswordChangeResult> {
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>('/security/change-password', {
    method: 'POST',
    accessToken,
    body: {
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    },
  });
  const data = asRecord(envelope.data);
  return {
    changed: readBoolean(data, 'changed'),
    sessionsRevoked: readBoolean(data, 'sessionsRevoked'),
    message: typeof envelope.message === 'string' ? envelope.message : null,
  };
}

export async function fetchAccountApps(): Promise<AccountApps> {
  const accessToken = await requireAccessToken();
  const data = await apiRequest<unknown>('/app-config', { method: 'GET', accessToken });
  const config = asRecord(asRecord(data).appConfig);
  return {
    androidAppUrl: readString(config, 'androidAppUrl'),
    forwarderAppUrl: readString(config, 'forwarderAppUrl'),
  };
}

export async function fetchTelegramStatus(): Promise<CustomerTelegram> {
  const accessToken = await requireAccessToken();
  const data = await apiRequest<unknown>('/telegram/status', {
    method: 'GET',
    accessToken,
  });
  return mapTelegram(asRecord(data).telegram) ?? unexpected();
}

export async function connectTelegram(username: string): Promise<CustomerTelegram> {
  const accessToken = await requireAccessToken();
  const data = await apiRequest<unknown>('/telegram/connect', {
    method: 'POST',
    accessToken,
    body: { username: username.replace(/^@+/, '') },
  });
  return mapTelegram(asRecord(data).telegram) ?? unexpected();
}

export async function disconnectTelegram(): Promise<CustomerTelegram> {
  const accessToken = await requireAccessToken();
  const data = await apiRequest<unknown>('/telegram/disconnect', {
    method: 'POST',
    accessToken,
    body: {},
  });
  return mapTelegram(asRecord(data).telegram) ?? unexpected();
}
