/**
 * Welcome / onboarding marketing copy.
 *
 * PRODUCT CONTENT GATE — items with `requiresProductVerification: true` are
 * design-supplied placeholder claims. They must be officially product-approved
 * and factually verified before production release. Do not silently strengthen
 * or change these claims.
 */

export type ClaimCopy = {
  text: string;
  /**
   * When true, this string is not yet an approved Clearpay product claim.
   * Verify with product/legal before shipping to production.
   */
  requiresProductVerification: boolean;
};

export const WELCOME_TRUST_BADGE: ClaimCopy = {
  text: 'Institutional Grade Infrastructure',
  requiresProductVerification: true,
};

export const WELCOME_HERO = {
  titleLine1: 'Smarter, Faster',
  titleLine2: 'Trader Payments',
  description:
    'Settle faster, stay secure, and track every transaction with Clearpay — built for traders who need clarity at speed.',
} as const;

export const WELCOME_FEATURES = [
  {
    id: 'instant-settlement',
    title: 'Instant Settlement',
    description: 'Sub-second execution across multiple channels',
    requiresProductVerification: true,
  },
  {
    id: 'telegram-2fa',
    title: 'Protected by Telegram 2FA',
    description: 'Direct biometric and bot-verified confirmation',
    requiresProductVerification: true,
  },
  {
    id: 'zero-hidden-fees',
    title: 'Zero Hidden Fees',
    description: '100% transparent spreads and clear ledgers',
    requiresProductVerification: true,
  },
] as const;

export const WELCOME_CTA = {
  primary: 'Get Started Free',
  secondaryPrefix: 'Already have an account?',
  secondaryAction: 'Sign In',
} as const;

export const WELCOME_TRUST_FOOTER: readonly ClaimCopy[] = [
  { text: '256-bit AES', requiresProductVerification: true },
  { text: '99.99% Uptime', requiresProductVerification: true },
  { text: 'Audited', requiresProductVerification: true },
] as const;

export const WELCOME_LEGAL =
  'By continuing, you agree to our Terms of Service and Privacy Policy.';
