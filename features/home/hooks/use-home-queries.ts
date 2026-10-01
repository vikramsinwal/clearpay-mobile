import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import {
  fetchDashboardEarnings,
  fetchDashboardSummary,
  fetchNotifications,
} from '@/features/home/api/home-api';
import {
  fetchCustomerNotifications,
  fetchNotificationUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/home/api/notifications-api';
import type { EarningsPeriod } from '@/constants/home';
import type {
  CustomerNotification,
  NotificationCount,
  NotificationsListResult,
} from '@/features/home/types';
import { ApiClientError } from '@/lib/api/errors';
import { showAlert } from '@/lib/ui/alert';

/**
 * Query key roots for the Home dashboard. Keep the `customer-dashboard`
 * prefix stable so a single `invalidateQueries({ queryKey: dashboardKeys.all })`
 * refreshes every dashboard section (used after notification mutations and
 * can be reused by future dashboard-affecting mutations).
 */
export const notificationKeys = {
  list: ['customer-notifications'] as const,
  count: ['customer-notification-count'] as const,
};

export const dashboardKeys = {
  all: ['customer-dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
  earnings: (period: EarningsPeriod) =>
    [...dashboardKeys.all, 'earnings', period] as const,
  notifications: () => [...dashboardKeys.all, 'notifications'] as const,
  notificationsList: () =>
    [...dashboardKeys.all, 'notifications', 'all'] as const,
};

export function useDashboardSummaryQuery() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: fetchDashboardSummary,
    staleTime: 30_000,
  });
}

export function useDashboardEarningsQuery(options: {
  period: EarningsPeriod;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey:
      options.period === 'custom'
        ? [
            ...dashboardKeys.earnings(options.period),
            options.startDate,
            options.endDate,
          ]
        : dashboardKeys.earnings(options.period),
    queryFn: () => fetchDashboardEarnings(options),
    enabled:
      options.period !== 'custom' ||
      Boolean(options.startDate && options.endDate),
    staleTime: 30_000,
  });
}

export function useHomeNotificationsQuery() {
  return useQuery({
    queryKey: dashboardKeys.notifications(),
    queryFn: () => fetchNotifications({ limit: 5 }),
    staleTime: 30_000,
  });
}

export type NotificationsPageParam = {
  cursor?: string;
};

function writeNotificationCount(
  queryClient: ReturnType<typeof useQueryClient>,
  count: NotificationCount,
) {
  queryClient.setQueryData(notificationKeys.count, count);
}

/**
 * Header badge. Skipped while the alerts list is on screen so the list's
 * `unreadCount` is the only request.
 */
export function useNotificationCountQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: notificationKeys.count,
    queryFn: fetchNotificationUnreadCount,
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
}

/** Cursor-paginated alerts list. Stops when `nextCursor` is null. */
export function useNotificationsInfiniteQuery() {
  const queryClient = useQueryClient();

  return useInfiniteQuery<
    NotificationsListResult,
    Error,
    InfiniteData<NotificationsListResult>,
    typeof notificationKeys.list,
    NotificationsPageParam
  >({
    queryKey: notificationKeys.list,
    initialPageParam: {},
    queryFn: async ({ pageParam }) => {
      const page = await fetchCustomerNotifications({
        cursor: pageParam.cursor,
        limit: 20,
      });
      if (!pageParam.cursor) {
        writeNotificationCount(queryClient, {
          total: page.total ?? 0,
          unread: page.unreadCount,
        });
      }
      return page;
    },
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      if (!lastPage.nextCursor) return undefined;
      if (lastPage.nextCursor === lastPageParam.cursor) return undefined;
      return { cursor: lastPage.nextCursor };
    },
    staleTime: 30_000,
  });
}

function isInfiniteNotifications(
  data: unknown,
): data is InfiniteData<NotificationsListResult> {
  if (!data || typeof data !== 'object' || !('pages' in data)) return false;
  return Array.isArray(data.pages);
}

function isNotificationPage(data: unknown): data is NotificationsListResult {
  if (!data || typeof data !== 'object' || !('items' in data)) return false;
  return Array.isArray(data.items);
}

function readItem(
  item: CustomerNotification,
  readAt: string,
): CustomerNotification {
  if (item.isRead && !item.isNew) return item;
  return { ...item, isRead: true, isNew: false, readAt };
}

function mapPages(
  data: unknown,
  mapPage: (page: NotificationsListResult) => NotificationsListResult,
): unknown {
  if (isInfiniteNotifications(data)) {
    return { ...data, pages: data.pages.map(mapPage) };
  }
  if (isNotificationPage(data)) return mapPage(data);
  return data;
}

function applyItemRead(data: unknown, id: string, readAt: string): unknown {
  const pages = isInfiniteNotifications(data)
    ? data.pages
    : isNotificationPage(data)
      ? [data]
      : null;
  if (!pages) return data;
  const hadUnread = pages.some((page) =>
    page.items.some((item) => item.id === id && !item.isRead),
  );
  if (!hadUnread) return data;
  const unreadCount = Math.max(0, (pages[0]?.unreadCount ?? 0) - 1);
  return mapPages(data, (page) => ({
    ...page,
    unreadCount,
    items: page.items.map((item) => (item.id === id ? readItem(item, readAt) : item)),
  }));
}

function applyAllRead(data: unknown, readAt: string): unknown {
  return mapPages(data, (page) => ({
    ...page,
    unreadCount: 0,
    items: page.items.map((item) => readItem(item, readAt)),
  }));
}

function isNotificationCount(data: unknown): data is NotificationCount {
  if (!data || typeof data !== 'object') return false;
  return (
    typeof (data as NotificationCount).total === 'number' &&
    typeof (data as NotificationCount).unread === 'number'
  );
}

function syncCount(data: unknown, unread: number): NotificationCount | undefined {
  if (isNotificationCount(data)) return { ...data, unread };
  return undefined;
}

function safeNotificationError(error: unknown, fallback: string): string {
  if (!(error instanceof ApiClientError)) return fallback;
  if (error.code === 'RATE_LIMITED' || error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') {
    return error.message;
  }
  if (error.code === 'NOT_FOUND') return 'That notification is no longer available.';
  if (error.code === 'NETWORK_ERROR') return 'Unable to load notifications';
  return fallback;
}

/**
 * PATCH /notifications/:id/read — optimistically flips the row read, rolls
 * back on failure, then refetches notification queries only.
 */
export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list });
      await queryClient.cancelQueries({ queryKey: notificationKeys.count });
      const previousList = queryClient.getQueryData(notificationKeys.list);
      const previousCount = queryClient.getQueryData(notificationKeys.count);
      const previousHome = queryClient.getQueryData(dashboardKeys.notifications());
      const readAt = new Date().toISOString();
      const nextList = applyItemRead(previousList, id, readAt);
      const nextHome = applyItemRead(previousHome, id, readAt);
      queryClient.setQueryData(notificationKeys.list, nextList);
      queryClient.setQueryData(dashboardKeys.notifications(), nextHome);
      if (nextList !== previousList && isInfiniteNotifications(nextList)) {
        const page = nextList.pages[0];
        queryClient.setQueryData(notificationKeys.count, (data: unknown) => {
          const unread = page?.unreadCount ?? 0;
          return syncCount(data, unread) ?? { total: page?.total ?? 0, unread };
        });
      } else if (nextHome !== previousHome) {
        queryClient.setQueryData(notificationKeys.count, (data: unknown) =>
          syncCount(data, Math.max(0, (isNotificationCount(data) ? data.unread : 0) - 1)),
        );
      }
      return { previousList, previousCount, previousHome };
    },
    onError: (error, _id, context) => {
      queryClient.setQueryData(notificationKeys.list, context?.previousList);
      queryClient.setQueryData(notificationKeys.count, context?.previousCount);
      queryClient.setQueryData(dashboardKeys.notifications(), context?.previousHome);
      showAlert(
        'Could not mark as read',
        safeNotificationError(error, 'Please try again.'),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.list });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.count });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.notifications() });
    },
  });
}

/** PATCH /notifications/read-all */
export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list });
      await queryClient.cancelQueries({ queryKey: notificationKeys.count });
      const previousList = queryClient.getQueryData(notificationKeys.list);
      const previousCount = queryClient.getQueryData(notificationKeys.count);
      const previousHome = queryClient.getQueryData(dashboardKeys.notifications());
      const readAt = new Date().toISOString();
      queryClient.setQueryData(notificationKeys.list, applyAllRead(previousList, readAt));
      queryClient.setQueryData(
        dashboardKeys.notifications(),
        applyAllRead(previousHome, readAt),
      );
      queryClient.setQueryData(notificationKeys.count, (data: unknown) =>
        isNotificationCount(data) ? { ...data, unread: 0 } : data,
      );
      return { previousList, previousCount, previousHome };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(notificationKeys.count, (data: unknown) =>
        isNotificationCount(data) ? { ...data, unread: result.unreadCount } : data,
      );
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(notificationKeys.list, context?.previousList);
      queryClient.setQueryData(notificationKeys.count, context?.previousCount);
      queryClient.setQueryData(dashboardKeys.notifications(), context?.previousHome);
      showAlert(
        'Could not mark all as read',
        safeNotificationError(error, 'Please try again.'),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.list });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.count });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.notifications() });
    },
  });
}
