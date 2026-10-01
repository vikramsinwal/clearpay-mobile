import type { SmsAuditEvent } from '@/features/payout/sms/resolve-outcome';

const MAX_EVENTS = 50;
const events: SmsAuditEvent[] = [];

/** In-memory audit. Event names and ids only — never a message body. */
export function recordSmsAudit(event: SmsAuditEvent): void {
  const stored: SmsAuditEvent = {
    type: event.type,
    at: event.at,
    ...(event.orderPublicId ? { orderPublicId: event.orderPublicId } : {}),
    ...(event.senderHash ? { senderHash: event.senderHash } : {}),
    ...(event.reason ? { reason: event.reason } : {}),
  };
  events.push(stored);
  if (events.length > MAX_EVENTS) events.shift();
}

export function readSmsAudit(): readonly SmsAuditEvent[] {
  return events;
}
