import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { PAYIN_POLL_MS } from '@/constants/payin';
import {
  createPayinIdempotencyKey,
  disputePayinOrder,
  fetchPayinOrder,
  fetchPayinOrders,
  fetchPayinReleaseStatus,
  fetchPayinSlip,
  fetchPayinVerification,
  releasePayinOrder,
  submitPayinEvidence,
} from '@/features/payin/api/payin-orders-api';
import { expiryPhase, formatCountdown, remainingSeconds, serverSkewMs } from '@/features/payin/lib/expiry';
import { SmsPaymentVerificationService } from '@/features/payin/sms/sms-payment-verification';
import { useSmsConsentStore } from '@/features/payin/stores/sms-consent-store';
import type {
  DisputeReason,
  ExpiryPhase,
  PayinListQuery,
  PayinOrderDetail,
  PayinOrderStatus,
  PayinOrdersPage,
  SmsEvidenceInput,
} from '@/features/payin/types';
import { dashboardKeys } from '@/features/home/hooks/use-home-queries';
import { ApiClientError } from '@/lib/api/errors';

const STOP_POLLING = new Set<PayinOrderStatus>([
  'COMPLETED',
  'EXPIRED',
  'CANCELLED',
  'DISPUTED',
  'FAILED',
]);

const RELEASE_LIVE = new Set(['RELEASE_PENDING', 'RELEASING', 'COLLATERAL_RELEASE_PENDING', 'RETRYABLE']);

export const payinKeys = {
  all: ['payin-orders'] as const,
  list: (query: Omit<PayinListQuery, 'page' | 'cursor'>) =>
    [...payinKeys.all, 'list', query] as const,
  detail: (orderId: string) => ['payin-order-detail', orderId] as const,
  verification: (orderId: string) => ['payin-verification', orderId] as const,
  releaseStatus: (orderId: string) => [...payinKeys.all, 'release-status', orderId] as const,
};

export const transactionKeys = {
  all: ['transactions'] as const,
};

export function payinShouldPoll(status: PayinOrderStatus | undefined): boolean {
  if (!status) return false;
  return !STOP_POLLING.has(status);
}

function refreshPayinSurfaces(
  queryClient: ReturnType<typeof useQueryClient>,
  orderId: string,
) {
  void queryClient.invalidateQueries({ queryKey: payinKeys.all });
  void queryClient.invalidateQueries({ queryKey: payinKeys.detail(orderId) });
  void queryClient.invalidateQueries({ queryKey: payinKeys.verification(orderId) });
  void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

export function usePayinOrders(query: Omit<PayinListQuery, 'page' | 'cursor'> = {}) {
  return useInfiniteQuery<
    PayinOrdersPage,
    Error,
    InfiniteData<PayinOrdersPage>,
    ReturnType<typeof payinKeys.list>,
    number | string
  >({
    queryKey: payinKeys.list(query),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchPayinOrders({
        ...query,
        limit: query.limit ?? 20,
        ...(typeof pageParam === 'string' ? { cursor: pageParam } : { page: pageParam }),
      }),
    getNextPageParam: (lastPage) =>
      lastPage.nextCursor ??
      (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined),
    staleTime: 10_000,
  });
}

export function usePayinOrder(orderId: string | null) {
  return useQuery({
    queryKey: payinKeys.detail(orderId ?? ''),
    queryFn: () => fetchPayinOrder(orderId ?? ''),
    enabled: Boolean(orderId),
    staleTime: 5_000,
    refetchInterval: (query) => {
      const order = query.state.data;
      if (!order || order.realtime.mode === 'websocket') return false;
      return payinShouldPoll(order.status) ? PAYIN_POLL_MS : false;
    },
  });
}

function isMissingRoute(error: unknown): boolean {
  return error instanceof ApiClientError && error.code === 'NOT_FOUND';
}

export function usePayinVerification(orderId: string | null, enabled = true) {
  return useQuery({
    queryKey: payinKeys.verification(orderId ?? ''),
    queryFn: () => fetchPayinVerification(orderId ?? ''),
    enabled: Boolean(orderId) && enabled,
    staleTime: 5_000,
    retry: (failureCount, error) => !isMissingRoute(error) && failureCount < 2,
    refetchInterval: (query) =>
      enabled && !isMissingRoute(query.state.error) ? PAYIN_POLL_MS : false,
  });
}

export function usePayinReleaseStatus(orderId: string | null, enabled = false) {
  return useQuery({
    queryKey: payinKeys.releaseStatus(orderId ?? ''),
    queryFn: () => fetchPayinReleaseStatus(orderId ?? ''),
    enabled: Boolean(orderId) && enabled,
    refetchInterval: (query) =>
      enabled && RELEASE_LIVE.has(query.state.data?.status ?? 'RELEASING') ? PAYIN_POLL_MS : false,
  });
}

export function useSubmitVerificationEvidence(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (evidence: SmsEvidenceInput) => submitPayinEvidence(orderId, evidence),
    onSuccess: () => refreshPayinSurfaces(queryClient, orderId),
  });
}

export function useSubmitDispute(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reason: DisputeReason; description?: string; evidenceIds?: string[] }) =>
      disputePayinOrder({ orderId, ...input }),
    onSuccess: (order) => {
      queryClient.setQueryData(payinKeys.detail(orderId), order);
      refreshPayinSurfaces(queryClient, orderId);
    },
  });
}

function keepReleaseKey(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return true;
  if (error.code === 'NETWORK_ERROR' || error.status >= 500 || error.status === 409) return true;
  return false;
}

export function useReleasePayin(orderId: string) {
  const queryClient = useQueryClient();
  const releaseAttempt = useRef<{ orderId: string; key: string } | null>(null);

  return useMutation({
    mutationFn: () => {
      if (!releaseAttempt.current || releaseAttempt.current.orderId !== orderId) {
        releaseAttempt.current = { orderId, key: createPayinIdempotencyKey() };
      }
      return releasePayinOrder(orderId, releaseAttempt.current.key);
    },
    onSuccess: (order) => {
      if (order) queryClient.setQueryData(payinKeys.detail(orderId), order);
      const finished = order?.status === 'COMPLETED' || order?.releaseStatus === 'COMPLETED';
      if (finished && releaseAttempt.current?.orderId === orderId) {
        releaseAttempt.current = null;
      }
      refreshPayinSurfaces(queryClient, orderId);
    },
    onError: (error) => {
      if (!keepReleaseKey(error) && releaseAttempt.current?.orderId === orderId) {
        releaseAttempt.current = null;
      }
    },
  });
}

export function usePayinSlip(orderId: string) {
  return useMutation({
    mutationFn: () => fetchPayinSlip(orderId),
  });
}

export function usePayinRealtime(order: PayinOrderDetail | undefined) {
  const queryClient = useQueryClient();
  const socketUrl = order?.realtime.socketUrl ?? null;
  const orderId = order?.publicId ?? null;
  const status = order?.status;

  useEffect(() => {
    if (!socketUrl || !orderId || !payinShouldPoll(status)) return;
    const socket = new WebSocket(socketUrl);
    socket.onmessage = () => {
      refreshPayinSurfaces(queryClient, orderId);
    };
    return () => {
      socket.close();
    };
  }, [orderId, queryClient, socketUrl, status]);
}

export function useServerCountdown(
  expiresAt: string | null,
  serverTime: string | null,
  observedAtMs: number,
) {
  const [deviceNow, setDeviceNow] = useState(0);

  useEffect(() => {
    if (!expiresAt || !serverTime) return;
    const id = setInterval(() => setDeviceNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt, serverTime]);

  const clock = deviceNow > 0 ? deviceNow : observedAtMs;
  const skew = serverTime && observedAtMs > 0 ? serverSkewMs(serverTime, observedAtMs) : 0;
  const seconds =
    expiresAt && serverTime && clock > 0 ? remainingSeconds(expiresAt, clock, skew) : 0;
  const phase: ExpiryPhase = serverTime ? expiryPhase(seconds, false) : 'ACTIVE';
  return {
    seconds,
    label: !serverTime ? '—' : seconds <= 0 ? '00:00' : formatCountdown(seconds),
    phase,
    expired: Boolean(serverTime) && seconds <= 0,
  };
}

export function useSmsEvidenceBridge(orderId: string | null, active: boolean) {
  const choice = useSmsConsentStore((state) => state.choice);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orderId || !active || choice !== 'enabled') {
      void SmsPaymentVerificationService.stopListening();
      return;
    }
    let cancelled = false;
    const seen = new Set<string>();
    void SmsPaymentVerificationService.startListening({ consented: true });
    const unsubscribe = SmsPaymentVerificationService.subscribe((parsed) => {
      if (!parsed.rawMessageHash) return;
      if (seen.has(parsed.rawMessageHash)) return;
      seen.add(parsed.rawMessageHash);
      const accountLast4 =
        parsed.accountLast4 && /^\d{4}$/.test(parsed.accountLast4)
          ? parsed.accountLast4
          : undefined;
      const evidence: SmsEvidenceInput = {
        source: 'SMS',
        receivedAt: parsed.receivedAt,
        evidenceHash: parsed.rawMessageHash,
        transactionTimestamp: parsed.receivedAt,
        ...(parsed.amountMinor != null ? { amountMinor: parsed.amountMinor } : {}),
        ...(parsed.utr ? { utr: parsed.utr } : {}),
        ...(accountLast4 ? { accountLast4 } : {}),
        ...(parsed.transactionType === 'credit' ? { direction: 'CREDIT' as const } : {}),
        ...(parsed.transactionType === 'debit' ? { direction: 'DEBIT' as const } : {}),
      };
      void submitPayinEvidence(orderId, evidence).then(() => {
        if (!cancelled) refreshPayinSurfaces(queryClient, orderId);
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
      void SmsPaymentVerificationService.stopListening();
    };
  }, [active, choice, orderId, queryClient]);
}

export const usePayinOrdersQuery = usePayinOrders;
export const usePayinOrderQuery = usePayinOrder;
