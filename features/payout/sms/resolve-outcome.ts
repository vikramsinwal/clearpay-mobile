import { matchCandidateToPayouts, type PayoutMatchTarget } from '@/features/payout/sms/match-payout';
import type { PaymentCandidate, PayoutCandidateAction } from '@/features/payout/types';

export const SMS_AUTOMATION_PERMISSIONS = [
  'SMS_AUTOMATION_UNAVAILABLE',
  'PERMISSION_REQUIRED',
  'PERMISSION_GRANTED',
  'PERMISSION_DENIED',
  'POLICY_RESTRICTED',
] as const;

export type SmsAutomationPermission = (typeof SMS_AUTOMATION_PERMISSIONS)[number];

export const SMS_AUDIT_EVENTS = [
  'SMS_CANDIDATE_DETECTED',
  'PAYMENT_CANDIDATE_MATCHED',
  'AUTO_SUBMIT_ENABLED',
  'AUTO_SUBMIT_EXECUTED',
  'AUTO_SUBMIT_REJECTED',
] as const;

export type SmsAuditEventName = (typeof SMS_AUDIT_EVENTS)[number];

export type SmsAuditEvent = {
  type: SmsAuditEventName;
  at: string;
  orderPublicId?: string;
  senderHash?: string;
  reason?: string;
};

export type BackendMatchState = 'NOT_CALLED' | 'OFFLINE' | 'UNAVAILABLE' | PayoutCandidateAction;

export type SmsOutcome = {
  action: PayoutCandidateAction | 'MANUAL_FALLBACK';
  orderPublicId: string | null;
  reason: string;
  submitToBackend: boolean;
  localAutoEligible: boolean;
  audit: SmsAuditEvent[];
};

const MANUAL = new Set<SmsAutomationPermission>([
  'SMS_AUTOMATION_UNAVAILABLE',
  'PERMISSION_REQUIRED',
  'PERMISSION_DENIED',
  'POLICY_RESTRICTED',
]);

function audit(
  type: SmsAuditEventName,
  at: string,
  reason: string,
  candidate: PaymentCandidate | null,
  orderPublicId?: string,
): SmsAuditEvent {
  return {
    type,
    at,
    reason,
    ...(candidate ? { senderHash: candidate.senderHash } : {}),
    ...(orderPublicId ? { orderPublicId } : {}),
  };
}

export function resolveSmsOutcome(input: {
  permission: SmsAutomationPermission;
  automationEnabled: boolean;
  consentAccepted: boolean;
  candidate: PaymentCandidate | null;
  orders: readonly PayoutMatchTarget[];
  nowMs: number;
  backend: BackendMatchState;
}): SmsOutcome {
  const at = new Date(input.nowMs).toISOString();
  const candidate = input.candidate;

  if (MANUAL.has(input.permission)) {
    return {
      action: 'MANUAL_FALLBACK',
      orderPublicId: null,
      reason: input.permission,
      submitToBackend: false,
      localAutoEligible: false,
      audit: [],
    };
  }

  if (!input.automationEnabled || !input.consentAccepted) {
    return {
      action: 'IGNORE',
      orderPublicId: null,
      reason: input.automationEnabled ? 'consent_missing' : 'automation_disabled',
      submitToBackend: false,
      localAutoEligible: false,
      audit: candidate
        ? [audit('AUTO_SUBMIT_REJECTED', at, 'automation_disabled', candidate)]
        : [],
    };
  }

  if (!candidate || candidate.verdict === 'NOT_RELEVANT') {
    return {
      action: 'IGNORE',
      orderPublicId: null,
      reason: 'not_relevant',
      submitToBackend: false,
      localAutoEligible: false,
      audit: [],
    };
  }

  const events: SmsAuditEvent[] = [audit('SMS_CANDIDATE_DETECTED', at, candidate.verdict, candidate)];
  const match = matchCandidateToPayouts(candidate, input.orders, input.nowMs);

  if (match.kind === 'none') {
    if ((input.backend === 'OFFLINE' || input.backend === 'UNAVAILABLE') && input.orders.length === 0) {
      events.push(audit('AUTO_SUBMIT_REJECTED', at, input.backend, candidate));
      return {
        action: 'REVIEW',
        orderPublicId: null,
        reason: input.backend,
        submitToBackend: false,
        localAutoEligible: false,
        audit: events,
      };
    }
    return {
      action: 'IGNORE',
      orderPublicId: null,
      reason: match.reason,
      submitToBackend: false,
      localAutoEligible: false,
      audit: events,
    };
  }

  if (match.kind === 'ambiguous' || !match.order) {
    events.push(audit('PAYMENT_CANDIDATE_MATCHED', at, 'ambiguous_orders', candidate));
    events.push(audit('AUTO_SUBMIT_REJECTED', at, 'ambiguous_orders', candidate));
    return {
      action: 'REVIEW',
      orderPublicId: null,
      reason: 'ambiguous_orders',
      submitToBackend: false,
      localAutoEligible: false,
      audit: events,
    };
  }

  const orderId = match.order.publicId;
  events.push(audit('PAYMENT_CANDIDATE_MATCHED', at, match.reason, candidate, orderId));

  if (candidate.verdict === 'UNKNOWN' || !match.localAutoEligible) {
    events.push(audit('AUTO_SUBMIT_REJECTED', at, match.reason, candidate, orderId));
    return {
      action: 'REVIEW',
      orderPublicId: orderId,
      reason: candidate.verdict === 'UNKNOWN' ? 'uncertain_parse' : match.reason,
      submitToBackend: candidate.verdict === 'MATCH_CANDIDATE',
      localAutoEligible: false,
      audit: events,
    };
  }

  if (input.backend === 'NOT_CALLED') {
    return {
      action: 'REVIEW',
      orderPublicId: orderId,
      reason: 'awaiting_backend',
      submitToBackend: true,
      localAutoEligible: true,
      audit: events,
    };
  }

  if (input.backend === 'OFFLINE' || input.backend === 'UNAVAILABLE') {
    events.push(audit('AUTO_SUBMIT_REJECTED', at, input.backend, candidate, orderId));
    return {
      action: 'REVIEW',
      orderPublicId: orderId,
      reason: input.backend,
      submitToBackend: true,
      localAutoEligible: true,
      audit: events,
    };
  }

  if (input.backend !== 'AUTO_SUBMIT') {
    events.push(audit('AUTO_SUBMIT_REJECTED', at, input.backend, candidate, orderId));
    return {
      action: input.backend === 'IGNORE' ? 'IGNORE' : input.backend,
      orderPublicId: orderId,
      reason: 'backend_rejected',
      submitToBackend: true,
      localAutoEligible: true,
      audit: events,
    };
  }

  events.push(audit('AUTO_SUBMIT_EXECUTED', at, 'backend_confirmed', candidate, orderId));
  return {
    action: 'AUTO_SUBMIT',
    orderPublicId: orderId,
    reason: 'auto_submit',
    submitToBackend: true,
    localAutoEligible: true,
    audit: events,
  };
}
