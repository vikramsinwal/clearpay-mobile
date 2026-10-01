import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { PAYOUT_COPY, PAYOUT_POLL_MS, PAYOUT_TERMINAL_STATUSES } from '@/constants/payout';
import { ApiClientError } from '@/lib/api/errors';
import { recordSmsAudit } from '@/features/payout/sms/audit';
import {
  SMS_CONSENT_VERSION,
  readAutomationPreference,
  writeAutomationPreference,
} from '@/features/payout/sms/consent-store';
import { dashboardKeys, notificationKeys } from '@/features/home/hooks/use-home-queries';
import {
  acceptPayoutOrder,
  autoSubmitPayoutCandidate,
  createPayoutSupportTicket,
  fetchPayoutOrder,
  fetchPayoutOrders,
  requestPayoutPaymentIntent,
  submitPayoutPaymentCandidate,
  submitPayoutProof,
  submitPayoutReference,
  uploadPayoutReceipt,
} from '@/features/payout/api/payout-orders-api';
import { formatCountdown, remainingSeconds, serverSkewMs } from '@/features/payout/lib/presentation';
import type {
  PayoutHelpReason,
  PayoutListFilters,
  PayoutOrderDetail,
  PayoutOrdersPage,
  PayoutPaymentCandidate,
  PayoutPaymentMethod,
  PayoutSubmission,
} from '@/features/payout/types';

export const payoutKeys = {
  all: ['customer-payout-orders'] as const,
  list: (filters: PayoutListFilters) => [...payoutKeys.all, 'list', filters] as const,
  detail: (publicId: string) => [...payoutKeys.all, 'detail', publicId] as const,
  autoProof: ['customer-payout-auto-proof'] as const,
};

export function payoutShouldPoll(status: string | undefined): boolean {
  if (!status) return false;
  return !PAYOUT_TERMINAL_STATUSES.has(status);
}

export function usePayoutOrdersQuery(filters: PayoutListFilters) {
  return useInfiniteQuery<
    PayoutOrdersPage,
    Error,
    InfiniteData<PayoutOrdersPage>,
    ReturnType<typeof payoutKeys.list>,
    { cursor: string | null; page: number }
  >({
    queryKey: payoutKeys.list(filters),
    initialPageParam: { cursor: null, page: 1 },
    queryFn: ({ pageParam }) =>
      fetchPayoutOrders({
        ...filters,
        limit: 20,
        cursor: pageParam.cursor,
        page: pageParam.page,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? { cursor: lastPage.nextCursor, page: lastPage.page + 1 } : undefined,
    staleTime: 10_000,
  });
}

export function usePayoutOrderQuery(publicId: string | null) {
  return useQuery({
    queryKey: payoutKeys.detail(publicId ?? ''),
    queryFn: () => fetchPayoutOrder(publicId ?? ''),
    enabled: Boolean(publicId),
    staleTime: 5_000,
    refetchInterval: (query) => {
      const order = query.state.data;
      if (!order || !payoutShouldPoll(order.status)) return false;
      if (order.realtime.socketUrl) return false;
      return order.realtime.pollIntervalMs ?? PAYOUT_POLL_MS;
    },
  });
}

function invalidatePayoutSurfaces(queryClient: ReturnType<typeof useQueryClient>, orderId?: string) {
  void queryClient.invalidateQueries({ queryKey: payoutKeys.all });
  if (orderId) void queryClient.invalidateQueries({ queryKey: payoutKeys.detail(orderId) });
  void queryClient.invalidateQueries({ queryKey: notificationKeys.list });
  void queryClient.invalidateQueries({ queryKey: notificationKeys.count });
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

export function useAcceptPayoutMutation(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => acceptPayoutOrder(orderId),
    onSuccess: (order) => {
      queryClient.setQueryData(payoutKeys.detail(order.publicId), order);
      invalidatePayoutSurfaces(queryClient, order.publicId);
    },
  });
}

export function useSelectPayoutMethodMutation(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (method: PayoutPaymentMethod) => requestPayoutPaymentIntent(orderId, method),
    onSuccess: () => invalidatePayoutSurfaces(queryClient, orderId),
  });
}

export function usePayoutPaymentIntentMutation(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (method: PayoutPaymentMethod) => requestPayoutPaymentIntent(orderId, method),
    onSuccess: () => invalidatePayoutSurfaces(queryClient, orderId),
  });
}

export function useUploadPayoutReceiptMutation(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      uri: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      maxBytes: number;
      onProgress?: (percent: number) => void;
    }) => uploadPayoutReceipt({ orderId, ...input }),
    onSuccess: (order) => {
      queryClient.setQueryData(payoutKeys.detail(order.publicId), order);
      invalidatePayoutSurfaces(queryClient, order.publicId);
    },
  });
}

export function useSubmitPayoutProofMutation(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reference: string; amountMinor: number }) =>
      submitPayoutReference(orderId, { value: input.reference, amountMinor: input.amountMinor }).then(() =>
        submitPayoutProof(orderId),
      ),
    onSuccess: (submission: PayoutSubmission) => {
      queryClient.setQueryData<PayoutOrderDetail>(payoutKeys.detail(orderId), (current) =>
        current
          ? {
              ...current,
              status: submission.status,
              statusLabel: submission.status,
              reference: { ...current.reference, value: submission.reference ?? current.reference.value },
            }
          : current,
      );
      invalidatePayoutSurfaces(queryClient, orderId);
    },
  });
}

export function usePayoutSupportMutation(orderId: string) {
  return useMutation({
    mutationFn: (input: { reason: PayoutHelpReason; description?: string }) =>
      createPayoutSupportTicket({
        orderId,
        category: input.reason,
        message: input.description?.trim() || input.reason,
      }),
  });
}

export function usePayoutCandidateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { candidate: PayoutPaymentCandidate; orderId: string }) =>
      submitPayoutPaymentCandidate(input.orderId, input.candidate),
    onSuccess: (result) => {
      if (result.action === 'IGNORE') return;
      invalidatePayoutSurfaces(queryClient, result.orderPublicId ?? undefined);
    },
  });
}

export function useAutomaticPaymentProofQuery() {
  return useQuery({
    queryKey: payoutKeys.autoProof,
    queryFn: readAutomationPreference,
    staleTime: 30_000,
  });
}

export function useAutomaticPaymentProofMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { enabled: boolean; consentVersion?: string | null }) => {
      if (input.enabled && input.consentVersion !== SMS_CONSENT_VERSION) {
        throw new ApiClientError({
          code: 'VALIDATION_ERROR',
          message: PAYOUT_COPY.autoProofConsent,
          status: 400,
        });
      }
      if (!input.enabled) {
        const current = await readAutomationPreference();
        return writeAutomationPreference({ ...current, enabled: false });
      }
      const saved = await writeAutomationPreference({
        enabled: true,
        consentVersion: SMS_CONSENT_VERSION,
        acknowledgedAt: new Date().toISOString(),
      });
      recordSmsAudit({
        type: 'AUTO_SUBMIT_ENABLED',
        at: saved.acknowledgedAt ?? new Date().toISOString(),
        reason: SMS_CONSENT_VERSION,
      });
      return saved;
    },
    onSuccess: (preference) => {
      queryClient.setQueryData(payoutKeys.autoProof, preference);
    },
  });
}

export function useAutoSubmitPayoutCandidateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { orderId: string; candidateId: string }) =>
      autoSubmitPayoutCandidate(input.orderId, input.candidateId),
    onSuccess: (_submission, input) => invalidatePayoutSurfaces(queryClient, input.orderId),
  });
}


export function usePayoutCountdown(
  deadlineAt: string | null,
  serverTime: string | null,
  observedAtMs: number,
  remainingMs: number | null = null,
) {
  const [tick, setTick] = useState<number | null>(null);
  const deviceNow = tick ?? observedAtMs;
  const skew = serverTime && observedAtMs > 0 ? serverSkewMs(serverTime, observedAtMs) : 0;

  useEffect(() => {
    if (!deadlineAt && remainingMs == null) return;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadlineAt, remainingMs]);

  const fromDeadline = serverTime ? remainingSeconds(deadlineAt, deviceNow, skew) : null;
  const elapsed = observedAtMs > 0 ? Math.max(0, deviceNow - observedAtMs) : 0;
  const fromSnapshot =
    remainingMs == null ? null : Math.max(0, Math.floor((remainingMs - elapsed) / 1000));
  const seconds = fromDeadline ?? fromSnapshot;
  return {
    seconds,
    label: seconds == null ? '—' : seconds <= 0 ? '00:00' : formatCountdown(seconds),
    expired: seconds === 0,
  };
}

export function usePayoutRealtime(order: PayoutOrderDetail | undefined) {
  const queryClient = useQueryClient();
  const socketUrl = order?.realtime.socketUrl ?? null;
  const publicId = order?.publicId ?? null;
  const status = order?.status;

  useEffect(() => {
    if (!socketUrl || !publicId || !payoutShouldPoll(status)) return;
    const socket = new WebSocket(socketUrl);
    socket.onmessage = () => {
      void queryClient.invalidateQueries({ queryKey: payoutKeys.detail(publicId) });
    };
    return () => {
      socket.close();
    };
  }, [publicId, queryClient, socketUrl, status]);
}
