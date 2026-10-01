import { apiRequestEnvelope } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/errors';
import { getAccessToken } from '@/lib/auth/secure-tokens';

import type {
  CustomerNotification,
  NotificationAction,
  NotificationActionType,
  NotificationCount,
  NotificationType,
  NotificationsListResult,
} from '@/features/home/types';

const NOTIFICATION_ID = /^ntf_[A-Za-z0-9]+$/;

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

const LIST_STATUSES = new Set([
  'UNREAD',
  'READ',
  'ALL',
  'PENDING',
  'SENT',
  'FAILED',
]);

export type CustomerNotificationListQuery = {
  limit?: number;
  cursor?: string | null;
  page?: number;
  status?: 'UNREAD' | 'READ' | 'ALL' | 'PENDING' | 'SENT' | 'FAILED';
  type?: NotificationType;
};

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

function loadError(): ApiClientError {
  return new ApiClientError({
    code: 'UNKNOWN',
    message: 'Unable to load notifications.',
    status: 200,
  });
}

function assertNotificationId(id: string): string {
  const trimmed = id.trim();
  if (!NOTIFICATION_ID.test(trimmed)) {
    throw new ApiClientError({
      code: 'VALIDATION_ERROR',
      message: 'That notification could not be found.',
      status: 400,
    });
  }
  return trimmed;
}

function isUnsafeTarget(target: string): boolean {
  const lower = target.trim().toLowerCase();
  return (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('vbscript:')
  );
}

function isHttpsUrl(target: string): boolean {
  try {
    return new URL(target).protocol === 'https:';
  } catch {
    return false;
  }
}

function readAction(value: unknown): NotificationAction | undefined {
  if (value == null) return undefined;
  const record = asRecord(value);
  const label = readString(record, 'label');
  const type = readString(record, 'type')?.toUpperCase() as NotificationActionType | undefined;
  const target = readString(record, 'target');
  if (!label || !type || !ACTION_TYPES.has(type) || !target || isUnsafeTarget(target)) {
    return undefined;
  }
  if (type === 'NAVIGATE' && (target.includes('://') || target.startsWith('//') || /\s/.test(target))) {
    return undefined;
  }
  if (type === 'EXTERNAL_URL' && !isHttpsUrl(target)) return undefined;
  if (type === 'DEEP_LINK' && !target.startsWith('clearpay://') && !isHttpsUrl(target)) {
    return undefined;
  }
  return { label, type, target };
}

function readNotification(value: unknown): CustomerNotification | null {
  const record = asRecord(value);
  const id = readString(record, 'id');
  if (!id || !NOTIFICATION_ID.test(id)) return null;
  const typeValue = readString(record, 'type')?.toUpperCase() as NotificationType | undefined;
  const type = typeValue && NOTIFICATION_TYPES.has(typeValue) ? typeValue : 'INFO';
  const isRead = record?.isRead === true;
  const isNew = typeof record?.isNew === 'boolean' ? record.isNew : !isRead;
  const icon = readString(record, 'icon') ?? undefined;
  const action = readAction(record?.action);
  return {
    id,
    type,
    title: readString(record, 'title') ?? 'Notification',
    message: readString(record, 'message') ?? '',
    ...(icon ? { icon } : {}),
    isRead,
    isNew,
    ...(action ? { action } : {}),
    createdAt: readString(record, 'createdAt') ?? '',
    readAt: record?.readAt === null ? null : readString(record, 'readAt'),
  };
}

function listLimit(value: number | undefined): number {
  if (value == null || !Number.isInteger(value) || value < 1 || value > 100) return 20;
  return value;
}

/**
 * GET /api/v1/customer/notifications
 * Identity comes from the Bearer session. customerId is never sent.
 */
export async function fetchCustomerNotifications(
  options: CustomerNotificationListQuery = {},
): Promise<NotificationsListResult> {
  const accessToken = await requireAccessToken();
  const limit = listLimit(options.limit);
  const query = new URLSearchParams();
  query.set('limit', String(limit));
  if (options.cursor) {
    query.set('cursor', options.cursor);
  } else if (options.page != null && options.page > 1) {
    query.set('page', String(options.page));
  }
  if (options.status && LIST_STATUSES.has(options.status)) {
    query.set('status', options.status);
  }
  if (options.type && NOTIFICATION_TYPES.has(options.type)) {
    query.set('type', options.type);
  }

  const envelope = await apiRequestEnvelope<unknown>(
    `/notifications?${query.toString()}`,
    { method: 'GET', accessToken },
  );
  const root = asRecord(envelope.data);
  const rawItems = root?.items;
  if (!Array.isArray(rawItems)) throw loadError();

  const items = rawItems
    .map(readNotification)
    .filter((item): item is CustomerNotification => item !== null);
  const total = readOptionalNumber(root, 'total');
  const unreadCount = readOptionalNumber(root, 'unreadCount');
  const nextCursor = readString(root, 'nextCursor');
  if (unreadCount == null) throw loadError();

  return {
    items,
    unreadCount: Math.max(0, unreadCount),
    total,
    page: options.page ?? 1,
    limit,
    totalPages: null,
    nextCursor,
    hasMore: Boolean(nextCursor),
  };
}

/** GET /api/v1/customer/notifications/unread-count */
export async function fetchNotificationUnreadCount(): Promise<NotificationCount> {
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>('/notifications/unread-count', {
    method: 'GET',
    accessToken,
  });
  const root = asRecord(envelope.data);
  const total = readOptionalNumber(root, 'total');
  const unread = readOptionalNumber(root, 'unread');
  if (total == null || unread == null) throw loadError();
  return { total: Math.max(0, total), unread: Math.max(0, unread) };
}

/** PATCH /api/v1/customer/notifications/:id/read — no body. */
export async function markNotificationRead(id: string): Promise<{
  id: string;
  isRead: boolean;
  readAt: string | null;
}> {
  const notificationId = assertNotificationId(id);
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: 'PATCH', accessToken },
  );
  const root = asRecord(envelope.data);
  return {
    id: readString(root, 'id') ?? notificationId,
    isRead: root?.isRead !== false,
    readAt: readString(root, 'readAt'),
  };
}

/** PATCH /api/v1/customer/notifications/read-all — no body. */
export async function markAllNotificationsRead(): Promise<{
  updatedCount: number;
  unreadCount: number;
}> {
  const accessToken = await requireAccessToken();
  const envelope = await apiRequestEnvelope<unknown>('/notifications/read-all', {
    method: 'PATCH',
    accessToken,
  });
  const root = asRecord(envelope.data);
  const updatedCount = readOptionalNumber(root, 'updatedCount') ?? readOptionalNumber(root, 'updated');
  const unreadCount = readOptionalNumber(root, 'unreadCount');
  if (updatedCount == null || unreadCount == null) {
    throw new ApiClientError({
      code: 'UNKNOWN',
      message: 'Unable to update notifications. Please try again.',
      status: 200,
    });
  }
  return {
    updatedCount: Math.max(0, updatedCount),
    unreadCount: Math.max(0, unreadCount),
  };
}
