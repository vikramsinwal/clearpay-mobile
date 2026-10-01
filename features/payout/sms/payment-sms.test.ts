import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import type { PayoutMatchTarget } from '@/features/payout/sms/match-payout';
import { parsePaymentSms } from '@/features/payout/sms/parse-payment-sms';
import { resolveSmsOutcome } from '@/features/payout/sms/resolve-outcome';
import type { PaymentCandidate } from '@/features/payout/types';

const NOW = Date.parse('2026-09-23T04:10:00Z');
const hashSender = (value: string) => createHash('sha256').update(value).digest('hex');

function order(overrides: Partial<PayoutMatchTarget> = {}): PayoutMatchTarget {
  return {
    publicId: 'ord_payout_1',
    status: 'ACTION_REQUIRED',
    amountMinor: 50_000,
    currency: 'INR',
    createdAt: '2026-09-23T03:00:00Z',
    deadlineAt: '2026-09-23T05:00:00Z',
    accountLast4: '1234',
    provider: 'HDFC',
    beneficiaryName: 'Ramesh Kumar',
    hasProof: false,
    knownReferences: [],
    ...overrides,
  };
}

const CORRECT_SMS = {
  sender: 'VM-HDFCBK',
  body: 'INR 500.00 debited from A/c XX1234. UTR 123456789012 paid to Ramesh Kumar.',
  timestamp: '2026-09-23T04:00:00Z',
};

function parsed(message: { sender: string; body: string; timestamp: string } = CORRECT_SMS): PaymentCandidate {
  const result = parsePaymentSms(message, hashSender);
  assert.ok(result.candidate);
  assert.equal(Object.hasOwn(result.candidate, 'body'), false);
  assert.notEqual(result.candidate.senderHash, message.sender);
  return result.candidate;
}

function decide(
  input: Partial<Parameters<typeof resolveSmsOutcome>[0]> & {
    message?: { sender: string; body: string; timestamp: string } | null;
  } = {},
) {
  const { message, ...rest } = input;
  const candidate = message === null ? null : parsed(message ?? CORRECT_SMS);
  return resolveSmsOutcome({
    permission: 'PERMISSION_GRANTED',
    automationEnabled: true,
    consentAccepted: true,
    candidate,
    orders: [order()],
    nowMs: NOW,
    backend: 'NOT_CALLED',
    ...rest,
  });
}

describe('payout payment SMS', () => {
  it('matches a correct payment SMS and auto-submits only after backend confirmation', () => {
    const result = parsePaymentSms(CORRECT_SMS, hashSender);
    assert.equal(result.verdict, 'MATCH_CANDIDATE');
    const outcome = resolveSmsOutcome({
      permission: 'PERMISSION_GRANTED',
      automationEnabled: true,
      consentAccepted: true,
      candidate: result.candidate,
      orders: [order()],
      nowMs: NOW,
      backend: 'AUTO_SUBMIT',
    });
    assert.equal(outcome.action, 'AUTO_SUBMIT');
    assert.equal(outcome.audit.some((event) => event.type === 'AUTO_SUBMIT_EXECUTED'), true);
    assert.equal(JSON.stringify(outcome).includes(CORRECT_SMS.body), false);
  });

  it('does not match a wrong amount', () => {
    const outcome = decide({ orders: [order({ amountMinor: 60_000 })] });
    assert.equal(outcome.action, 'IGNORE');
    assert.equal(outcome.localAutoEligible, false);
  });

  it('does not match a wrong beneficiary', () => {
    const outcome = decide({
      message: {
        ...CORRECT_SMS,
        body: 'INR 500.00 debited from A/c XX1234. UTR 123456789012 paid to Suresh Patel.',
      },
    });
    assert.equal(outcome.action, 'IGNORE');
    assert.equal(outcome.reason, 'beneficiary_mismatch');
  });

  it('does not match a wrong bank account', () => {
    const outcome = decide({
      message: {
        ...CORRECT_SMS,
        body: 'INR 500.00 debited from A/c XX9999. UTR 123456789012 paid to Ramesh Kumar.',
      },
    });
    assert.equal(outcome.action, 'IGNORE');
    assert.equal(outcome.reason, 'account_mismatch');
  });

  it('does not auto-submit a duplicate UTR', () => {
    const outcome = decide({
      orders: [order({ knownReferences: ['123456789012'] })],
      backend: 'AUTO_SUBMIT',
    });
    assert.notEqual(outcome.action, 'AUTO_SUBMIT');
    assert.equal(outcome.localAutoEligible, false);
  });

  it('ignores an old SMS', () => {
    const outcome = decide({
      message: { ...CORRECT_SMS, timestamp: '2026-09-22T04:00:00Z' },
    });
    assert.equal(outcome.action, 'IGNORE');
    assert.equal(outcome.reason, 'outside_time_window');
  });

  it('ignores a payout that is not ready for payment', () => {
    const outcome = decide({ orders: [order({ status: 'ASSIGNED' })] });
    assert.equal(outcome.action, 'IGNORE');
    assert.equal(outcome.reason, 'inactive_order');
  });

  it('ignores an expired payout', () => {
    const outcome = decide({ orders: [order({ status: 'EXPIRED' })] });
    assert.equal(outcome.action, 'IGNORE');
    assert.equal(outcome.reason, 'expired_order');
  });

  it('does not auto-submit when several active payouts share the amount', () => {
    const outcome = decide({
      orders: [order({ accountLast4: null }), order({ publicId: 'ord_payout_2', accountLast4: null })],
      backend: 'AUTO_SUBMIT',
    });
    assert.equal(outcome.action, 'REVIEW');
    assert.equal(outcome.reason, 'ambiguous_orders');
    assert.equal(outcome.localAutoEligible, false);
    assert.equal(outcome.submitToBackend, false);
  });

  it('ignores an SMS from an unrelated sender', () => {
    const result = parsePaymentSms(
      { sender: '+919876543210', body: 'Hey, are you free for dinner tonight?', timestamp: CORRECT_SMS.timestamp },
      hashSender,
    );
    assert.equal(result.verdict, 'NOT_RELEVANT');
    assert.equal(result.candidate, null);
    const outcome = decide({ message: null, candidate: null });
    assert.equal(outcome.action, 'IGNORE');
    assert.equal(outcome.audit.length, 0);
  });

  it('does nothing when automation is off', () => {
    const outcome = decide({ automationEnabled: false, backend: 'AUTO_SUBMIT' });
    assert.equal(outcome.action, 'IGNORE');
    assert.equal(outcome.submitToBackend, false);
    assert.equal(outcome.localAutoEligible, false);
  });

  it('falls back to manual proof when permission is denied', () => {
    const outcome = decide({ permission: 'PERMISSION_DENIED', backend: 'AUTO_SUBMIT' });
    assert.equal(outcome.action, 'MANUAL_FALLBACK');
    assert.equal(outcome.localAutoEligible, false);
  });

  it('does not auto-submit while the device is offline', () => {
    const outcome = decide({ backend: 'OFFLINE' });
    assert.equal(outcome.action, 'REVIEW');
    assert.equal(outcome.audit.some((event) => event.type === 'AUTO_SUBMIT_REJECTED'), true);
    assert.equal(outcome.audit.some((event) => event.type === 'AUTO_SUBMIT_EXECUTED'), false);
  });

  it('does not auto-submit when the backend is unavailable', () => {
    const outcome = decide({ backend: 'UNAVAILABLE' });
    assert.equal(outcome.action, 'REVIEW');
    assert.equal(outcome.reason, 'UNAVAILABLE');
  });

  it('auto-submits only when the backend confirms an exact match', () => {
    const outcome = decide({ backend: 'AUTO_SUBMIT' });
    assert.equal(outcome.action, 'AUTO_SUBMIT');
    assert.equal(outcome.orderPublicId, 'ord_payout_1');
  });

  it('keeps a backend rejection on the review path', () => {
    const outcome = decide({ backend: 'REVIEW' });
    assert.equal(outcome.action, 'REVIEW');
    assert.equal(outcome.audit.some((event) => event.type === 'AUTO_SUBMIT_REJECTED'), true);
    assert.notEqual(outcome.action, 'AUTO_SUBMIT');
  });

  it('does not auto-submit an uncertain parse', () => {
    const outcome = decide({
      message: {
        ...CORRECT_SMS,
        body: 'INR 500.00 debited from A/c XX1234. UTR 123456789012 paid to Ramesh Kumar. Pending.',
      },
      backend: 'AUTO_SUBMIT',
    });
    assert.notEqual(outcome.action, 'AUTO_SUBMIT');
    assert.equal(outcome.localAutoEligible, false);
  });
});
