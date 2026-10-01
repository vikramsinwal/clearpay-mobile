import { apiRequest, apiRequestEnvelope } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/errors';
import { getAccessToken } from '@/lib/auth/secure-tokens';

import type {
  CustomerNotification,
  DashboardEarningsResponse,
  DashboardSummaryResponse,
  NotificationAction,
  NotificationActionType,
  NotificationType,
  NotificationsListResult,
} from '@/features/home/types';

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

/** GET /api/v1/customer/dashboard/summary */
export async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  const accessToken = await requireAccessToken();
  return apiRequest<DashboardSummaryResponse>('/dashboard/summary', {
    method: 'GET',
    accessToken,
  });
}

/** GET /api/v1/customer/dashboard/earnings */
export async function fetchDashboardEarnings(options: {
  period: 'today' | '7d' | '30d' | 'custom';
  startDate?: string;
  endDate?: string;
}): Promise<DashboardEarningsResponse> {
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
  return apiRequest<DashboardEarningsResponse>(
    `/dashboard/earnings?${query.toString()}`,
    { method: 'GET', accessToken },
  );
}

const NOTIFICATION_TYPES = new Set<NotificationType>([
  'INFO',
  'WARNING',
  'SUCCESS',
  'ERROR',
  'SYSTEM',
  'ANNOUNCEMENT',
  'PAYMENT',
  'SECURITY',
]);

const ACTION_TYPES = new Set<NotificationActionType>([
  'NAVIGATE',
  'DEEP_LINK',
  'EXTERNAL_URL',
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown> | null, key: string): string | null {
  if (!record) return null;
  const value = record[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readOptionalNumber(
  record: Record<string, unknown> | null,
  key: string,
): number | null {
  if (!record) return null;
  const value = record[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function readNotificationType(value: string | null): NotificationType {
  const normalized = value?.toUpperCase() as NotificationType | undefined;
  if (normalized && NOTIFICATION_TYPES.has(normalized)) return normalized;
  return 'INFO';
}

function readAction(value: unknown): NotificationAction | undefined {
  const record = asRecord(value);
  const label = readString(record, 'label');
  const type = readString(record, 'type')?.toUpperCase() as NotificationActionType | undefined;
  const target = readString(record, 'target');
  if (!label || !type || !ACTION_TYPES.has(type) || !target) return undefined;
  return { label, type, target };
}

function readNotification(value: unknown): CustomerNotification | null {
  const record = asRecord(value);
  const id = readString(record, 'id');
  if (!id) return null;
  const message = readString(record, 'message') ?? readString(record, 'body') ?? '';
  const title = readString(record, 'title') ?? 'Notification';
  const isRead = record?.isRead === true;
  const isNew = typeof record?.isNew === 'boolean' ? record.isNew : !isRead;
  const icon = readString(record, 'icon') ?? undefined;
  const action = readAction(record?.action);
  return {
    id,
    type: readNotificationType(readString(record, 'type')),
    title,
    message,
    ...(icon ? { icon } : {}),
    isRead,
    isNew,
    ...(action ? { action } : {}),
    createdAt: readString(record, 'createdAt') ?? '',
    readAt: readString(record, 'readAt'),
  };
}

/**
 * GET /api/v1/customer/dashboard/notifications
 * Home widget only. The alerts screen uses `/notifications`.
 */
export async function fetchNotifications(options?: {
  page?: number;
  limit?: number;
}): Promise<NotificationsListResult> {
  const accessToken = await requireAccessToken();
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 5;
  const query = new URLSearchParams();
  query.set('page', String(page));
  query.set('limit', String(limit));

  const envelope = await apiRequestEnvelope<unknown>(
    `/dashboard/notifications?${query.toString()}`,
    { method: 'GET', accessToken },
  );
  const root = asRecord(envelope.data);
  const rawItems = root?.items;
  if (!Array.isArray(rawItems)) {
    throw new ApiClientError({
      code: 'UNKNOWN',
      message: 'Unable to load notifications.',
      status: 200,
    });
  }

  const items = rawItems
    .map(readNotification)
    .filter((item): item is CustomerNotification => item !== null);
  const meta = asRecord(envelope.meta);
  const total = readOptionalNumber(meta, 'total') ?? readOptionalNumber(root, 'total');
  const totalPages =
    readOptionalNumber(meta, 'totalPages') ?? readOptionalNumber(root, 'totalPages');
  const resolvedPage = readOptionalNumber(meta, 'page') ?? page;
  const nextCursor =
    readString(meta, 'nextCursor') ??
    readString(root, 'nextCursor') ??
    null;
  const unreadCount = Math.max(0, readOptionalNumber(root, 'unreadCount') ?? 0);
  const hasMore =
    items.length === 0
      ? false
      : nextCursor
        ? true
        : totalPages != null
          ? resolvedPage < totalPages
          : total != null
            ? resolvedPage * limit < total
            : items.length >= limit;

  return {
    items,
    unreadCount,
    total,
    page: resolvedPage,
    limit,
    totalPages,
    nextCursor,
    hasMore,
  };
}

