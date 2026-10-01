import { PAYIN_STATUS_LABEL } from '@/constants/payin';
import type { PayinOrderStatus } from '@/features/payin/types';

const ACTION_REQUIRED = new Set<PayinOrderStatus>([
  'PENDING_VERIFICATION',
  'VERIFIED',
  'RELEASE_PENDING',
  'DISPUTED',
]);

const LIVE = new Set<PayinOrderStatus>([
  'PENDING_PAYMENT',
  'PAYMENT_DETECTED',
  'PENDING_VERIFICATION',
  'VERIFIED',
  'RELEASE_PENDING',
  'RELEASING',
]);

export function payinStatusLabel(status: PayinOrderStatus): string {
  return PAYIN_STATUS_LABEL[status];
}

export function payinNeedsAction(status: PayinOrderStatus, flagged?: boolean): boolean {
  return flagged === true || ACTION_REQUIRED.has(status);
}

export function payinIsLive(status: PayinOrderStatus): boolean {
  return LIVE.has(status);
}

export function payinIsTerminal(status: PayinOrderStatus): boolean {
  return (
    status === 'COMPLETED' ||
    status === 'FAILED' ||
    status === 'EXPIRED' ||
    status === 'CANCELLED'
  );
}

export function payinStatusTone(
  status: PayinOrderStatus,
): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
  if (status === 'COMPLETED') return 'success';
  if (status === 'FAILED' || status === 'DISPUTED' || status === 'CANCELLED') return 'danger';
  if (status === 'EXPIRED') return 'neutral';
  if (status === 'PENDING_PAYMENT' || status === 'RELEASE_PENDING') return 'warning';
  return 'info';
}

export function payinResultKind(
  status: PayinOrderStatus,
): 'success' | 'failed' | 'expired' | null {
  if (status === 'COMPLETED') return 'success';
  if (status === 'FAILED' || status === 'CANCELLED') return 'failed';
  if (status === 'EXPIRED') return 'expired';
  return null;
}
