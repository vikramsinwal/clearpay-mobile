import * as Linking from 'expo-linking';
import type { Href } from 'expo-router';

import type { NotificationAction } from '@/features/home/types';
import { showAlert } from '@/lib/ui/alert';

const NAVIGATE_TARGETS: Record<string, Href> = {
  home: '/',
  '/': '/',
  deposit: '/deposit',
  payin: '/deposit',
  '/deposit': '/deposit',
  payouts: '/payouts',
  '/payouts': '/payouts',
  settle: '/settle',
  'payout-package': '/settle',
  '/settle': '/settle',
  notifications: '/notifications',
  alerts: '/notifications',
  '/notifications': '/notifications',
  profile: '/profile',
  settings: '/profile',
  '/profile': '/profile',
  'deposit-proof': '/deposit-proof',
  '/deposit-proof': '/deposit-proof',
  'change-password': '/change-password',
  '/change-password': '/change-password',
};

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function resolveNavigate(target: string): Href | null {
  const trimmed = target.trim();
  const lower = trimmed.toLowerCase();
  if (
    !trimmed ||
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('blob:') ||
    trimmed.includes('://') ||
    trimmed.startsWith('//') ||
    /\s/.test(trimmed)
  ) {
    return null;
  }
  return NAVIGATE_TARGETS[trimmed] ?? NAVIGATE_TARGETS[trimmed.replace(/^\//, '')] ?? payoutOrderHref(trimmed);
}

function payoutOrderHref(target: string): Href | null {
  const match = /^\/?payout-order\/(pout_[A-Za-z0-9]+)$/.exec(target);
  if (!match?.[1]) return null;
  return `/payout-order?orderId=${encodeURIComponent(match[1])}` as Href;
}

type NotificationRouter = {
  push: (href: Href) => void;
};

/**
 * Generic notification CTA. Destinations come from `action.target`,
 * not from the notification title.
 */
export async function openNotificationAction(
  action: NotificationAction,
  router: NotificationRouter,
  currentPath = '/notifications',
): Promise<void> {
  if (action.type === 'NAVIGATE') {
    const href = resolveNavigate(action.target);
    if (!href) {
      showAlert('Unavailable', 'This destination is not available in the app.');
      return;
    }
    if (href === currentPath) return;
    router.push(href);
    return;
  }

  const target = action.target.trim();
  const payoutDeepLink = /^clearpay:\/\/payout-order\/(pout_[A-Za-z0-9]+)$/.exec(target);
  if (payoutDeepLink?.[1]) {
    router.push(`/payout-order?orderId=${encodeURIComponent(payoutDeepLink[1])}` as Href);
    return;
  }
  const lower = target.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('blob:')
  ) {
    showAlert('Unavailable', 'This link cannot be opened.');
    return;
  }
  const allowed =
    action.type === 'EXTERNAL_URL'
      ? isHttpsUrl(target)
      : target.startsWith('clearpay://') || isHttpsUrl(target);

  if (!allowed) {
    showAlert('Unavailable', 'This link cannot be opened.');
    return;
  }

  try {
    await Linking.openURL(target);
  } catch {
    showAlert('Unable to open link', 'Please try again.');
  }
}
