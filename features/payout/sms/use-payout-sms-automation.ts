import { useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

import { PAYOUT_COPY } from '@/constants/payout';
import {
  autoSubmitPayoutCandidate,
  fetchPayoutOrder,
  fetchPayoutOrders,
  submitPayoutPaymentCandidate,
} from '@/features/payout/api/payout-orders-api';
import { payoutKeys, useAutomaticPaymentProofQuery } from '@/features/payout/hooks/use-payout-orders';
import { ApiClientError } from '@/lib/api/errors';
import { recordSmsAudit } from '@/features/payout/sms/audit';
import { consentIsCurrent } from '@/features/payout/sms/consent-store';
import { SMS_MATCH_STATUSES, type PayoutMatchTarget } from '@/features/payout/sms/match-payout';
import { matchTargetFromDetail, toAmountMinor } from '@/features/payout/sms/order-target';
import { PayoutSmsModule } from '@/features/payout/sms/payout-sms-module';
import { resolveSmsOutcome, type BackendMatchState } from '@/features/payout/sms/resolve-outcome';
import type { PaymentCandidate } from '@/features/payout/types';

/**
 * Runs only after Automatic payment proof is on and consent for this version is stored.
 * The native layer sends extracted fields. Ambiguous or uncertain matches stay on review.
 */
export function usePayoutSmsAutomation() {
  const preference = useAutomaticPaymentProofQuery();
  const queryClient = useQueryClient();
  const router = useRouter();
  const armed = preference.data ? consentIsCurrent(preference.data) : false;

  useEffect(() => {
    if (!armed) {
      void PayoutSmsModule.stopPaymentDetection();
      return;
    }

    const seen = new Set<string>();
    let cancelled = false;

    function showReview(orderId: string | null) {
      Alert.alert(PAYOUT_COPY.paymentDetected, PAYOUT_COPY.paymentDetectedBody, [
        { text: PAYOUT_COPY.later, style: 'cancel' },
        {
          text: PAYOUT_COPY.review,
          onPress: () => {
            const href = orderId
              ? (`/payout-order?orderId=${encodeURIComponent(orderId)}` as Href)
              : ('/payouts' as Href);
            router.push(href);
          },
        },
      ]);
    }

    async function targetsFor(candidate: PaymentCandidate): Promise<PayoutMatchTarget[]> {
      const page = await fetchPayoutOrders({ limit: 20 });
      const active = page.items
        .filter(
          (item) =>
            (SMS_MATCH_STATUSES as readonly string[]).includes(item.status) &&
            toAmountMinor(item.amount, item.currency) === candidate.amountMinor &&
            item.currency.toUpperCase() === candidate.currency.toUpperCase(),
        )
        .slice(0, 5);
      const details = await Promise.all(active.map((item) => fetchPayoutOrder(item.publicId)));
      return details.map(matchTargetFromDetail);
    }

    async function onCandidate(candidate: PaymentCandidate) {
      if (seen.has(candidate.dedupeKey)) return;
      seen.add(candidate.dedupeKey);
      const permission = await PayoutSmsModule.getStatus();
      let orders: PayoutMatchTarget[] = [];
      let backend: BackendMatchState = 'NOT_CALLED';
      try {
        orders = await targetsFor(candidate);
      } catch (error) {
        backend = error instanceof ApiClientError && error.code === 'NETWORK_ERROR' ? 'OFFLINE' : 'UNAVAILABLE';
      }
      if (cancelled) return;

      const plan = resolveSmsOutcome({
        permission,
        automationEnabled: true,
        consentAccepted: true,
        candidate,
        orders,
        nowMs: Date.now(),
        backend,
      });
      if (!plan.submitToBackend || !plan.orderPublicId || backend !== 'NOT_CALLED') {
        for (const event of plan.audit) recordSmsAudit(event);
        if (plan.action === 'REVIEW' || plan.action === 'READY_TO_SUBMIT') showReview(plan.orderPublicId);
        return;
      }

      try {
        const result = await submitPayoutPaymentCandidate(plan.orderPublicId, candidate);
        const final = resolveSmsOutcome({
          permission,
          automationEnabled: true,
          consentAccepted: true,
          candidate,
          orders,
          nowMs: Date.now(),
          backend: result.action,
        });
        if (final.action === 'AUTO_SUBMIT' && final.localAutoEligible && result.candidateId) {
          await autoSubmitPayoutCandidate(plan.orderPublicId, result.candidateId);
          for (const event of final.audit) recordSmsAudit(event);
          void queryClient.invalidateQueries({ queryKey: payoutKeys.detail(plan.orderPublicId) });
          void queryClient.invalidateQueries({ queryKey: payoutKeys.all });
          return;
        }
        const rejected = final.audit.map((event) =>
          event.type === 'AUTO_SUBMIT_EXECUTED'
            ? { ...event, type: 'AUTO_SUBMIT_REJECTED' as const, reason: 'missing_candidate' }
            : event,
        );
        for (const event of rejected) recordSmsAudit(event);
        if (final.action !== 'IGNORE') showReview(plan.orderPublicId);
      } catch (error) {
        const failure: BackendMatchState =
          error instanceof ApiClientError && error.code === 'NETWORK_ERROR' ? 'OFFLINE' : 'UNAVAILABLE';
        const final = resolveSmsOutcome({
          permission,
          automationEnabled: true,
          consentAccepted: true,
          candidate,
          orders,
          nowMs: Date.now(),
          backend: failure,
        });
        for (const event of final.audit) recordSmsAudit(event);
        showReview(plan.orderPublicId);
      }
    }

    void PayoutSmsModule.startPaymentDetection();
    const unsubscribe = PayoutSmsModule.subscribe((candidate) => {
      void onCandidate(candidate);
    });
    return () => {
      cancelled = true;
      unsubscribe();
      void PayoutSmsModule.stopPaymentDetection();
    };
  }, [armed, queryClient, router]);
}
