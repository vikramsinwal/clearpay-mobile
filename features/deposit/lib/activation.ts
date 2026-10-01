import type { DepositStatusPayload } from '@/features/deposit/api/deposit-api';

/**
 * First-deposit activation is derived only from GET /deposit/status.
 * `unlocked` is set by the backend after an approved deposit.
 */
export function isDashboardLocked(
  status: DepositStatusPayload['status'] | undefined,
): boolean {
  if (!status) return true;
  return status.depositRequired === true && status.unlocked !== true;
}

/** Routes a customer can use before the first deposit is approved. */
export function isAllowedWhileDepositLocked(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/profile' ||
    pathname.startsWith('/change-password') ||
    pathname === '/deposit' ||
    pathname.startsWith('/deposit/') ||
    pathname.startsWith('/deposit-proof')
  );
}
